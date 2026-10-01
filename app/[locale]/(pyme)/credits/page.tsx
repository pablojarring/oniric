import { cn } from "cn";
import {
  ChevronDownIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CoinsIcon,
  CreditCardIcon,
  GiftIcon,
  InfoIcon,
  LockIcon,
  PackageIcon,
  ReceiptTextIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/app/page-header";
import { appCardClassName } from "@/components/app/ui";
import { BuyPackageForm } from "@/components/credits/buy-package-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDb } from "@/db";
import type { Locale } from "@/i18n/config";
import { quoteTemplates } from "@/lib/ads/service";
import { creditsYield } from "@/lib/ads/yield";
import { requireOrganization } from "@/lib/auth/session";
import { CREDIT_EXPIRATION_MONTHS } from "@/lib/billing/config";
import {
  creditPackages,
  savingsPercent,
  splitIva,
} from "@/lib/billing/packages";
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
  declined: CircleXIcon,
  canceled: InfoIcon,
  pending: ClockIcon,
};

const howItWorks = [
  { key: "choose", icon: PackageIcon },
  { key: "pay", icon: CreditCardIcon },
  { key: "instant", icon: ZapIcon },
] as const;

const faqs = ["credit", "failed", "expiry", "invoice", "security"] as const;

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
  const expirationMonths = CREDIT_EXPIRATION_MONTHS[organization.segment] ?? 0;

  const result = purchase
    ? purchaseResult(purchase, { canceled: canceled === "1", now: new Date() })
    : payment === "error"
      ? "failed"
      : undefined;
  const ResultIcon = result ? resultIcons[result] : undefined;

  // Cuánto rinde cada paquete con los precios actuales de las plantillas.
  const yieldFor = (credits: number) => {
    const counts = creditsYield(prices, credits);
    return t.rich("yield", {
      whatsapp: t("yieldItems.whatsapp", { count: counts.whatsapp }),
      promo: t("yieldItems.promo", { count: counts.promo }),
      images: t("yieldItems.images", { count: counts.images }),
      strong: (chunks) => (
        <strong className="font-semibold text-foreground">{chunks}</strong>
      ),
    });
  };

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <p
            className="inline-flex h-11 items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-4 text-sm font-semibold text-amber-900 tabular-nums dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
            data-testid="credits-balance"
          >
            <CoinsIcon aria-hidden className="size-4 text-amber-500" />
            {t("balance", { count: balance.available })}
          </p>
        }
      />

      {result && ResultIcon && (
        <Alert
          variant={
            result === "failed" || result === "declined"
              ? "destructive"
              : "default"
          }
          className={cn(
            "rounded-2xl p-4",
            result === "paid" &&
              "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10",
          )}
        >
          <ResultIcon
            aria-hidden
            className={cn(result === "paid" && "text-emerald-600")}
          />
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
        <Alert className="rounded-2xl p-4">
          <InfoIcon aria-hidden />
          <AlertTitle>{t("unavailable.title")}</AlertTitle>
          <AlertDescription>{t("unavailable.description")}</AlertDescription>
        </Alert>
      )}

      <ol className="grid gap-3 sm:grid-cols-3">
        {howItWorks.map(({ key, icon: Icon }, index) => (
          <li
            key={key}
            className="flex items-center gap-3 rounded-2xl border bg-card/70 px-4 py-3"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                {t("howItWorks.step", { number: index + 1 })}
              </span>
              <span className="text-sm font-semibold">
                {t(`howItWorks.${key}`)}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <ul className="grid gap-5 pt-2 sm:grid-cols-2 xl:grid-cols-4">
        {creditPackages.map((pkg) => {
          const { baseCents, taxCents } = splitIva(pkg.totalCents);
          const savings = savingsPercent(pkg);
          return (
            <li key={pkg.id} className="flex flex-col">
              <div
                className={cn(
                  "relative flex h-full flex-col gap-5 rounded-3xl p-6",
                  pkg.featured
                    ? "animate-shine bg-card shadow-xl shadow-violet-500/15 border-shine"
                    : cn(appCardClassName, "transition-shadow hover:shadow-md"),
                )}
                data-testid={`package-${pkg.id}`}
              >
                {pkg.featured && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-md shadow-fuchsia-500/30">
                    <SparklesIcon aria-hidden className="size-3" />
                    {t("featured")}
                  </span>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {t(`packages.${pkg.id}`)}
                    </span>
                    {savings > 0 && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                        {t("savings", { percent: savings })}
                      </span>
                    )}
                  </div>
                  <p className="font-heading text-3xl font-bold tracking-tight whitespace-nowrap">
                    {t("credits", { count: pkg.credits })}
                  </p>
                  {pkg.bonusCredits > 0 ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <GiftIcon aria-hidden className="size-3" />
                      {t("bonus", { count: pkg.bonusCredits })}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("starterHint")}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 border-y py-4">
                  <p className="font-heading text-4xl font-extrabold tracking-tight">
                    {usd(pkg.totalCents)}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("ivaIncluded")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("breakdown", {
                      base: usd(baseCents),
                      tax: usd(taxCents),
                    })}
                  </p>
                </div>

                <p className="text-sm text-pretty text-muted-foreground">
                  {yieldFor(pkg.credits)}
                </p>

                <div className="mt-auto">
                  <BuyPackageForm
                    packageId={pkg.id}
                    featured={pkg.featured}
                    disabled={!available}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ul
        className={cn(
          appCardClassName,
          "grid gap-5 p-5 text-sm sm:grid-cols-3 sm:p-6",
        )}
      >
        <li className="flex items-start gap-3">
          <LockIcon
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-emerald-600"
          />
          {t("notes.secure")}
        </li>
        <li className="flex items-start gap-3">
          <ReceiptTextIcon
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-violet-600"
          />
          {t("notes.invoice")}
        </li>
        <li className="flex items-start gap-3">
          <ClockIcon
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-amber-600"
          />
          {t("notes.expiry", { months: expirationMonths })}
        </li>
      </ul>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          {t("faq.title")}
        </h2>
        <div className={cn(appCardClassName, "divide-y px-5 sm:px-6")}>
          {faqs.map((key) => (
            <details key={key} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
                {t(`faq.items.${key}.question`)}
                <ChevronDownIcon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="pt-2 text-sm text-pretty text-muted-foreground">
                {t(`faq.items.${key}.answer`, { months: expirationMonths })}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
