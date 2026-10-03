"use client";

import { cn } from "cn";
import {
  CheckIcon,
  LightbulbIcon,
  LoaderCircleIcon,
  QuoteIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { appCardClassName, appSecondaryClassName } from "@/components/app/ui";
import {
  chooseCreativeIdeaAction,
  requestCreativeIdeasAction,
} from "@/lib/creative/actions";
import type { CreativeIdea } from "@/lib/creative/schemas";

import { CreativeError } from "./creative-error";
import type { CreativeSessionData } from "./session-data";
import { Thinking } from "./thinking";
import { useCreativeAction } from "./use-creative-action";

/** El insight y las 3 ideas; se elige una o se piden otras 3. */
export function IdeasStep({ session }: { session: CreativeSessionData }) {
  const t = useTranslations("Director.ideas");
  const tTiers = useTranslations("Director.tiers");
  const { pending, error, run } = useCreativeAction();
  const [choosing, setChoosing] = useState<number | null>(null);
  const ideas = session.ideas;
  if (!ideas || !session.tier) return null;
  const tier = session.tier;

  function choose(index: number) {
    setChoosing(index);
    run(() => chooseCreativeIdeaAction(session.id, index));
  }

  function moreIdeas() {
    setChoosing(null);
    run(() => requestCreativeIdeasAction(session.id, tier));
  }

  return (
    <div className="flex flex-col gap-6">
      <InsightCard insight={ideas.insight} />

      <IdeaCards
        ideas={ideas.ideas}
        disabled={pending}
        choosing={pending ? choosing : null}
        onChoose={choose}
      />

      <div className="flex flex-wrap items-center gap-3">
        {pending && choosing === null ? (
          <Thinking label={t("thinkingMore")} />
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={moreIdeas}
            className={appSecondaryClassName}
          >
            <RotateCcwIcon aria-hidden />
            {t("more")}
          </button>
        )}
        <span className="text-sm text-muted-foreground">
          {t("tier", { tier: tTiers(`${tier}.name`) })}
        </span>
      </div>
      <CreativeError error={error} />
    </div>
  );
}

export function InsightCard({ insight }: { insight: string }) {
  const t = useTranslations("Director.ideas");
  return (
    <section
      className={cn(
        appCardClassName,
        "flex items-start gap-4 border-violet-200 bg-violet-50/60 p-5 dark:border-violet-500/30 dark:bg-violet-500/5",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white">
        <LightbulbIcon aria-hidden className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {t("insight")}
        </h2>
        <p className="text-base text-pretty" data-testid="director-insight">
          {insight}
        </p>
      </div>
    </section>
  );
}

/** Las 3 ideas, cada una con su botón para elegirla. */
export function IdeaCards({
  ideas,
  disabled,
  choosing,
  chosen,
  onChoose,
}: {
  ideas: readonly CreativeIdea[];
  disabled: boolean;
  /** La idea cuyo guion se está escribiendo. */
  choosing: number | null;
  /** La idea del guion actual, si ya hay uno. */
  chosen?: number | null;
  onChoose: (index: number) => void;
}) {
  const t = useTranslations("Director.ideas");
  return (
    <ul className="grid gap-4 lg:grid-cols-3">
      {ideas.map((idea, index) => {
        const isChosen = chosen === index;
        return (
          <li
            key={index}
            data-testid="director-idea"
            className={cn(
              appCardClassName,
              "flex flex-col gap-3 p-5",
              isChosen && "border-violet-500",
            )}
          >
            <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {t(`angles.${idea.angle}`)}
            </span>
            <h3 className="font-heading text-lg font-semibold text-balance">
              {idea.title}
            </h3>
            <p className="text-sm text-pretty">{idea.logline}</p>
            <p className="text-sm text-pretty text-muted-foreground">
              {idea.visualSummary}
            </p>
            <p className="flex gap-2 text-sm font-medium text-pretty text-violet-700 dark:text-violet-300">
              <QuoteIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {idea.closingLine}
            </p>
            <button
              type="button"
              disabled={disabled || isChosen}
              onClick={() => onChoose(index)}
              aria-label={
                choosing === index || isChosen
                  ? undefined
                  : t("chooseNamed", { title: idea.title })
              }
              className={cn(appSecondaryClassName, "mt-auto w-full")}
            >
              {choosing === index ? (
                <>
                  <LoaderCircleIcon aria-hidden className="animate-spin" />
                  {t("writing")}
                </>
              ) : isChosen ? (
                <>
                  <CheckIcon aria-hidden />
                  {t("chosen")}
                </>
              ) : (
                t("choose")
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
