import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdWizard } from "@/components/ads/ad-wizard";
import { getDb } from "@/db";
import { quoteTemplates } from "@/lib/ads/service";
import { requireOrganization } from "@/lib/auth/session";
import { getBalance } from "@/lib/billing/wallet";
import { getGenerationProvider } from "@/lib/providers";
import { hasFeature } from "@/lib/segment";

export default async function CreateAdPage() {
  const { organization } = await requireOrganization();
  if (!hasFeature(organization.segment, "guidedWizard")) notFound();

  const db = getDb();
  const [prices, balance, t] = await Promise.all([
    quoteTemplates(db, getGenerationProvider(), organization.segment),
    getBalance(db, organization.id),
    getTranslations("AdWizard"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <AdWizard
        businessName={organization.name}
        prices={prices}
        availableCredits={balance.available}
      />
    </div>
  );
}
