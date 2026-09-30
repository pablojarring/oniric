import { cn } from "cn";

/** Título de una sección de la portada, con antetítulo y bajada. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  invert = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
  /** Sobre fondo oscuro. */
  invert?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-2xl flex-col items-center gap-4 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase",
          invert
            ? "border-white/20 bg-white/10 text-white"
            : "border-violet-200 bg-violet-50 text-violet-700",
        )}
      >
        {eyebrow}
      </span>
      <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "text-lg text-balance",
            invert ? "text-white/75" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
