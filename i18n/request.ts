import { getRequestConfig } from "next-intl/server";

import { defaultLocale } from "./config";

export default getRequestConfig(async () => {
  // TODO(producto): definir cómo se elige el idioma (preferencia del usuario,
  // país de la organización o Accept-Language). Por ahora siempre `es`.
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
