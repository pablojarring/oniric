import { getLocale, getTranslations } from "next-intl/server";

import { AppHeader } from "@/components/app-header";
import { appCardClassName } from "@/components/app/ui";
import { LogoMark } from "@/components/marketing/logo";
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
    <div className="relative isolate flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,color-mix(in_oklch,var(--color-violet-500)_14%,transparent),transparent)]"
      />
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark className="size-12 rounded-2xl" />
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
            {t("eyebrow")}
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-md text-pretty text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className={`${appCardClassName} p-5 sm:p-8`}>
          <OnboardingForm countries={countryOptions} />
        </div>
      </main>
    </div>
  );
}
