import { cn } from "cn";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CoinsIcon,
  ImagePlusIcon,
  LayoutGridIcon,
  LightbulbIcon,
  Share2Icon,
  WandSparklesIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { AdCard } from "@/components/ads/ad-card";
import {
  mockupFormats,
  templateVisuals,
} from "@/components/ads/template-visuals";
import { EmptyState } from "@/components/app/empty-state";
import {
  appCardClassName,
  appPrimaryClassName,
  appSecondaryClassName,
} from "@/components/app/ui";
import { AdMockup } from "@/components/marketing/ad-mockup";
import { SeasonCard } from "@/components/seasons/season-card";
import { getDb } from "@/db";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { signThumbnails } from "@/lib/ads/files";
import { listOrganizationJobs, quoteTemplates } from "@/lib/ads/service";
import { creditsYield } from "@/lib/ads/yield";
import { requireOrganization } from "@/lib/auth/session";
import { getBalance } from "@/lib/billing/wallet";
import { creditsToUsd, formatUsd } from "@/lib/format";
import { getGenerationProvider } from "@/lib/providers";
import { upcomingSeasons } from "@/lib/seasons";
import { hasFeature } from "@/lib/segment";
import { buckets } from "@/lib/storage";
import { getStorage } from "@/lib/storage/supabase";
import { adTemplates, templateIds } from "@/lib/templates";

const RECENT_ADS = 4;
const UPCOMING_SEASONS = 3;

const steps = [
  { key: "product", icon: ImagePlusIcon },
  { key: "template", icon: WandSparklesIcon },
  { key: "share", icon: Share2Icon },
] as const;

/**
 * Inicio del modo guiado: crear, saldo, próximas fechas comerciales,
 * plantillas y anuncios recientes.
 */
