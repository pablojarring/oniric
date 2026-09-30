import { cn } from "cn";
import { getLocale, getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { formatDateTime, formatUsd } from "@/lib/format";
import { listPurchases } from "@/lib/payments/purchases";

const PAGE_SIZE = 50;

/** Compras de créditos con el desglose para emitir las facturas (docs/pagos.md). */
export default async function AdminPurchasesPage({
  searchParams,
}: PageProps<"/[locale]/admin/purchases">) {
  await requirePlatformAdmin();
  const { status: statusParam, page: pageParam } = await searchParams;
  const showAll = statusParam === "all";
  const page = Math.max(1, Number.parseInt(String(pageParam ?? "1"), 10) || 1);

  const [purchases, t, tCredits, locale] = await Promise.all([
    listPurchases(getDb(), {
      status: showAll ? undefined : "paid",
      limit: PAGE_SIZE + 1,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getTranslations("Admin.purchases"),
    getTranslations("Credits"),
    getLocale() as Promise<Locale>,
  ]);
  const hasMore = purchases.length > PAGE_SIZE;
  const usd = (cents: number) => formatUsd(cents / 100, locale);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex gap-2">
        {(["paid", "all"] as const).map((filter) => (
          <Link
            key={filter}
            href={{
              pathname: "/admin/purchases",
              query: filter === "all" ? { status: "all" } : {},
            }}
            aria-current={(filter === "all") === showAll ? "page" : undefined}
            className={buttonVariants({
              variant: (filter === "all") === showAll ? "default" : "outline",
              size: "sm",
            })}
          >
            {t(`filters.${filter}`)}
          </Link>
        ))}
      </div>

      {purchases.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">{t("columns.date")}</th>
                <th className="p-3 font-medium">{t("columns.organization")}</th>
                <th className="p-3 font-medium">{t("columns.package")}</th>
                <th className="p-3 text-right font-medium">
                  {t("columns.base")}
                </th>
                <th className="p-3 text-right font-medium">
                  {t("columns.tax")}
                </th>
                <th className="p-3 text-right font-medium">
                  {t("columns.total")}
                </th>
                <th className="p-3 font-medium">{t("columns.payer")}</th>
                <th className="p-3 font-medium">{t("columns.status")}</th>
                <th className="p-3 font-medium">{t("columns.transaction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchases.slice(0, PAGE_SIZE).map((purchase) => (
                <tr key={purchase.id} data-testid="purchase-row">
                  <td className="p-3 whitespace-nowrap">
                    {formatDateTime(
                      purchase.paidAt ?? purchase.createdAt,
                      locale,
                    )}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/organizations/${purchase.organizationId}`}
                      className="font-medium hover:underline"
                    >
                      {purchase.organizationName}
                    </Link>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {tCredits("credits", { count: purchase.credits })}
                  </td>
                  <td className="p-3 text-right">{usd(purchase.baseCents)}</td>
                  <td className="p-3 text-right">{usd(purchase.taxCents)}</td>
                  <td className="p-3 text-right font-medium">
                    {usd(purchase.totalCents)}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      {purchase.payerName && <span>{purchase.payerName}</span>}
                      {purchase.payerDocument && (
                        <span className="text-muted-foreground">
                          {t("payerDocument", {
                            document: purchase.payerDocument,
                          })}
                        </span>
                      )}
                      {purchase.payerEmail && (
                        <span className="text-muted-foreground">
                          {purchase.payerEmail}
                        </span>
                      )}
                      {purchase.payerPhone && (
                        <span className="text-muted-foreground">
                          {purchase.payerPhone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        purchase.status === "paid" && "text-emerald-700",
                        purchase.status === "failed" && "text-destructive",
                      )}
                    >
                      {t(`statuses.${purchase.status}`)}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <div className="flex flex-col">
                      <span>
                        {purchase.gateway} {purchase.gatewayTransactionId}
                      </span>
                      {purchase.authorizationCode && (
                        <span>
                          {t("authorization", {
                            code: purchase.authorizationCode,
                          })}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <Link
          href={{
            pathname: "/admin/purchases",
            query: {
              ...(showAll ? { status: "all" } : {}),
              page: String(page + 1),
            },
          }}
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          {t("more")}
        </Link>
      )}
    </div>
  );
}
