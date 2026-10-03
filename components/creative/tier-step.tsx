"use client";

import { cn } from "cn";
import {
  ClapperboardIcon,
  CrownIcon,
  LightbulbIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { appCardClassName, appPrimaryClassName } from "@/components/app/ui";
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
import { requestCreativeIdeasAction } from "@/lib/creative/actions";
import { qualityTiers, type QualityTier } from "@/lib/creative/schemas";
import { tierSettings } from "@/lib/creative/tiers";

import { BriefSummary } from "./brief-summary";
import { CreativeError } from "./creative-error";
import type { CreativeSessionData } from "./session-data";
import { Thinking } from "./thinking";
import { useCreativeAction } from "./use-creative-action";

export const tierIcons: Record<QualityTier, LucideIcon> = {
  rapido: ZapIcon,
  pro: CrownIcon,
  cine: ClapperboardIcon,
};

/** Lo que entendió el director creativo y qué tan pro quiere el anuncio. */
export function TierStep({ session }: { session: CreativeSessionData }) {
  const t = useTranslations("Director.tier");
  const tTiers = useTranslations("Director.tiers");
  const { pending, error, run } = useCreativeAction();
  const [tier, setTier] = useState<QualityTier>(session.tier ?? "pro");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className={cn(appCardClassName, "flex flex-col gap-6 p-5 sm:p-8")}>
        <FieldSet>
          <FieldLegend id="tier-legend" variant="label">
            {t("title")}
          </FieldLegend>
          <FieldDescription>{t("description")}</FieldDescription>
          <RadioGroup
            name="tier"
            value={tier}
            onValueChange={(value) => setTier(value as QualityTier)}
            aria-labelledby="tier-legend"
            className="gap-3"
          >
            {qualityTiers.map((id) => {
              const Icon = tierIcons[id];
              const settings = tierSettings[id];
              return (
                <FieldLabel
                  key={id}
                  htmlFor={`tier-${id}`}
                  className="rounded-2xl! has-data-checked:border-violet-500 has-data-checked:shadow-lg has-data-checked:shadow-violet-500/15"
                >
                  <Field
                    orientation="horizontal"
                    className="items-center! p-4!"
                  >
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200"
                    >
                      <Icon className="size-5" />
                    </span>
                    <FieldContent>
                      <FieldTitle>
                        {tTiers(`${id}.name`)}
                        {id === "pro" && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                            {t("recommended")}
                          </span>
                        )}
                      </FieldTitle>
                      <FieldDescription>
                        {tTiers(`${id}.description`)}
                      </FieldDescription>
                      <FieldDescription className="font-medium text-foreground/80">
                        {t("details", {
                          seconds: settings.durationSeconds,
                          shots: settings.maxShots,
                        })}
                      </FieldDescription>
                    </FieldContent>
                    <RadioGroupItem id={`tier-${id}`} value={id} />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
        </FieldSet>

        <p className="text-sm text-muted-foreground">{t("priceLater")}</p>

        {pending ? (
          <Thinking label={t("thinking")} />
        ) : (
          <button
            type="button"
            onClick={() =>
              run(() => requestCreativeIdeasAction(session.id, tier))
            }
            className={cn(appPrimaryClassName, "w-fit")}
          >
            <LightbulbIcon aria-hidden />
            {t("submit")}
          </button>
        )}
        <CreativeError error={error} />
      </div>

      {session.brief && <BriefSummary brief={session.brief} />}
    </div>
  );
}
