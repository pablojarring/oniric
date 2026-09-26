import "server-only";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import type { Locale } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/locale-cookie";
import { getPathname } from "@/i18n/navigation";
import { getSiteUrl } from "@/lib/env";
import { ensureUser } from "@/lib/users/service";

import { signupLocaleOf } from "./metadata";
import { resolveHomePath } from "./session";

/**
 * Cierra el login desde un enlace de correo o desde Google: crea el perfil si
 * falta, aplica el idioma del usuario y redirige a `next` o a su inicio.
 */
export async function completeAuthRedirect(
  supabaseUser: SupabaseUser,
  options: { nextPath: string | null; fallbackLocale: Locale },
): Promise<NextResponse> {
  const user = await ensureUser(getDb(), {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    locale:
      signupLocaleOf(supabaseUser.user_metadata) ?? options.fallbackLocale,
  });
  await setLocaleCookie(user.locale);

  const target =
    options.nextPath ??
    getPathname({ href: await resolveHomePath(user.id), locale: user.locale });
  return NextResponse.redirect(new URL(target, getSiteUrl()));
}

/** Enlace vencido o inválido: vuelve al login con un aviso. */
export function authErrorRedirect(locale: Locale, error: string): NextResponse {
  const path = getPathname({
    href: { pathname: "/login", query: { error } },
    locale,
  });
  return NextResponse.redirect(new URL(path, getSiteUrl()));
}
