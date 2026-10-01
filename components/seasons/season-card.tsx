import { cn } from "cn";
import { ArrowRightIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { UpcomingSeason } from "@/lib/seasons";

import { seasonIcons } from "./season-visuals";

/**
 * Tarjeta de una fecha comercial: cuándo es, cuánto falta y un atajo para
 * crear su anuncio en el asistente. Las fechas cercanas se destacan.
 */
export function SeasonCard({
  upcoming: { season, date, daysUntil, active },
}: {
  upcoming: UpcomingSeason;
}) {
  const t = useTranslations("Seasons");
  const tTemplates = useTranslations("Templates");
  const locale = useLocale();
  const Icon = seasonIcons[season.id];
  // Las fechas son medianoche UTC: se formatean en UTC para no cambiar de día.
  const month = (style: "short" | "long") =>
    new Intl.DateTimeFormat(locale, { month: style, timeZone: "UTC" }).format(
      date,
    );
  // Nombre accesible corto (fecha y cuánto falta) y el resto como descripción,
  // para no leer toda la tarjeta. Cada fecha aparece una vez por página.
  const id = `season-${season.id}`;

  return (
    <Link
      href={{ pathname: "/create", query: { season: season.id } }}
      aria-labelledby={`${id}-name ${id}-when`}
      aria-describedby={`${id}-tip`}
      data-testid="season-card"
      className={cn(
        "group flex h-full flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm transition-[translate,box-shadow] outline-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/10 focus-visible:ring-3 focus-visible:ring-ring/50",
        active &&
          "border-violet-300 ring-1 ring-violet-200 dark:border-violet-500/40 dark:ring-violet-500/20",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="flex w-14 shrink-0 flex-col overflow-hidden rounded-2xl border text-center"
        >
          <span
            className={cn(
              "py-0.5 text-[11px] font-semibold tracking-wide uppercase",
              active
                ? "bg-gradient-brand text-white"
                : "bg-muted text-muted-foreground",
            )}
          >
            {month("short").replace(".", "")}
          </span>
          <span
            className={cn(
              "grid h-10 place-items-center font-heading font-bold tabular-nums",
              season.approximate ? "text-xs text-muted-foreground" : "text-2xl",
            )}
          >
            {season.approximate ? t("approximateShort") : date.getUTCDate()}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <span
            id={`${id}-when`}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              active
                ? "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"
                : "bg-muted text-muted-foreground",
            )}
          >
            {season.approximate
              ? t("approximate", { month: month("long") })
              : t("countdown", { count: daysUntil })}
          </span>
          <h3
            id={`${id}-name`}
            className="font-heading text-lg leading-tight font-semibold text-balance"
          >
            {t(`items.${season.id}.name`)}
          </h3>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          <Icon aria-hidden className="size-5" />
        </span>
      </div>
      <p id={`${id}-tip`} className="text-sm text-pretty text-muted-foreground">
        {t(`items.${season.id}.tip`)}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        {active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-2.5 py-0.5 text-xs font-semibold text-white">
            <span
              aria-hidden
              className="size-1.5 animate-pulse rounded-full bg-white"
            />
            {t("now")}
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {tTemplates(`items.${season.templateId}.name`)}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 dark:text-violet-300">
          {t("create")}
          <ArrowRightIcon
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
