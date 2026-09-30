import { cn } from "cn";

/** Isotipo de Oniric: un "sueño" (anillo y estrella) sobre el degradado de la marca. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-[9px] bg-linear-to-br from-violet-600 via-fuchsia-500 to-orange-400 shadow-sm shadow-fuchsia-500/30",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[70%]" fill="none">
        <circle cx="11" cy="13" r="6" stroke="white" strokeWidth="2.6" />
        <path
          d="M18.5 3.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"
          fill="white"
        />
      </svg>
    </span>
  );
}

/**
 * Logo completo. Por defecto el isotipo se oculta en pantallas chicas para que
 * el encabezado entre completo (ver e2e/header.spec.ts).
 */
export function Logo({
  name,
  className,
  markClassName = "hidden sm:grid",
}: {
  name: string;
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="font-heading text-lg font-bold tracking-tight">
        {name}
      </span>
    </span>
  );
}
