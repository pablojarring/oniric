import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";

import { AdOutput } from "@/components/ads/ad-output";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { signOutputs } from "@/lib/ads/files";
import { getSharedAd } from "@/lib/ads/sharing";
import { buckets } from "@/lib/storage";
import { getStorage } from "@/lib/storage/supabase";

// Página pública de un anuncio compartido. No pide sesión: el token del enlace
// es la autorización. Muestra solo el resultado y el texto del anuncio.

const loadSharedAd = cache((token: string) => getSharedAd(getDb(), token));

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const shared = await loadSharedAd(token);
  const t = await getTranslations("SharedAd");
  return {
    title: shared ? t("title", { business: shared.businessName }) : undefined,
    // Los enlaces se comparten a mano; no deben aparecer en buscadores.
    robots: { index: false, follow: false },
  };
}

export default async function SharedAdPage({
  params,
}: PageProps<"/[locale]/s/[token]">) {
  const { token } = await params;
  const shared = await loadSharedAd(token);
  if (!shared) notFound();

  const { job, businessName } = shared;
  const [t, outputs] = await Promise.all([
    getTranslations("SharedAd"),
    signOutputs(getStorage(buckets.adOutputs), job),
  ]);
  const title = t("title", { business: businessName });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {outputs.map((output) => (
          <AdOutput
            key={output.path}
            output={output}
            url={output.url}
            alt={title}
          />
        ))}
        {job.brief && (
          <p className="text-lg whitespace-pre-line">{job.brief.adCopy}</p>
        )}
        <footer className="flex flex-wrap items-center gap-4 border-t pt-6 text-sm text-muted-foreground">
          <span>{t("madeWith")}</span>
          <Link href="/signup" className={buttonVariants({ size: "sm" })}>
            {t("cta")}
          </Link>
        </footer>
      </main>
    </>
  );
}
