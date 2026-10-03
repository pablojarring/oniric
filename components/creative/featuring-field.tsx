"use client";

import {
  BotIcon,
  HeartIcon,
  PackageIcon,
  UserRoundIcon,
  WandSparklesIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

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
import { brandCharacters } from "@/lib/creative/brand";
import type { CreativeBrief, Featuring } from "@/lib/creative/schemas";

/** "decide" es la opción sin elegir: decide el director creativo. */
export type FeaturingChoice = Featuring | "decide";

const icons: Record<FeaturingChoice, LucideIcon> = {
  decide: WandSparklesIcon,
  nobody: PackageIcon,
  brandCharacter: HeartIcon,
  owner: UserRoundIcon,
  fictional: BotIcon,
};

/**
 * "¿Quién sale?" (versión simple del tramo 1). El personaje de la marca solo
 * aparece si el brief tiene uno; "otra persona real" llega en el tramo 3.
 */
export function FeaturingField({
  brief,
  value,
  onChange,
}: {
  brief: CreativeBrief | null;
  value: FeaturingChoice;
  onChange: (value: FeaturingChoice) => void;
}) {
  const t = useTranslations("Director.featuring");
  const characters = brief ? brandCharacters(brief) : [];
  const choices: FeaturingChoice[] = [
    "decide",
    "nobody",
    ...(characters.length > 0 ? (["brandCharacter"] as const) : []),
    "owner",
    "fictional",
  ];
  const characterNames = characters.map((element) => element.name).join(", ");

  return (
    <FieldSet>
      <FieldLegend id="featuring-legend" variant="label">
        {t("title")}
      </FieldLegend>
      <RadioGroup
        name="featuring"
        value={value}
        onValueChange={(next) => onChange(next as FeaturingChoice)}
        aria-labelledby="featuring-legend"
        className="gap-2 sm:grid-cols-2"
      >
        {choices.map((choice) => {
          const Icon = icons[choice];
          return (
            <FieldLabel
              key={choice}
              htmlFor={`featuring-${choice}`}
              className="rounded-2xl! has-data-checked:border-violet-500"
            >
              <Field orientation="horizontal" className="items-center! p-3.5!">
                <Icon
                  aria-hidden
                  className="size-5 shrink-0 text-violet-700 dark:text-violet-300"
                />
                <FieldContent>
                  <FieldTitle>
                    {choice === "brandCharacter"
                      ? t("options.brandCharacter.name", {
                          names: characterNames,
                        })
                      : t(`options.${choice}.name`)}
                  </FieldTitle>
                  <FieldDescription>
                    {t(`options.${choice}.description`)}
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem id={`featuring-${choice}`} value={choice} />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>
    </FieldSet>
  );
}
