import { cn } from "cn";

/**
 * Cinta que se desplaza sin fin. Los elementos se repiten una vez (la copia
 * queda oculta para lectores de pantalla) y se pausa al pasar el cursor.
 */
export function Marquee({
  items,
  className,
}: {
  items: React.ReactNode[];
  className?: string;
}) {
  const row = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-3 pr-3"
    >
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        "group flex overflow-hidden mask-x-from-85% mask-x-to-100%",
        className,
      )}
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
