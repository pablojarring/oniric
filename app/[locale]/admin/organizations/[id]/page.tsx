import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { CreditForm } from "@/components/admin/credit-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { getOrganizationOverview } from "@/lib/admin/organizations";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export default async function AdminOrganizationPage({
  params,
}: PageProps<"/[locale]/admin/organizations/[id]">) {
  await requirePlatformAdmin();
  const { id } = await params;
  const now = new Date();
  const overview = await getOrganizationOverview(getDb(), id, now);
  if (!overview) notFound();

  const [t, tCredit, tAdmin, tOnboarding, locale] = await Promise.all([
    getTranslations("Admin.organization"),
    getTranslations("Admin.credit"),
    getTranslations("Admin"),
    getTranslations("Onboarding.options"),
    getLocale(),
  ]);
  const { organization, members, balance, lots, transactions } = overview;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/organizations"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {t("back")}
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {organization.name}
        </h1>
        <p className="text-muted-foreground">
          {tAdmin(`segments.${organization.segment}`)} · {organization.country}{" "}
          · {tOnboarding(`industries.${organization.industry}`)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("balance")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-muted-foreground">{t("available")}</dt>
                <dd
                  className="text-2xl font-semibold"
                  data-testid="admin-available"
                >
                  {tAdmin("credits", { count: balance.available })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("held")}</dt>
                <dd className="text-2xl font-semibold">
                  {tAdmin("credits", { count: balance.held })}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium">{t("lots")}</h2>
              {lots.length === 0 ? (
                <p className="text-muted-foreground">{t("noLots")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {lots.map((lot) => (
                    <li key={lot.id}>
                      {t("lotRemaining", {
                        remaining: lot.remainingCredits,
                        granted: lot.grantedCredits,
                      })}{" "}
                      ·{" "}
                      {lot.expiresAt === null
                        ? t("noExpiry")
                        : t(lot.expiresAt <= now ? "expired" : "expires", {
                            date: formatDateTime(lot.expiresAt, locale),
                          })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium">{t("members")}</h2>
              <ul>
                {members.map((member) => (
                  <li key={member.email}>
                    {member.email} ({member.role})
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tCredit("title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {tCredit("description")}
            </p>
          </CardHeader>
          <CardContent>
            <CreditForm organizationId={organization.id} />
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold">
          {t("transactions")}
        </h2>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground">{t("noTransactions")}</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border text-sm">
            {transactions.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap justify-between gap-2 p-3"
              >
                <span>
                  <span className="font-medium">
                    {t(`types.${entry.type}`)}
                  </span>
                  {entry.note && ` · ${entry.note}`}
                  {entry.actorEmail &&
                    ` · ${t("by", { email: entry.actorEmail })}`}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {entry.availableDelta > 0 ? "+" : ""}
                  {entry.availableDelta} ·{" "}
                  {formatDateTime(entry.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
