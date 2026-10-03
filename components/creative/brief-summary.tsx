import { cn } from "cn";
import { ClipboardListIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { appCardClassName } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import type { CreativeBrief } from "@/lib/creative/schemas";

const textFields = [
  "objective",
  "product",
  "differentiator",
  "offer",
  "audience",
  "tone",
] as const;

/**
 * Lo que el director creativo entendió de la conversación. Con `onEdit`, el
 * dueño lo puede corregir a mano.
 */
export function BriefSummary({
  brief,
  onEdit,
}: {
  brief: CreativeBrief;
  onEdit?: () => void;
}) {
  const t = useTranslations("Director.brief");
  const lists = [
    {
      key: "brandElements",
      items: brief.brandElements.map((element) => element.name),
    },
    { key: "mustInclude", items: brief.mustInclude },
    { key: "avoid", items: brief.avoid },
  ] as const;

  return (
    <section
      aria-labelledby="brief-title"
      className={cn(appCardClassName, "flex flex-col gap-4 p-5")}
      data-testid="director-brief"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          <ClipboardListIcon aria-hidden className="size-4.5" />
        </span>
        <h2
          id="brief-title"
          className="flex-1 font-heading text-lg font-semibold"
        >
          {t("title")}
        </h2>
        {onEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <PencilIcon aria-hidden />
            {t("edit")}
          </Button>
        )}
      </div>
      <dl className="grid gap-3 text-sm">
        {textFields.map((field) => {
          const value = brief[field];
          if (!value) return null;
          return (
            <div key={field} className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium text-muted-foreground">
                {t(`fields.${field}`)}
              </dt>
              <dd className="text-pretty">{value}</dd>
            </div>
          );
        })}
        {lists.map(({ key, items }) =>
          items.length > 0 ? (
            <div key={key} className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">
                {t(`fields.${key}`)}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {items.map((item, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
