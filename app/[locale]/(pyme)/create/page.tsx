import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdWizard } from "@/components/ads/ad-wizard";
import { PageHeader } from "@/components/app/page-header";
import { getDb } from "@/db";
import { quoteTemplates } from "@/lib/ads/service";
import { requireOrganization } from "@/lib/auth/session";
import { getBalance } from "@/lib/billing/wallet";
import { getGenerationProvider } from "@/lib/providers";
import { hasFeature } from "@/lib/segment";
import { isTemplateId } from "@/lib/templates";

export default async function CreateAdPage({
  searchParams,
}: PageProps<"/[locale]/create">) {
  const { template } = await searchParams;
  const { organization } = await requireOrganization();
  if (!hasFeature(organization.segment, "guidedWizard")) notFound();

  const db = getDb();
  const [prices, balance, t] = await Promise.all([
    quoteTemplates(db, getGenerationProvider(), organization.segment),
    getBalance(db, organization.id),
    getTranslations("AdWizard"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("description")} />
      <AdWizard
        businessName={organization.name}
        prices={prices}
        availableCredits={balance.available}
        initialTemplateId={isTemplateId(template) ? template : undefined}
      />
    </div>
  );
}
