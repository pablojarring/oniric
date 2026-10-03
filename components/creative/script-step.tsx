"use client";

import { cn } from "cn";
import {
  ChevronDownIcon,
  ImageIcon,
  MegaphoneIcon,
  MusicIcon,
  PencilIcon,
  TypeIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { appCardClassName, appSecondaryClassName } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  chooseCreativeIdeaAction,
  reviseCreativeScriptAction,
} from "@/lib/creative/actions";
import { MAX_FREE_TEXT } from "@/lib/creative/limits";
import type { PromptParts } from "@/lib/creative/schemas";

import { CreativeError } from "./creative-error";
import { IdeaCards, InsightCard } from "./ideas-step";
import type { CreativeSessionData } from "./session-data";
import { Thinking } from "./thinking";
import { useCreativeAction } from "./use-creative-action";
import { VoiceNoteButton } from "./voice-note-button";

const promptPartKeys: readonly (keyof PromptParts)[] = [
  "subject",
  "action",
  "environment",
  "camera",
  "lighting",
  "style",
  "sound",
  "constraints",
];

/**
 * El guion de la idea elegida, toma por toma, con lo que se le pide a la IA
 * ("Para curiosos"). Se puede pedir un cambio (escrito o con una nota de voz)
 * o elegir otra idea.
 */
export function ScriptStep({ session }: { session: CreativeSessionData }) {
  const t = useTranslations("Director.script");
  const tTiers = useTranslations("Director.tiers");
  const revise = useCreativeAction();
  const choose = useCreativeAction();
  const [change, setChange] = useState("");
  const [showIdeas, setShowIdeas] = useState(false);
  const [choosing, setChoosing] = useState<number | null>(null);
  const script = session.script;
  if (!script || !session.tier) return null;
  const pending = revise.pending || choose.pending;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex flex-col gap-6">
        <section
          aria-labelledby="script-title"
          className={cn(appCardClassName, "flex flex-col gap-5 p-5 sm:p-8")}
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5 text-xs font-medium">
              <span className="rounded-full bg-muted px-2.5 py-0.5">
                {tTiers(`${session.tier}.name`)}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5">
                {t("duration", { seconds: script.durationSeconds })}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5">
                {script.aspectRatio}
              </span>
            </div>
            <h2
              id="script-title"
              className="font-heading text-2xl font-bold tracking-tight text-balance"
            >
              {script.title}
            </h2>
          </div>

          <ol className="flex flex-col gap-4" data-testid="director-shots">
            {script.shots.map((shot, index) => (
              <li key={index} className="flex gap-4">
                <span className="w-16 shrink-0 pt-0.5 text-xs font-semibold text-violet-700 tabular-nums dark:text-violet-300">
                  {t("shotTime", {
                    start: shot.startSecond,
                    end: shot.endSecond,
                  })}
                </span>
                <div className="flex min-w-0 flex-col gap-1.5 border-l pl-4">
                  <p className="font-semibold">{shot.label}</p>
                  <p className="text-sm text-pretty">{shot.action}</p>
                  <ShotDetail icon={VideoIcon} label={t("camera")}>
                    {shot.camera}
                  </ShotDetail>
                  <ShotDetail icon={MusicIcon} label={t("sound")}>
                    {shot.sound}
                  </ShotDetail>
                  {shot.onScreenText && (
                    <ShotDetail icon={TypeIcon} label={t("onScreenText")}>
                      {shot.onScreenText}
                    </ShotDetail>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <p className="flex items-start gap-2 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
            <MegaphoneIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-violet-700 dark:text-violet-300"
            />
            <span>
              <span className="font-semibold">{t("callToAction")} </span>
              {script.callToAction}
            </span>
          </p>

          <details className="group rounded-2xl border px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
              {t("curious.title")}
              <ChevronDownIcon
                aria-hidden
                className="size-4 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("curious.description")}
            </p>
            <dl className="mt-3 grid gap-3 text-sm">
              {promptPartKeys.map((key) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t(`curious.parts.${key}`)}
                  </dt>
                  <dd lang="en" className="text-pretty">
                    {script.promptParts[key]}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const request = change.trim();
            if (!request) return;
            revise.run(
              () => reviseCreativeScriptAction(session.id, request),
              () => setChange(""),
            );
          }}
          className={cn(appCardClassName, "flex flex-col gap-4 p-5 sm:p-6")}
        >
          <Field>
            <FieldLabel htmlFor="script-change">{t("revise.label")}</FieldLabel>
            <Textarea
              id="script-change"
              maxLength={MAX_FREE_TEXT}
              placeholder={t("revise.placeholder")}
              value={change}
              onChange={(event) => setChange(event.target.value)}
              disabled={pending}
              className="min-h-20 rounded-xl"
            />
            {script.revisions.length > 0 && (
              <FieldDescription>
                {t("revise.previous", { count: script.revisions.length })}
              </FieldDescription>
            )}
          </Field>
          {revise.pending ? (
            <Thinking label={t("revise.thinking")} />
          ) : (
            <div className="flex flex-wrap items-start gap-2">
              <Button
                type="submit"
                disabled={pending || !change.trim()}
                className="h-10 w-fit rounded-full px-5"
              >
                <PencilIcon aria-hidden />
                {t("revise.submit")}
              </Button>
              <VoiceNoteButton
                sessionId={session.id}
                disabled={pending}
                onTranscript={(text) => setChange(text)}
              />
            </div>
          )}
          <CreativeError error={revise.error} />
        </form>

        {session.ideas && (
          <section className="flex flex-col gap-4">
            <button
              type="button"
              aria-expanded={showIdeas}
              onClick={() => setShowIdeas((value) => !value)}
              className={cn(appSecondaryClassName, "w-fit")}
            >
              {showIdeas ? t("hideIdeas") : t("otherIdea")}
            </button>
            {showIdeas && (
              <>
                <InsightCard insight={session.ideas.insight} />
                <IdeaCards
                  ideas={session.ideas.ideas}
                  disabled={pending}
                  choosing={choose.pending ? choosing : null}
                  chosen={session.chosenIdea}
                  onChoose={(index) => {
                    setChoosing(index);
                    choose.run(
                      () => chooseCreativeIdeaAction(session.id, index),
                      () => setShowIdeas(false),
                    );
                  }}
                />
                <CreativeError error={choose.error} />
              </>
            )}
          </section>
        )}
      </div>

      <aside
        className={cn(
          appCardClassName,
          "flex flex-col gap-3 border-dashed p-5",
        )}
      >
        <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          <ImageIcon aria-hidden className="size-5" />
        </span>
        <h2 className="font-heading text-lg font-semibold">
          {t("next.title")}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {t("next.description")}
        </p>
        <span className="w-fit rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
          {t("next.soon")}
        </span>
      </aside>
    </div>
  );
}

function ShotDetail({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Icon aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>
        <span className="sr-only">{label}: </span>
        {children}
      </span>
    </p>
  );
}
