import { LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { NavLabel, navIconOnlyClassName } from "@/components/nav-label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/actions";

/**
 * Encabezado de las páginas con sesión. Sin `homePath` (onboarding) no muestra
 * la navegación, porque todavía no hay organización.
 */
export function AppHeader({
  homePath,
  isPlatformAdmin = false,
}: {
  homePath?: string;
  isPlatformAdmin?: boolean;
}) {
  const t = useTranslations("Nav");

  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
      {homePath ? (
        <Link href={homePath}>
          <Logo name={t("brand")} />
        </Link>
      ) : (
        <Logo name={t("brand")} />
      )}
      <nav className="flex items-center gap-2">
        <LocaleSwitcher />
        {isPlatformAdmin && (
          <Link
            href="/admin"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: navIconOnlyClassName,
            })}
          >
            <NavLabel icon={ShieldIcon}>{t("admin")}</NavLabel>
          </Link>
        )}
        {homePath && (
          <Link
            href="/settings"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: navIconOnlyClassName,
            })}
          >
            <NavLabel icon={SettingsIcon}>{t("settings")}</NavLabel>
          </Link>
        )}
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className={navIconOnlyClassName}
          >
            <NavLabel icon={LogOutIcon}>{t("logout")}</NavLabel>
          </Button>
        </form>
      </nav>
    </header>
  );
}
