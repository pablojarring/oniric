import { cn } from "cn";
import {
  ArrowRightIcon,
  ClapperboardIcon,
  LightbulbIcon,
  MessageCircleIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/app/page-header";
import { appCardClassName } from "@/components/app/ui";
import { StartCreativeForm } from "@/components/creative/start-form";
import { getDb } from "@/db";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { requireOrganization } from "@/lib/auth/session";
import { listCreativeSessions } from "@/lib/creative/service";
import { formatDateTime } from "@/lib/format";
import { isSeasonId, isSeasonInCalendar } from "@/lib/seasons";
import { hasFeature } from "@/lib/segment";

const RECENT_SESSIONS = 5;

const steps = [
  { key: "conversation", icon: MessageCircleIcon },
  { key: "tier", icon: SlidersHorizontalIcon },
  { key: "ideas", icon: LightbulbIcon },
  { key: "script", icon: ClapperboardIcon },
] as const;

/** Inicio del director creativo: empezar una sesión o retomar una reciente. */
export default async function DirectorPage({
  searchParams,
}: PageProps<"/[locale]/director">) {
  const { season } = await searchParams;
  const { user, organization } = await requireOrganization();
  if (!hasFeature(organization.segment, "creativeDirector")) notFound();

  // Desde el calendario (`?season=`): la conversación usa la fecha comercial.
  const seasonId =
    hasFeature(organization.segment, "seasonalCalendar") &&
    isSeasonId(season) &&
    isSeasonInCalendar(organization.country, season)
      ? season
      : undefined;

  const [t, locale, recent] = await Promise.all([
    getTranslations("Director"),
    getLocale() as Promise<Locale>,
    listCreativeSessions(
      getDb(),
      { user, organization },
      { limit: RECENT_SESSIONS },
    ),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("start.eyebrow")}
        title={t("start.title")}
        description={t("start.description")}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <StartCreativeForm seasonId={seasonId} />
        <aside className={cn(appCardClassName, "flex flex-col gap-5 p-6")}>
          <h2 className="font-heading text-lg font-semibold">
            {t("start.howTitle")}
          </h2>
          <ol className="grid gap-4">
            {steps.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                  <Icon aria-hidden className="size-4.5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{t(`steps.${key}`)}</p>
                  <p className="text-sm text-pretty text-muted-foreground">
                    {t(`start.how.${key}`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {recent.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold tracking-tight">
            {t("recent.title")}
          </h2>
          <ul className="grid gap-3" data-testid="director-recent">
            {recent.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/director/${session.id}`}
                  className={cn(
                    appCardClassName,
                    "group flex items-center gap-4 p-4 transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate font-semibold">
                      {session.title ?? t("recent.untitled")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`recent.status.${session.status}`)} ·{" "}
                      {formatDateTime(session.updatedAt, locale)}
                    </p>
                  </div>
                  <ArrowRightIcon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
