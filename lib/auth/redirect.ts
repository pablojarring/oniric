import { hasLocale } from "next-intl";

import { defaultLocale, type Locale } from "@/i18n/config";
import { routing } from "@/i18n/routing";

/** Encabezado con la ruta pedida, que agrega proxy.ts. */
export const PATHNAME_HEADER = "x-oniric-pathname";

/**
 * Devuelve la ruta interna (path + query) de `value` si apunta a este mismo
 * sitio, o `null`. Evita redirecciones abiertas con `?next=https://otro.com`
 * o `//otro.com`. Acepta rutas relativas y URLs absolutas del propio sitio
 * (los correos de Supabase envían la URL completa).
 */
export function safeNextPath(value: unknown, siteUrl: string): string | null {
  if (typeof value !== "string" || value === "") return null;

  const site = new URL(siteUrl);
  let url: URL;
  try {
    url = new URL(value, site);
  } catch {
    return null;
  }

  if (url.origin !== site.origin) return null;
  return `${url.pathname}${url.search}`;
}

/** Idioma indicado por el prefijo de una ruta (`/pt/...`), o el idioma por defecto. */
export function localeFromPath(path: string): Locale {
  const [, firstSegment] = path.split("/");
  return hasLocale(routing.locales, firstSegment)
    ? firstSegment
    : defaultLocale;
}
