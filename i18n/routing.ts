import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "./config";

/** Cookie con el idioma elegido; la escribe next-intl y también el login. */
export const LOCALE_COOKIE = {
  name: "NEXT_LOCALE",
  // Recuerda el idioma elegido durante un año.
  maxAge: 60 * 60 * 24 * 365,
} as const;

export const routing = defineRouting({
  locales,
  defaultLocale,
  // El español no lleva prefijo (`/`); los demás idiomas sí (`/pt`).
  localePrefix: "as-needed",
  localeCookie: LOCALE_COOKIE,
});
