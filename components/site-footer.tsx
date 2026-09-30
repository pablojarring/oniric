import { useTranslations } from "next-intl";

import { Logo } from "@/components/marketing/logo";
import { landingSections } from "@/components/site-header";
import { Link } from "@/i18n/navigation";

const linkClassName = "transition-colors hover:text-foreground";

/** Pie de las páginas públicas. */
export function SiteFooter() {
  const t = useTranslations("Landing");
  const tNav = useTranslations("Nav");

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div className="col-span-2 sm:col-span-1">
          <Logo name={tNav("brand")} markClassName="grid" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("footer.product")}</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {landingSections.map(({ hash, label }) => (
              <li key={hash}>
                <Link href={{ pathname: "/", hash }} className={linkClassName}>
                  {t(`nav.${label}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("footer.account")}</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/login" className={linkClassName}>
                {tNav("login")}
              </Link>
            </li>
            <li>
              <Link href="/signup" className={linkClassName}>
                {tNav("signup")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          {t("footer.legal", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
