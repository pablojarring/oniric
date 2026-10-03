import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CreativeSessionStatus } from "@/db/schema";

const steps = ["conversation", "tier", "ideas", "script"] as const;

/** Paso del recorrido en el que está cada estado de la sesión. */
const stepIndex: Record<CreativeSessionStatus, number> = {
  conversation: 0,
  briefed: 1,
  ideas: 2,
  scripted: 3,
};

/** Recorrido del director creativo: cuéntame, nivel, ideas y guion. */
export function DirectorSteps({ status }: { status: CreativeSessionStatus }) {
  const t = useTranslations("Director.steps");
  const current = stepIndex[status];
  return (
    <ol aria-label={t("label")} className="flex items-center gap-2">
      {steps.map((name, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={name}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              index < steps.length - 1 && "flex-1",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold",
                done && "border-transparent bg-gradient-brand text-white",
                active &&
                  "border-2 border-violet-600 text-violet-700 dark:text-violet-300",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? <CheckIcon className="size-4" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                !active && "text-muted-foreground max-sm:sr-only",
              )}
            >
              {t(name)}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-0.5 flex-1 rounded-full bg-border",
                  done && "bg-violet-500",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
