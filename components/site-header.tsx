import { LogInIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { NavLabel, navIconOnlyClassName } from "@/components/nav-label";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Secciones de la portada, en el orden en que aparecen. */
export const landingSections = [
  { hash: "how-it-works", label: "how" },
  { hash: "templates", label: "templates" },
  { hash: "pricing", label: "pricing" },
  { hash: "faq", label: "faq" },
] as const;

/** Encabezado de las páginas públicas. Queda fijo arriba al desplazarse. */
export function SiteHeader() {
  const t = useTranslations("Nav");
  const tSections = useTranslations("Landing.nav");

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/">
          <Logo name={t("brand")} />
        </Link>
        {/* Solo en pantallas anchas: en el celular no entran junto a las acciones. */}
        <nav
          aria-label={tSections("label")}
          className="hidden items-center gap-1 lg:flex"
        >
          {landingSections.map(({ hash, label }) => (
            <Link
              key={hash}
              href={{ pathname: "/", hash }}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {tSections(label)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: navIconOnlyClassName(),
            })}
          >
            <NavLabel icon={LogInIcon}>{t("login")}</NavLabel>
          </Link>
          {/* Acción principal: conserva el texto en todos los tamaños. */}
          <Link href="/signup" className={buttonVariants({ size: "sm" })}>
            {t("signup")}
          </Link>
        </div>
      </div>
    </header>
  );
}
