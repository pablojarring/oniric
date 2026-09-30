// Botones de llamado a la acción de la portada. Son enlaces, no <button>.

const base =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0";

/** Acción principal, con el degradado de la marca. */
export const primaryCtaClassName = `group ${base} bg-gradient-brand text-white shadow-lg shadow-fuchsia-500/25 transition-[translate,box-shadow] hover:-translate-y-0.5 hover:animate-gradient-pan hover:shadow-xl hover:shadow-fuchsia-500/40`;

/** Acción secundaria, sobre fondo claro. */
export const secondaryCtaClassName = `${base} border bg-background/70 backdrop-blur transition-colors hover:bg-muted`;

/** Flecha que se desplaza al pasar el cursor por la acción principal. */
export const ctaArrowClassName =
  "transition-transform group-hover:translate-x-0.5";
