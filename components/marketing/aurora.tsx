import { cn } from "cn";

/**
 * Fondo decorativo: manchas de color de la marca que se mueven lentamente,
 * sobre una grilla de puntos. Sin JavaScript; se detiene si el usuario
 * prefiere menos movimiento.
 */
export function Aurora({
  className,
  dots = true,
}: {
  className?: string;
  dots?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute -top-48 left-1/2 size-[38rem] -translate-x-[85%] animate-aurora rounded-full bg-violet-500/30 blur-3xl" />
      <div className="absolute -top-32 left-1/2 size-[32rem] -translate-x-[15%] animate-aurora rounded-full bg-fuchsia-400/30 blur-3xl [animation-delay:-6s]" />
      <div className="absolute top-40 left-1/2 size-[28rem] translate-x-[15%] animate-aurora rounded-full bg-orange-300/35 blur-3xl [animation-delay:-12s]" />
      {dots && <div className="absolute inset-0 bg-dots opacity-70" />}
    </div>
  );
}
