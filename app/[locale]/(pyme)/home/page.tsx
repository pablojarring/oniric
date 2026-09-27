import { getLocale, getTranslations } from "next-intl/server";

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
import { requireOrganization } from "@/lib/auth/session";
import { getBalance } from "@/lib/billing/wallet";
import { creditsToUsd, formatUsd } from "@/lib/format";

export default async function PymeHomePage() {
  const { organization } = await requireOrganization();
  const [t, locale, balance] = await Promise.all([
    getTranslations("PymeHome"),
    getLocale(),
    getBalance(getDb(), organization.id),
  ]);

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
            : // TODO(paso 6): recarga manual desde el panel de admin.
              t("balance.empty")}
        </CardContent>
      </Card>
    </div>
  );
}
