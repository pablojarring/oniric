import { LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { AppNav } from "@/components/app/app-nav";
import { BalanceChip } from "@/components/app/balance-chip";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { NavLabel, navIconOnlyClassName } from "@/components/nav-label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/actions";
import type { AppSection } from "@/lib/segment";

/**
 * Encabezado de las páginas con sesión. Sin `homePath` (onboarding) no muestra
 * la navegación, porque todavía no hay organización.
 */
export function AppHeader({
  homePath,
  isPlatformAdmin = false,
  sections = [],
  balance,
}: {
  homePath?: string;
  isPlatformAdmin?: boolean;
  /** Menú principal; en el celular va en la barra de abajo (`MobileTabBar`). */
  sections?: readonly AppSection[];
  /** Créditos disponibles; sin saldo no se muestra. */
  balance?: number;
}) {
  const t = useTranslations("Nav");
  const hasTabBar = sections.length > 0;
  // Con el menú en el encabezado, las acciones muestran su texto recién en
  // pantallas muy anchas.
  const breakpoint = hasTabBar ? "xl" : "sm";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {homePath ? (
          <Link href={homePath} className="shrink-0">
            <Logo name={t("brand")} />
          </Link>
        ) : (
          <Logo name={t("brand")} />
        )}
        {hasTabBar && <AppNav sections={sections} />}
        <div className="flex items-center gap-2">
          {balance !== undefined && <BalanceChip initial={balance} />}
          <LocaleSwitcher />
          {isPlatformAdmin && (
            <Link
              href="/admin"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: navIconOnlyClassName(breakpoint),
              })}
            >
              <NavLabel icon={ShieldIcon} breakpoint={breakpoint}>
                {t("admin")}
              </NavLabel>
            </Link>
          )}
          {homePath && (
            <Link
              href="/settings"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                // Con la barra de abajo, la configuración está en ella.
                className: navIconOnlyClassName(
                  breakpoint,
                  hasTabBar && "max-lg:hidden",
                ),
              })}
            >
              <NavLabel icon={SettingsIcon} breakpoint={breakpoint}>
                {t("settings")}
              </NavLabel>
            </Link>
          )}
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className={navIconOnlyClassName(breakpoint)}
            >
              <NavLabel icon={LogOutIcon} breakpoint={breakpoint}>
                {t("logout")}
              </NavLabel>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
