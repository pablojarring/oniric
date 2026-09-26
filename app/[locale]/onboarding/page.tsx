import { getLocale, getTranslations } from "next-intl/server";

import { AppHeader } from "@/components/app-header";
import {
  OnboardingForm,
  type CountryOption,
} from "@/components/onboarding/onboarding-form";
import { getDb } from "@/db";
import { localeInfo } from "@/i18n/config";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { countries } from "@/lib/onboarding/options";
import { getCurrentMembership } from "@/lib/organizations/service";
import { segmentConfig } from "@/lib/segment";

export default async function OnboardingPage() {
  const user = await requireUser();
  const locale = await getLocale();

  const membership = await getCurrentMembership(getDb(), user.id);
  if (membership) {
    redirect({
      href: segmentConfig[membership.organization.segment].homePath,
      locale,
    });
  }

  // Los nombres de países salen de Intl en el servidor, en el idioma del usuario.
  const { formatLocale } = localeInfo[locale];
  const regionNames = new Intl.DisplayNames([formatLocale], { type: "region" });
  const countryOptions: CountryOption[] = countries
    .map((code) => ({ value: code, label: regionNames.of(code) ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, formatLocale));

  const t = await getTranslations("Onboarding");

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <OnboardingForm countries={countryOptions} />
      </main>
    </>
  );
}
