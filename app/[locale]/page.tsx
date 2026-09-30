import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Industries } from "@/components/landing/industries";
import { Pricing } from "@/components/landing/pricing";
import { Problem } from "@/components/landing/problem";
import { Templates } from "@/components/landing/templates";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Landing.meta",
  });

  return { title: t("title") };
}

/** Portada pública: presenta el producto y lleva a crear la cuenta. */
export default function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  // El layout ya validó el idioma.
  setRequestLocale(locale as Locale);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Industries />
        <Problem />
        <HowItWorks />
        <Templates />
        <Features />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
