import { getLocale, getTranslations } from "next-intl/server";

import { AdCard } from "@/components/ads/ad-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { signThumbnails } from "@/lib/ads/files";
import { listOrganizationJobs } from "@/lib/ads/service";
import { requireOrganization } from "@/lib/auth/session";
import { getBalance } from "@/lib/billing/wallet";
import { creditsToUsd, formatUsd } from "@/lib/format";
import { buckets } from "@/lib/storage";
import { getStorage } from "@/lib/storage/supabase";

const RECENT_ADS = 3;

export default async function PymeHomePage() {
  const { organization } = await requireOrganization();
  const db = getDb();
  const [t, locale, balance, recent] = await Promise.all([
    getTranslations("PymeHome"),
    getLocale(),
    getBalance(db, organization.id),
    listOrganizationJobs(db, organization.id, { limit: RECENT_ADS }),
  ]);
  const thumbnails = await signThumbnails(
    getStorage(buckets.adOutputs),
    recent.jobs,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title", { name: organization.name })}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Link
        href="/create"
        className={buttonVariants({ size: "lg", className: "self-start" })}
      >
        {t("create")}
      </Link>

      <Card className="max-w-sm">
        <CardHeader>
          <CardDescription>{t("balance.title")}</CardDescription>
          <CardTitle className="text-2xl" data-testid="credit-balance">
            {t("balance.credits", { count: balance.available })}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {balance.available > 0
            ? t("balance.usd", {
                usd: formatUsd(creditsToUsd(balance.available), locale),
              })
            : // TODO(fase 3): recarga en línea; hoy un admin acredita los pagos a mano.
              t("balance.empty")}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-xl font-semibold">
            {t("recent.title")}
          </h2>
          {recent.jobs.length > 0 && (
            <Link href="/ads" className="text-sm hover:underline">
              {t("recent.viewAll")}
            </Link>
          )}
        </div>
        {recent.jobs.length === 0 ? (
          <p className="text-muted-foreground">{t("recent.empty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
