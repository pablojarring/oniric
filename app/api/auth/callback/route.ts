import type { NextRequest } from "next/server";
import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";
import { authErrorRedirect, completeAuthRedirect } from "@/lib/auth/complete";
import { safeNextPath } from "@/lib/auth/redirect";
import { getSiteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Vuelta del login con Google (flujo PKCE de Supabase).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const requestedLocale = searchParams.get("locale");
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  const nextPath = safeNextPath(searchParams.get("next"), getSiteUrl());

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      return completeAuthRedirect(data.user, {
        nextPath,
        fallbackLocale: locale,
      });
    }
  }

  return authErrorRedirect(locale, "oauth");
}
