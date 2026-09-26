import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const t = useTranslations("Nav");

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-heading text-lg font-semibold">
          {t("brand")}
        </Link>
        <LocaleSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </>
  );
}
