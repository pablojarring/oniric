import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

/**
 * Desde qué ancho se ve el texto de una acción del encabezado: antes, solo el
 * ícono. Con el menú principal en el encabezado hace falta más espacio.
 */
export type NavLabelBreakpoint = "sm" | "xl";

const labelClassNames: Record<
  NavLabelBreakpoint,
  { icon: string; text: string; button: string }
> = {
  sm: {
    icon: "sm:hidden",
    text: "sr-only sm:not-sr-only",
    button: "max-sm:w-7 max-sm:px-0",
  },
  xl: {
    icon: "xl:hidden",
    text: "sr-only xl:not-sr-only",
    button: "max-xl:w-7 max-xl:px-0",
  },
};

/**
 * Contenido de una acción del encabezado: en pantallas chicas solo se ve el
 * ícono, para que el selector de idioma entre completo; el texto sigue siendo
 * el nombre accesible de la acción.
 */
export function NavLabel({
  icon: Icon,
  children,
  breakpoint = "sm",
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  breakpoint?: NavLabelBreakpoint;
}) {
  const classNames = labelClassNames[breakpoint];
  return (
    <>
      <Icon aria-hidden className={classNames.icon} />
      <span className={classNames.text}>{children}</span>
    </>
  );
}

/** Clases que vuelven cuadrado un botón `size="sm"` cuando solo muestra el ícono. */
export function navIconOnlyClassName(
  breakpoint: NavLabelBreakpoint = "sm",
  className?: string | false,
): string {
  return cn(labelClassNames[breakpoint].button, className);
}
