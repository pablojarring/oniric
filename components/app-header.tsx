import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/actions";

/**
 * Encabezado de las páginas con sesión. Sin `homePath` (onboarding) no muestra
 * la navegación, porque todavía no hay organización.
 */
export function AppHeader({ homePath }: { homePath?: string }) {
  const t = useTranslations("Nav");
  const brandClassName = "font-heading text-lg font-semibold";

  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
      {homePath ? (
        <Link href={homePath} className={brandClassName}>
          {t("brand")}
        </Link>
      ) : (
        <span className={brandClassName}>{t("brand")}</span>
      )}
      <nav className="flex items-center gap-2">
        <LocaleSwitcher />
        {homePath && (
          <Link
            href="/settings"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t("settings")}
          </Link>
        )}
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            {t("logout")}
          </Button>
        </form>
      </nav>
    </header>
  );
}
