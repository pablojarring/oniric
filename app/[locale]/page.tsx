import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { SiteHeader } from "@/components/site-header";
import type { Locale } from "@/i18n/config";

export default function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  // El layout ya validó el idioma.
  setRequestLocale(locale as Locale);

  const t = useTranslations("HomePage");

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{t("tagline")}</p>
        <p className="text-sm text-muted-foreground">{t("status")}</p>
      </main>
    </>
  );
}
