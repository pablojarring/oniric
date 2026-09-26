import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseEnv } from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

/**
 * Refresca la sesión de Supabase si el token venció.
 *
 * Los cookies nuevos se escriben en la request (para que las páginas de esta
 * misma petición lean la sesión nueva) y se devuelven en una función que los
 * copia a la respuesta final. Si solo se escribieran en la respuesta, las
 * páginas intentarían refrescar otra vez con un refresh token ya usado y el
 * usuario perdería la sesión.
 */
export async function refreshSession(request: NextRequest) {
  const cookiesToSet: CookieToSet[] = [];
  const headersToSet: Record<string, string> = {};
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        for (const { name, value } of cookies) request.cookies.set(name, value);
        cookiesToSet.push(...cookies);
        Object.assign(headersToSet, headers);
      },
    },
  });

  // Valida el token y lo refresca si hace falta. No agregar lógica entre la
  // creación del cliente y esta llamada.
  await supabase.auth.getClaims();

  return function applyTo(response: NextResponse) {
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set(name, value, options);
    }
    for (const [key, value] of Object.entries(headersToSet)) {
      response.headers.set(key, value);
    }
    return response;
  };
}
