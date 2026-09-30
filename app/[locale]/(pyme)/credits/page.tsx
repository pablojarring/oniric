import { cn } from "cn";
import {
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  GiftIcon,
  LockIcon,
  ReceiptTextIcon,
  SparklesIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { BuyPackageForm } from "@/components/credits/buy-package-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import type { Locale } from "@/i18n/config";
import { quoteTemplates } from "@/lib/ads/service";
import { requireOrganization } from "@/lib/auth/session";
import { CREDIT_EXPIRATION_MONTHS } from "@/lib/billing/config";
import { creditPackages, splitIva } from "@/lib/billing/packages";
import { getBalance } from "@/lib/billing/wallet";
import { formatUsd } from "@/lib/format";
import { getCheckoutGateway } from "@/lib/payments/gateway";
import { getOrganizationPurchase } from "@/lib/payments/purchases";
import { purchaseResult, type PurchaseResult } from "@/lib/payments/result";
import { getGenerationProvider } from "@/lib/providers";
import { hasFeature } from "@/lib/segment";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Credits");
  return { title: t("metaTitle") };
}

const resultIcons: Record<PurchaseResult, typeof CircleCheckIcon> = {
  paid: CircleCheckIcon,
  failed: CircleXIcon,
  canceled: CircleXIcon,
  pending: ClockIcon,
};

/** Recarga de créditos: paquetes con IVA incluido y pago con Payphone. */
export default async function CreditsPage({
  searchParams,
}: PageProps<"/[locale]/credits">) {
  const { purchase: purchaseId, canceled, payment } = await searchParams;
  const { organization } = await requireOrganization();
  if (!hasFeature(organization.segment, "buyCredits")) notFound();

  const db = getDb();
  const [t, locale, balance, prices, purchase] = await Promise.all([
    getTranslations("Credits"),
    getLocale() as Promise<Locale>,
    getBalance(db, organization.id),
    quoteTemplates(db, getGenerationProvider(), organization.segment),
    typeof purchaseId === "string"
      ? getOrganizationPurchase(db, organization.id, purchaseId)
      : undefined,
  ]);
  const available = getCheckoutGateway() !== null;
  const usd = (cents: number) => formatUsd(cents / 100, locale);

  const result = purchase
    ? purchaseResult(purchase, { canceled: canceled === "1", now: new Date() })
    : payment === "error"
      ? "failed"
      : undefined;
  const ResultIcon = result ? resultIcons[result] : undefined;

  // Cuánto rinde cada paquete con los precios actuales de las plantillas.
  const unitPrices = {
    whatsapp: prices.whatsappStatus["9:16"] ?? 0,
    promo: prices.promoInstagram["9:16"] ?? 0,
    images: prices.dailyOffer["1:1"] ?? 0,
  };
  const yieldFor = (credits: number) =>
    t("yield", {
      whatsapp: t("yieldItems.whatsapp", {
        count: Math.floor(credits / Math.max(unitPrices.whatsapp, 1)),
      }),
      promo: t("yieldItems.promo", {
        count: Math.floor(credits / Math.max(unitPrices.promo, 1)),
      }),
      images: t("yieldItems.images", {
        count: Math.floor(credits / Math.max(unitPrices.images, 1)),
      }),
    });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <p
          className="rounded-full border bg-card px-4 py-2 text-sm font-medium"
          data-testid="credits-balance"
        >
          {t("balance", { count: balance.available })}
        </p>
      </div>

      {result && ResultIcon && (
        <Alert
          variant={
            result === "failed" || result === "canceled"
              ? "destructive"
              : "default"
          }
        >
          <ResultIcon aria-hidden />
          <AlertTitle>{t(`result.${result}.title`)}</AlertTitle>
          <AlertDescription>
            {t(`result.${result}.description`, {
              count: purchase?.credits ?? 0,
              code: purchase?.id.slice(0, 8) ?? "",
            })}
          </AlertDescription>
        </Alert>
      )}

      {!available && (
        <Alert>
          <AlertTitle>{t("unavailable.title")}</AlertTitle>
          <AlertDescription>{t("unavailable.description")}</AlertDescription>
        </Alert>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {creditPackages.map((pkg) => {
          const { baseCents, taxCents } = splitIva(pkg.totalCents);
          return (
            <li key={pkg.id} className="flex">
              <Card
                className={cn("w-full", pkg.featured && "ring-2 ring-primary")}
                data-testid={`package-${pkg.id}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardDescription>{t(`packages.${pkg.id}`)}</CardDescription>
                    {pkg.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        <SparklesIcon aria-hidden className="size-3" />
                        {t("featured")}
                      </span>
                    )}
                  </div>
                  <CardTitle className="font-heading text-3xl whitespace-nowrap lg:text-2xl xl:text-3xl">
                    {t("credits", { count: pkg.credits })}
                  </CardTitle>
                  {pkg.bonusCredits > 0 && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <GiftIcon aria-hidden className="size-3" />
                      {t("bonus", { count: pkg.bonusCredits })}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div>
                    <p className="text-2xl font-semibold">
                      {usd(pkg.totalCents)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("ivaIncluded")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("breakdown", {
                        base: usd(baseCents),
                        tax: usd(taxCents),
                      })}
                    </p>
                  </div>
                  <p className="text-sm">{yieldFor(pkg.credits)}</p>
                </CardContent>
                <CardFooter>
                  <BuyPackageForm
                    packageId={pkg.id}
                    featured={pkg.featured}
                    disabled={!available}
                  />
                </CardFooter>
              </Card>
            </li>
          );
        })}
      </ul>

      <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <li className="flex items-start gap-2">
          <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("notes.secure")}
        </li>
        <li className="flex items-start gap-2">
          <ReceiptTextIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("notes.invoice")}
        </li>
        <li className="flex items-start gap-2">
          <ClockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("notes.expiry", {
            months: CREDIT_EXPIRATION_MONTHS[organization.segment] ?? 0,
          })}
        </li>
      </ul>
    </div>
  );
}