export default async function PymeHomePage() {
  const { organization } = await requireOrganization();
  const db = getDb();
  const [t, tTemplates, tCredits, locale, balance, recent, prices] =
    await Promise.all([
      getTranslations("PymeHome"),
      getTranslations("Templates"),
      getTranslations("Credits"),
      getLocale() as Promise<Locale>,
      getBalance(db, organization.id),
      listOrganizationJobs(db, organization.id, { limit: RECENT_ADS }),
      quoteTemplates(db, getGenerationProvider(), organization.segment),
    ]);
  const thumbnails = await signThumbnails(
    getStorage(buckets.adOutputs),
    recent.jobs,
  );
  const hasCredits = balance.available > 0;
  const yieldCounts = creditsYield(prices, balance.available);
  const seasons = hasFeature(organization.segment, "seasonalCalendar")
    ? upcomingSeasons(organization.country, new Date(), {
        limit: UPCOMING_SEASONS,
      })
    : [];

  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-4 lg:grid-cols-3">
        <div
          className={cn(
            appCardClassName,
            "relative isolate overflow-hidden p-6 sm:p-8 lg:col-span-2",
          )}
        >
          <div aria-hidden className="absolute inset-0 -z-10 bg-dots" />
          <div
            aria-hidden
            className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-fuchsia-400/25 blur-3xl"
          />
          <div className="flex items-center justify-between gap-6">
            <div className="flex max-w-md flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
                <WandSparklesIcon aria-hidden className="size-3.5" />
                {t("eyebrow")}
              </span>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                {t("title", { name: organization.name })}
              </h1>
              <p className="text-base text-pretty text-muted-foreground">
                {t("description")}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/create" className={appPrimaryClassName}>
                  {t("create")}
                  <ArrowRightIcon
                    aria-hidden
                    className="transition-transform group-hover/cta:translate-x-0.5"
                  />
                </Link>
                <Link href="/ads" className={appSecondaryClassName}>
                  <LayoutGridIcon aria-hidden />
                  {t("viewAds")}
                </Link>
              </div>
            </div>
            <div aria-hidden className="hidden shrink-0 items-end sm:flex">
              <AdMockup
                format="story"
                tone="sunset"
                icon={templateVisuals.whatsappStatus.icon}
                label={tTemplates("items.whatsappStatus.name")}
                title={t("sample.title")}
                copy={t("sample.copy")}
                cta={t("sample.cta")}
                video
                className="w-32 -rotate-6 animate-float md:w-36"
              />
              <AdMockup
                format="square"
                tone="citrus"
                icon={templateVisuals.dailyOffer.icon}
                label={tTemplates("items.dailyOffer.name")}
                title={t("sample.offer")}
                copy={t("sample.copy")}
                cta={t("sample.cta")}
                className="-ml-6 w-32 rotate-3 animate-float [animation-delay:-3s] md:w-40"
              />
            </div>
          </div>
        </div>

        <div
          className={cn(
            appCardClassName,
            "flex flex-col gap-4 p-6",
            !hasCredits &&
              "border-amber-300/70 bg-amber-50/60 dark:border-amber-400/30 dark:bg-amber-400/5",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("balance.title")}
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
              <CoinsIcon aria-hidden className="size-5" />
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p
              className="font-heading text-4xl font-bold tracking-tight tabular-nums"
              data-testid="credit-balance"
            >
              {t("balance.credits", { count: balance.available })}
            </p>
            {hasCredits && (
              <p className="text-sm text-muted-foreground">
                {t("balance.usd", {
                  usd: formatUsd(creditsToUsd(balance.available), locale),
                })}
              </p>
            )}
          </div>
          <p className="text-sm text-pretty">
            {hasCredits
              ? tCredits.rich("yield", {
                  whatsapp: tCredits("yieldItems.whatsapp", {
                    count: yieldCounts.whatsapp,
                  }),
                  promo: tCredits("yieldItems.promo", {
                    count: yieldCounts.promo,
                  }),
                  images: tCredits("yieldItems.images", {
                    count: yieldCounts.images,
                  }),
                  strong: (chunks) => (
                    <strong className="font-semibold">{chunks}</strong>
                  ),
                })
              : t("balance.empty")}
          </p>
          <Link
            href="/credits"
            className={cn(
              hasCredits ? appSecondaryClassName : appPrimaryClassName,
              "mt-auto w-full",
            )}
          >
            <CoinsIcon aria-hidden />
            {t("balance.recharge")}
          </Link>
        </div>
      </section>

      {hasFeature(organization.segment, "creativeDirector") && (
        <section
          className={cn(
            appCardClassName,
            "flex flex-col gap-4 border-violet-200 bg-violet-50/60 p-5 sm:flex-row sm:items-center sm:p-6 dark:border-violet-500/30 dark:bg-violet-500/5",
          )}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-white">
            <LightbulbIcon aria-hidden className="size-6" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-violet-700 uppercase dark:text-violet-300">
              {t("director.eyebrow")}
            </span>
            <h2 className="font-heading text-lg font-semibold text-balance">
              {t("director.title")}
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              {t("director.description")}
            </p>
          </div>
          <Link href="/director" className={appSecondaryClassName}>
            {t("director.cta")}
            <ArrowRightIcon aria-hidden />
          </Link>
        </section>
      )}

      {seasons.length > 0 && (
        <section className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                {t("seasons.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("seasons.description")}
              </p>
            </div>
            <Link
              href="/calendar"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
            >
              <CalendarDaysIcon aria-hidden className="size-4" />
              {t("seasons.viewAll")}
            </Link>
          </div>
          {/* En el celular, carrusel horizontal para no empujar el resto. */}
          <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {seasons.map((upcoming) => (
              <li
                key={upcoming.season.id}
                className="w-[85%] shrink-0 snap-start scroll-ml-4 sm:w-auto"
              >
                <SeasonCard upcoming={upcoming} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
            {t("templates.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("templates.description")}
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {templateIds.map((id) => {
            const template = adTemplates[id];
            const visual = templateVisuals[id];
            const price = prices[id][template.defaultAspectRatio];
            return (
              <li key={id}>
                <Link
                  href={{ pathname: "/create", query: { template: id } }}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-[translate,box-shadow] outline-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/10 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div
                    aria-hidden
                    className="relative grid h-44 place-items-center overflow-hidden bg-muted/60"
                  >
                    <div className="absolute inset-0 bg-dots" />
                    <AdMockup
                      format={mockupFormats[template.defaultAspectRatio]}
                      tone={visual.tone}
                      icon={visual.icon}
                      label={tTemplates(`items.${id}.name`)}
                      title={t("sample.title")}
                      copy={t("sample.copy")}
                      cta={t("sample.cta")}
                      video={template.mediaType === "video"}
                      className={cn(
                        "relative transition-transform duration-500 group-hover:scale-105",
                        template.defaultAspectRatio === "9:16"
                          ? "mt-16 w-28"
                          : "w-32",
                      )}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {tTemplates(`mediaTypes.${template.mediaType}`)}
                        {template.durationSeconds &&
                          ` · ${t("templates.duration", { seconds: template.durationSeconds })}`}
                      </span>
                      {price !== undefined && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                          {t("templates.price", { count: price })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-lg font-semibold">
                      {tTemplates(`items.${id}.name`)}
                    </h3>
                    <p className="text-sm text-pretty text-muted-foreground">
                      {tTemplates(`items.${id}.description`)}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
                      {t("templates.use")}
                      <ArrowRightIcon
                        aria-hidden
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
            {t("recent.title")}
          </h2>
          {recent.jobs.length > 0 && (
            <Link
              href="/ads"
              className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
            >
              {t("recent.viewAll")}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Link>
          )}
        </div>
        {recent.jobs.length === 0 ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <EmptyState
              icon={LayoutGridIcon}
              title={t("recent.emptyTitle")}
              description={t("recent.empty")}
            />
            <div
              className={cn(appCardClassName, "flex flex-col gap-5 p-6 sm:p-8")}
            >
              <h3 className="font-heading text-lg font-semibold">
                {t("steps.title")}
              </h3>
              <ol className="grid gap-5">
                {steps.map(({ key, icon: Icon }, index) => (
                  <li key={key} className="flex gap-4">
                    <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                      <Icon aria-hidden className="size-5" />
                      <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-gradient-brand text-[11px] font-bold text-white">
                        {index + 1}
                      </span>
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-semibold">{t(`steps.${key}.title`)}</p>
                      <p className="text-sm text-muted-foreground">
                        {t(`steps.${key}.description`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recent.jobs.map((job) => (
              <li key={job.id}>
                <AdCard job={job} thumbnailUrl={thumbnails.get(job.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
