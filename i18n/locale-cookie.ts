import "server-only";

import { cookies } from "next/headers";

import type { Locale } from "./config";
import { LOCALE_COOKIE } from "./routing";

/**
 * Guarda el idioma en la misma cookie que usa next-intl, para que proxy.ts no
 * redirija al idioma elegido antes del login.
 */
export async function setLocaleCookie(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE.name, locale, {
    maxAge: LOCALE_COOKIE.maxAge,
    path: "/",
    sameSite: "lax",
  });
}
