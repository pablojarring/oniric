import {
  CoinsIcon,
  HouseIcon,
  LayoutGridIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import type { AppSection } from "@/lib/segment";

/** Ruta e ícono de cada sección del menú (los nombres están en `Nav`). */
export const sectionLinks: Record<
  AppSection,
  { href: string; icon: LucideIcon }
> = {
  home: { href: "/home", icon: HouseIcon },
  create: { href: "/create", icon: SparklesIcon },
  ads: { href: "/ads", icon: LayoutGridIcon },
  credits: { href: "/credits", icon: CoinsIcon },
};

/** La sección está activa en su ruta y en las que cuelgan de ella. */
export function isSectionActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
