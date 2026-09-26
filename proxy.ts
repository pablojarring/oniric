import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";
import { PATHNAME_HEADER } from "./lib/auth/redirect";
import { refreshSession } from "./lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // La sesión se refresca antes del routing de idiomas para que next-intl
  // reenvíe los cookies ya actualizados a las páginas.
  const applySessionCookies = await refreshSession(request);

  // Ruta pedida, para volver a ella después del login (ver lib/auth/session.ts).
  request.headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  return applySessionCookies(handleI18nRouting(request));
}

export const config = {
  // Todas las rutas salvo la API, los internos de Next.js y los archivos con
  // extensión (favicon.ico, imágenes, etc.).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
