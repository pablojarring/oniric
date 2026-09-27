import type { LucideIcon } from "lucide-react";

/**
 * Contenido de una acción del encabezado: en pantallas chicas solo se ve el
 * ícono, para que el selector de idioma entre completo; el texto sigue siendo
 * el nombre accesible de la acción.
 */
export function NavLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <>
      <Icon aria-hidden className="sm:hidden" />
      <span className="sr-only sm:not-sr-only">{children}</span>
    </>
  );
}

/** Clases que vuelven cuadrado un botón `size="sm"` cuando solo muestra el ícono. */
export const navIconOnlyClassName = "max-sm:w-7 max-sm:px-0";
