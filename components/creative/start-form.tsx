"use client";

import { cn } from "cn";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { formatShapes } from "@/components/ads/template-visuals";
import { appCardClassName, appPrimaryClassName } from "@/components/app/ui";
import { seasonIcons } from "@/components/seasons/season-visuals";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { startCreativeSessionAction } from "@/lib/creative/actions";
import {
  aspectRatios,
  type AspectRatio,
} from "@/lib/providers/generation-provider";
import type { SeasonId } from "@/lib/seasons";

import { CreativeError } from "./creative-error";
import { Thinking } from "./thinking";

/** Elige el formato y empieza la conversación con el director creativo. */
export function StartCreativeForm({ seasonId }: { seasonId?: SeasonId }) {
  const t = useTranslations("Director.start");
  const tTemplates = useTranslations("Templates");
  const tSeasons = useTranslations("Seasons");
  const [state, formAction, pending] = useActionState(
    startCreativeSessionAction,
    undefined,
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const SeasonIcon = seasonId ? seasonIcons[seasonId] : null;

  return (
    <form
      action={formAction}
      className={cn(appCardClassName, "flex flex-col gap-6 p-5 sm:p-8")}
    >
      {seasonId && SeasonIcon && (
        <div
          className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-500/30 dark:bg-violet-500/10"
          data-testid="season-notice"
        >
          <input type="hidden" name="season" value={seasonId} />
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white">
            <SeasonIcon aria-hidden className="size-5" />
          </span>
          <p className="font-semibold">
            {t("season", { season: tSeasons(`items.${seasonId}.name`) })}
          </p>
        </div>
      )}

      <FieldSet>
        <FieldLegend id="format-legend" variant="label">
          {t("format")}
        </FieldLegend>
        <RadioGroup
          name="aspectRatio"
          value={aspectRatio}
          onValueChange={(value) => setAspectRatio(value as AspectRatio)}
          aria-labelledby="format-legend"
          className="gap-3 sm:grid-cols-3"
        >
          {aspectRatios.map((ratio) => (
            <FieldLabel
              key={ratio}
              htmlFor={`format-${ratio}`}
              className="rounded-2xl! has-data-checked:border-violet-500"
            >
              <Field orientation="horizontal" className="items-center! p-3.5!">
                <span
                  aria-hidden
                  className="grid h-10 w-12 shrink-0 place-items-center"
                >
                  <span
                    className={cn(
                      "rounded-[5px] border-2 border-current text-violet-600 dark:text-violet-300",
                      formatShapes[ratio],
                    )}
                  />
                </span>
                <FieldContent>
                  <FieldTitle>{tTemplates(`formatsShort.${ratio}`)}</FieldTitle>
                  <FieldDescription>
                    {tTemplates(`formatUses.${ratio}`)}
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem id={`format-${ratio}`} value={ratio} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      {pending ? (
        <Thinking label={t("starting")} />
      ) : (
        <button type="submit" className={cn(appPrimaryClassName, "w-fit")}>
          {t("submit")}
          <ArrowRightIcon
            aria-hidden
            className="transition-transform group-hover/cta:translate-x-0.5"
          />
        </button>
      )}
      <CreativeError error={state?.error ?? null} />
    </form>
  );
}
