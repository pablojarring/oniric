"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePricing } from "@/lib/admin/actions";
import type { PricingRow } from "@/lib/admin/pricing";

/** Edición del margen y el mínimo de un modelo y segmento. */
export function PricingRowForm({
  row,
  label,
}: {
  row: PricingRow;
  /** Nombre accesible de la fila, p. ej. "Video estándar (mock), Pyme". */
  label: string;
}) {
  const t = useTranslations("Admin.pricing");
  const [state, formAction, pending] = useActionState(savePricing, undefined);
  const id = `${row.provider}-${row.modelId}-${row.segment}`;

  return (
    <form
      action={formAction}
      aria-label={label}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="provider" value={row.provider} />
      <input type="hidden" name="modelId" value={row.modelId} />
      <input type="hidden" name="segment" value={row.segment} />
      <label className="flex flex-col gap-1 text-xs" htmlFor={`${id}-margin`}>
        {t("columns.margin")}
        <Input
          id={`${id}-margin`}
          name="margin"
          inputMode="decimal"
          defaultValue={String(row.marginBps / 100)}
          aria-invalid={state?.ok === false && state.error === "marginBps"}
          className="w-24"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs" htmlFor={`${id}-min`}>
        {t("columns.minPrice")}
        <Input
          id={`${id}-min`}
          name="minPriceCredits"
          type="number"
          min={1}
          step={1}
          defaultValue={row.minPriceCredits}
          aria-invalid={
            state?.ok === false && state.error === "minPriceCredits"
          }
          className="w-28"
        />
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {t("save")}
      </Button>
      <p role="status" className="basis-full text-xs">
        {state?.ok === true && (
          <span className="text-muted-foreground">{t("saved")}</span>
        )}
        {state?.ok === false && (
          <span className="text-destructive">{t(`errors.${state.error}`)}</span>
        )}
      </p>
    </form>
  );
}
