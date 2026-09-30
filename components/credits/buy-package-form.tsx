"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { buyCreditsAction } from "@/lib/payments/actions";

/** Botón de compra de un paquete: lleva a la página de pago de la pasarela. */
export function BuyPackageForm({
  packageId,
  featured = false,
  disabled = false,
}: {
  packageId: string;
  featured?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("Credits");
  const [state, action, pending] = useActionState(buyCreditsAction, undefined);
  const redirectUrl =
    state && "redirectUrl" in state ? state.redirectUrl : null;

  useEffect(() => {
    if (redirectUrl) window.location.assign(redirectUrl);
  }, [redirectUrl]);

  return (
    <form action={action} className="flex w-full flex-col gap-2">
      <input type="hidden" name="packageId" value={packageId} />
      <Button
        type="submit"
        size="lg"
        variant={featured ? "default" : "outline"}
        disabled={disabled || pending || redirectUrl !== null}
        className="w-full"
      >
        {pending || redirectUrl ? t("buying") : t("buy")}
      </Button>
      {state && "error" in state && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}
