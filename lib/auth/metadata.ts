import { hasLocale } from "next-intl";

import type { Locale } from "@/i18n/config";
import { routing } from "@/i18n/routing";

/** Idioma guardado en `user_metadata` al registrarse, si es válido. */
export function signupLocaleOf(
  metadata: Record<string, unknown> | undefined,
): Locale | null {
  const locale = metadata?.locale;
  return hasLocale(routing.locales, locale) ? locale : null;
}
