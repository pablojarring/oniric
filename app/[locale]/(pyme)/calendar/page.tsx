import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/app/page-header";
import { SeasonCard } from "@/components/seasons/season-card";
import { requireOrganization } from "@/lib/auth/session";
import { upcomingSeasons, type UpcomingSeason } from "@/lib/seasons";
import { hasFeature } from "@/lib/segment";

/** Calendario comercial del país: las fechas de los próximos 12 meses, por mes. */
export default async function CalendarPage() {
  const { organization } = await requireOrganization();
  const upcoming = hasFeature(organization.segment, "seasonalCalendar")
    ? upcomingSeasons(organization.country, new Date())
    : [];
  if (upcoming.length === 0) notFound();

  const [t, locale] = await Promise.all([
    getTranslations("Seasons.calendar"),
    getLocale(),
  ]);
  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Las fechas ya vienen ordenadas: se agrupan por mes en ese orden.
  const months = new Map<string, { date: Date; items: UpcomingSeason[] }>();
  for (const item of upcoming) {
    const key = item.date.toISOString().slice(0, 7);
    const month = months.get(key) ?? { date: item.date, items: [] };
    month.items.push(item);
    months.set(key, month);
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      {Array.from(months, ([key, { date, items }]) => (
        <section key={key} className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold first-letter:uppercase sm:text-xl">
            {monthTitle.format(date)}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.season.id}>
                <SeasonCard upcoming={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
