import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { searchOrganizations } from "@/lib/admin/organizations";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export default async function AdminOrganizationsPage({
  searchParams,
}: PageProps<"/[locale]/admin/organizations">) {
  await requirePlatformAdmin();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  const [organizations, t, tAdmin, locale] = await Promise.all([
    searchOrganizations(getDb(), query),
    getTranslations("Admin.organizations"),
    getTranslations("Admin"),
    getLocale(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <form role="search" className="flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          aria-label={t("search")}
          placeholder={t("search")}
          className="max-w-md"
        />
        <Button type="submit" variant="outline">
          {t("searchButton")}
        </Button>
      </form>

      {organizations.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">{t("columns.name")}</th>
                <th className="p-3 font-medium">{t("columns.segment")}</th>
                <th className="hidden p-3 font-medium sm:table-cell">
                  {t("columns.country")}
                </th>
                <th className="hidden p-3 font-medium sm:table-cell">
                  {t("columns.createdAt")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <td className="p-3">
                    <Link
                      href={`/admin/organizations/${organization.id}`}
                      className="font-medium hover:underline"
                    >
                      {organization.name}
                    </Link>
                  </td>
                  <td className="p-3">
                    {tAdmin(`segments.${organization.segment}`)}
                  </td>
                  <td className="hidden p-3 sm:table-cell">
                    {organization.country}
                  </td>
                  <td className="hidden p-3 whitespace-nowrap sm:table-cell">
                    {formatDateTime(organization.createdAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
