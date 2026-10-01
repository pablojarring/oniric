import { cn } from "cn";

/** Título de una página de la app, con bajada y acciones a la derecha. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        {eyebrow && (
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            {eyebrow}
          </span>
        )}
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-base text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
