"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { localeInfo, locales, type Locale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    startTransition(() => {
      // Navega a la misma página en el otro idioma; next-intl guarda la
      // elección en una cookie.
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <NativeSelect
      aria-label={t("label")}
      value={locale}
      onChange={onChange}
      disabled={isPending}
      size="sm"
    >
      {locales.map((code) => (
        <NativeSelectOption key={code} value={code} lang={code}>
          {localeInfo[code].nativeName}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
