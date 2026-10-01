import { cn } from "cn";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { GenerationStatus } from "@/db/schema";

const styles: Record<
  GenerationStatus,
  { className: string; icon: typeof ClockIcon; spin?: boolean }
> = {
  pending: {
    className:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-200 dark:ring-slate-500/30",
    icon: ClockIcon,
  },
  running: {
    className:
      "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-500/30",
    icon: LoaderCircleIcon,
    spin: true,
  },
  succeeded: {
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30",
    icon: CircleCheckIcon,
  },
  failed: {
    className:
      "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/30",
    icon: CircleAlertIcon,
  },
};

/** Estado de un anuncio (en cola, creando, listo o con error). */
export function AdStatusBadge({
  status,
  className,
  ...props
}: { status: GenerationStatus } & React.ComponentProps<"span">) {
  const t = useTranslations("AdPage.status");
  const { className: statusClassName, icon: Icon, spin } = styles[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        statusClassName,
        className,
      )}
      {...props}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-3.5",
          spin && "animate-spin motion-reduce:animate-none",
        )}
      />
      {t(status)}
    </span>
  );
}
