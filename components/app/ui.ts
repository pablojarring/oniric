// Clases compartidas de la app con sesión (misma marca que la portada).

/** Acción principal: pastilla con el degradado de la marca. */
export const appPrimaryClassName =
  "group/cta inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 text-sm font-semibold whitespace-nowrap text-white shadow-md shadow-fuchsia-500/25 transition-[translate,box-shadow,opacity] outline-none hover:-translate-y-px hover:animate-gradient-pan hover:shadow-lg hover:shadow-fuchsia-500/35 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

/** Acción secundaria, del mismo alto que la principal. */
export const appSecondaryClassName =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border bg-background px-5 text-sm font-semibold whitespace-nowrap transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

/** Tarjeta de la app: bordes redondeados, anillo suave y sombra leve. */
export const appCardClassName =
  "rounded-3xl border bg-card text-card-foreground shadow-sm shadow-black/[0.03]";
