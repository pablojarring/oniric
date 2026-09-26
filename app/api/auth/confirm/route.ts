import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { authErrorRedirect, completeAuthRedirect } from "@/lib/auth/complete";
import { localeFromPath, safeNextPath } from "@/lib/auth/redirect";
import { getSiteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Enlaces de los correos de Supabase (confirmación de cuenta y recuperación de
// contraseña). Usa token_hash en vez del flujo PKCE para que el enlace funcione
// aunque se abra en otro dispositivo. Ver supabase/templates/.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextPath = safeNextPath(searchParams.get("next"), getSiteUrl());
  const locale = localeFromPath(nextPath ?? "/");

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error && data.user) {
      return completeAuthRedirect(data.user, {
        nextPath,
        fallbackLocale: locale,
      });
    }
  }

  return authErrorRedirect(locale, "invalidLink");
}
