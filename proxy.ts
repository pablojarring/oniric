import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Todas las rutas salvo la API, los internos de Next.js y los archivos con
  // extensión (favicon.ico, imágenes, etc.).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
