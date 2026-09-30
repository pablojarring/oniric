"use client";

import { cn } from "cn";
import { SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import type { AppSection } from "@/lib/segment";

import { isSectionActive, sectionLinks } from "./sections";

/** Menú principal en pantallas anchas: pastillas en el centro del encabezado. */
export function AppNav({ sections }: { sections: readonly AppSection[] }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("mainNav")}
      className="hidden items-center gap-1 rounded-full border bg-muted/60 p-1 lg:flex"
    >
      {sections.map((section) => {
        const { href, icon: Icon } = sectionLinks[section];
        const active = isSectionActive(pathname, href);
        return (
          <Link
            key={section}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              active &&
                "bg-background text-foreground shadow-sm ring-1 ring-foreground/5",
            )}
          >
            <Icon
              aria-hidden
              className={cn("size-4", active && "text-violet-600")}
            />
            {t(`sections.${section}`)}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Menú del celular: barra fija abajo, con "Crear" destacado en el centro y la
 * configuración al final (en el celular sale del encabezado).
 */
export function MobileTabBar({
  sections,
}: {
  sections: readonly AppSection[];
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const others = sections.filter((section) => section !== "create");
  const middle = Math.ceil(others.length / 2);
  const items: (AppSection | "settings")[] = [
    ...others.slice(0, middle),
    ...(sections.includes("create") ? (["create"] as const) : []),
    ...others.slice(middle),
    "settings",
  ];

  return (
    <nav
      aria-label={t("mainNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item) => {
          const { href, icon: Icon } =
            item === "settings"
              ? { href: "/settings", icon: SettingsIcon }
              : sectionLinks[item];
          const active = isSectionActive(pathname, href);
          const label = t(`tabs.${item}`);

          if (item === "create") {
            return (
              <li key={item} className="flex justify-center">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="group -mt-5 flex flex-col items-center gap-1 text-[11px] font-semibold outline-none"
                >
                  <span className="grid size-13 place-items-center rounded-full bg-gradient-brand text-white shadow-lg ring-4 shadow-fuchsia-500/30 ring-background transition-transform group-focus-visible:ring-ring/50 group-active:scale-95">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          }
          return (
            <li key={item}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground outline-none focus-visible:bg-muted",
                  active && "text-violet-700 dark:text-violet-300",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
