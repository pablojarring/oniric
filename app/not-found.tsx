import { getTranslations } from "next-intl/server";

import { defaultLocale } from "@/i18n/config";

import "./globals.css";

// 404 para rutas fuera de proxy.ts (p. ej. archivos inexistentes). Se muestra
// en el idioma por defecto porque aquí no hay un idioma en la URL.
export default async function GlobalNotFound() {
  const t = await getTranslations({
    locale: defaultLocale,
    namespace: "NotFound",
  });

  return (
    <html lang={defaultLocale}>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center font-sans">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </body>
    </html>
  );
}
