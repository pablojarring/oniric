"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

const items = [
  { href: "/admin/organizations", key: "organizations" },
  { href: "/admin/pricing", key: "pricing" },
] as const;

export function AdminNav() {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("title")} className="flex gap-4 border-b pb-3 text-sm">
      <span className="font-medium">{t("title")}</span>
      {items.map(({ href, key }) => (
        <Link
          key={key}
          href={href}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
          className={cn(
            "hover:underline",
            pathname.startsWith(href)
              ? "text-foreground underline"
              : "text-muted-foreground",
          )}
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
