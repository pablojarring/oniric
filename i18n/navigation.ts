import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Usa estos reemplazos de `next/link` y `next/navigation` para que los enlaces
// conserven el idioma actual.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
