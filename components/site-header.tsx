import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Encabezado de las páginas públicas. */
export function SiteHeader() {
  const t = useTranslations("Nav");

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4">
      <Link href="/" className="font-heading text-lg font-semibold">
        {t("brand")}
      </Link>
      <nav className="flex items-center gap-2">
        <LocaleSwitcher />
        <Link
          href="/login"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          {t("login")}
        </Link>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          {t("signup")}
        </Link>
      </nav>
    </header>
  );
}
