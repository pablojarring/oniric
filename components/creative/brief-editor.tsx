"use client";

import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { appCardClassName } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateCreativeBriefAction } from "@/lib/creative/actions";
import { MAX_BRIEF_FIELD } from "@/lib/creative/limits";
import type { CreativeBrief } from "@/lib/creative/schemas";

import { CreativeError } from "./creative-error";
import { useCreativeAction } from "./use-creative-action";

const textFields = [
  "objective",
  "product",
  "differentiator",
  "offer",
  "audience",
  "tone",
] as const;
type TextField = (typeof textFields)[number];

const listFields = ["mustInclude", "avoid"] as const;
type ListField = (typeof listFields)[number];

/** Corrige a mano "Esto entendí" antes de pedir las ideas. */
export function BriefEditor({
  sessionId,
  brief,
  onDone,
}: {
  sessionId: string;
  brief: CreativeBrief;
  onDone: () => void;
}) {
  const t = useTranslations("Director.brief");
  const { pending, error, run } = useCreativeAction();
  const [texts, setTexts] = useState<Record<TextField, string>>(() => ({
    objective: brief.objective,
    product: brief.product,
    differentiator: brief.differentiator ?? "",
    offer: brief.offer ?? "",
    audience: brief.audience ?? "",
    tone: brief.tone ?? "",
  }));
  const [lists, setLists] = useState<Record<ListField, string>>(() => ({
    mustInclude: brief.mustInclude.join("\n"),
    avoid: brief.avoid.join("\n"),
  }));
  const [keep, setKeep] = useState<number[]>(() =>
    brief.brandElements.map((_, index) => index),
  );

  function save() {
    run(
      () =>
        updateCreativeBriefAction(sessionId, {
          ...texts,
          mustInclude: lists.mustInclude.split("\n"),
          avoid: lists.avoid.split("\n"),
          keepBrandElements: keep,
        }),
      onDone,
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className={cn(appCardClassName, "flex flex-col gap-4 p-5")}
      data-testid="director-brief-editor"
    >
      <h2 className="font-heading text-lg font-semibold">{t("editTitle")}</h2>
      {textFields.map((field) => (
        <Field key={field}>
          <FieldLabel htmlFor={`brief-${field}`}>
            {t(`fields.${field}`)}
          </FieldLabel>
          <Input
            id={`brief-${field}`}
            maxLength={MAX_BRIEF_FIELD}
            required={field === "objective" || field === "product"}
            value={texts[field]}
            onChange={(event) =>
              setTexts((current) => ({
                ...current,
                [field]: event.target.value,
              }))
            }
            className="h-10 rounded-xl"
          />
        </Field>
      ))}
      {listFields.map((field) => (
        <Field key={field}>
          <FieldLabel htmlFor={`brief-${field}`}>
            {t(`fields.${field}`)}
          </FieldLabel>
          <Textarea
            id={`brief-${field}`}
            rows={2}
            value={lists[field]}
            onChange={(event) =>
              setLists((current) => ({
                ...current,
                [field]: event.target.value,
              }))
            }
            className="rounded-xl"
          />
          <FieldDescription>{t("onePerLine")}</FieldDescription>
        </Field>
      ))}
      {brief.brandElements.map((element, index) => (
        <Field key={index} orientation="horizontal">
          <Checkbox
            id={`brief-brand-${index}`}
            checked={keep.includes(index)}
            onCheckedChange={(checked) =>
              setKeep((current) =>
                checked
                  ? [...current, index]
                  : current.filter((value) => value !== index),
              )
            }
          />
          <FieldContent>
            <FieldLabel htmlFor={`brief-brand-${index}`}>
              <FieldTitle>
                {t("useBrandElement", { name: element.name })}
              </FieldTitle>
            </FieldLabel>
            <FieldDescription>{element.description}</FieldDescription>
          </FieldContent>
        </Field>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full px-5"
        >
          <CheckIcon aria-hidden />
          {pending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onDone}
          className="h-10 rounded-full px-4"
        >
          {t("cancel")}
        </Button>
      </div>
      <CreativeError error={error} />
    </form>
  );
}
