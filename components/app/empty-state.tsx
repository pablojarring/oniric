import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

/** Estado vacío: ícono con el degradado, título, bajada y una acción. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl border border-dashed bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-dots opacity-60" />
      <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-violet-600 via-fuchsia-500 to-orange-400 text-white shadow-lg shadow-fuchsia-500/25">
        <Icon aria-hidden className="size-7" />
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="font-heading text-lg font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
