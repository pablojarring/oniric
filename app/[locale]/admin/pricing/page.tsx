import { getTranslations } from "next-intl/server";

import { PricingRowForm } from "@/components/admin/pricing-row-form";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { resetPricing } from "@/lib/admin/actions";
import { listEffectivePricing } from "@/lib/admin/pricing";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { listProviders } from "@/lib/providers";

export default async function AdminPricingPage() {
  await requirePlatformAdmin();
  const [rows, t, tAdmin] = await Promise.all([
    listEffectivePricing(getDb(), listProviders()),
    getTranslations("Admin.pricing"),
    getTranslations("Admin"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <ul className="flex flex-col divide-y rounded-lg border">
        {rows.map((row) => {
          const segment = tAdmin(`segments.${row.segment}`);
          const label = `${row.modelName}, ${segment}`;
          return (
            <li
              key={`${row.provider}-${row.modelId}-${row.segment}`}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium">{row.modelName}</span>
                <span className="text-muted-foreground">
                  {row.provider} · {row.modelId} · {segment}
                </span>
                <span className="text-muted-foreground">
                  {row.isDefault ? t("default") : t("custom")} ·{" "}
                  {row.example.durationSeconds !== undefined
                    ? t("exampleVideo", {
                        seconds: row.example.durationSeconds,
                        count: row.example.priceCredits,
                      })
                    : t("exampleImage", { count: row.example.priceCredits })}
                </span>
              </div>
              <div className="flex flex-col items-start gap-2">
                <PricingRowForm
                  // Se vuelve a montar con los valores guardados.
                  key={`${row.marginBps}-${row.minPriceCredits}`}
                  row={row}
                  label={label}
                />
                {!row.isDefault && (
                  <form action={resetPricing}>
                    <input type="hidden" name="provider" value={row.provider} />
                    <input type="hidden" name="modelId" value={row.modelId} />
                    <input type="hidden" name="segment" value={row.segment} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      aria-label={`${t("reset")}: ${label}`}
                    >
                      {t("reset")}
                    </Button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
