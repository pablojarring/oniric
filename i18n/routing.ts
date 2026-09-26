import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // El español no lleva prefijo (`/`); los demás idiomas sí (`/pt`).
  localePrefix: "as-needed",
  // Recuerda el idioma elegido durante un año.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});
