"use client";

import { cn } from "cn";
import {
  RotateCcwIcon,
  SendIcon,
  SkipForwardIcon,
  SparklesIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useState } from "react";

import { appCardClassName, appPrimaryClassName } from "@/components/app/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  answerCreativeTurnAction,
  resumeCreativeConversationAction,
} from "@/lib/creative/actions";
import { MAX_FREE_TEXT } from "@/lib/creative/limits";
import type { AnswerInput } from "@/lib/creative/service";
import type { TurnAnswer } from "@/lib/creative/types";

import { CreativeError } from "./creative-error";
import type { CreativeSessionData } from "./session-data";
import { Thinking } from "./thinking";
import { useCreativeAction } from "./use-creative-action";

/**
 * Conversación guiada: una pregunta a la vez, con respuestas de un toque,
 * texto propio, "No sé, decide tú" o "Saltar". Las respuestas anteriores
 * quedan arriba, como en un chat.
 */
export function ConversationStep({
  session,
  maxQuestions,
}: {
  session: CreativeSessionData;
  maxQuestions: number;
}) {
  const t = useTranslations("Director.conversation");
  const { pending, error, run } = useCreativeAction();
  const [draft, setDraft] = useState("");
  // La respuesta que se está enviando, para mostrarla mientras llega la
  // siguiente pregunta.
  const [sending, setSending] = useOptimistic<string | null>(null);

  const last = session.turns.at(-1);
  const question = last && !last.answer ? last : null;
  const answered = question ? session.turns.slice(0, -1) : session.turns;

  function answer(input: AnswerInput, label: string) {
    run(
      async () => {
        setSending(label);
        return answerCreativeTurnAction(session.id, input);
      },
      () => setDraft(""),
    );
  }

  function answerLabel(value: TurnAnswer): string {
    switch (value.kind) {
      case "option":
      case "text":
        return value.text;
      case "decide":
        return t("decided");
      case "skip":
        return t("skipped");
    }
  }

  return (
    <div className={cn(appCardClassName, "flex flex-col gap-6 p-5 sm:p-8")}>
      {answered.length > 0 && (
        <ol aria-label={t("history")} className="flex flex-col gap-3">
          {answered.map((turn, index) => (
            <li key={index} className="flex flex-col gap-2">
              <DirectorBubble>{turn.question}</DirectorBubble>
              {turn.answer && (
                <OwnerBubble>{answerLabel(turn.answer)}</OwnerBubble>
              )}
            </li>
          ))}
        </ol>
      )}

      {question && (
        <div className="flex flex-col gap-4" data-testid="director-question">
          <p className="text-xs font-medium text-muted-foreground">
            {t("progress", {
              current: session.turns.length,
              max: maxQuestions,
            })}
          </p>
          <DirectorBubble highlight>
            <h2 className="font-heading text-lg font-semibold text-balance sm:text-xl">
              {question.question}
            </h2>
          </DirectorBubble>

          {pending ? (
            <>
              {sending && <OwnerBubble>{sending}</OwnerBubble>}
              <Thinking label={t("thinking")} />
            </>
          ) : (
            <>
              <div
                role="group"
                aria-label={t("options")}
                className="grid gap-2 sm:grid-cols-2"
              >
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      answer(
                        { kind: "option", optionIndex: index },
                        option.label,
                      )
                    }
                    className="flex flex-col items-start gap-0.5 rounded-2xl border bg-background px-4 py-3 text-left transition-[border-color,box-shadow] outline-none hover:border-violet-400 hover:shadow-md hover:shadow-violet-500/10 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="text-sm font-semibold">
                      {option.label}
                    </span>
                    {option.hint && (
                      <span className="text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = draft.trim();
                  if (text) answer({ kind: "text", text }, text);
                }}
                className="flex gap-2"
              >
                <Input
                  aria-label={t("ownAnswer")}
                  placeholder={t("ownAnswerPlaceholder")}
                  maxLength={MAX_FREE_TEXT}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="h-11 rounded-xl"
                />
                <Button
                  type="submit"
                  disabled={!draft.trim()}
                  className="h-11 rounded-xl px-4"
                >
                  <SendIcon aria-hidden />
                  {t("send")}
                </Button>
              </form>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => answer({ kind: "decide" }, t("decided"))}
                >
                  <WandSparklesIcon aria-hidden />
                  {t("decide")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => answer({ kind: "skip" }, t("skipped"))}
                >
                  <SkipForwardIcon aria-hidden />
                  {t("skip")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sin pregunta pendiente: el proveedor falló después de guardar la
          última respuesta, y se puede pedir de nuevo. */}
      {!question &&
        (pending ? (
          <Thinking label={t("thinking")} />
        ) : (
          <Alert>
            <SparklesIcon aria-hidden />
            <AlertDescription className="flex flex-col items-start gap-3">
              {t("interrupted")}
              <button
                type="button"
                onClick={() =>
                  run(() => resumeCreativeConversationAction(session.id))
                }
                className={appPrimaryClassName}
              >
                <RotateCcwIcon aria-hidden />
                {t("retry")}
              </button>
            </AlertDescription>
          </Alert>
        ))}

      <CreativeError error={error} />
    </div>
  );
}

function DirectorBubble({
  children,
  highlight = false,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-brand text-white"
      >
        <SparklesIcon className="size-4" />
      </span>
      <div
        className={cn(
          "max-w-prose rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm",
          highlight
            ? "bg-violet-50 dark:bg-violet-500/10"
            : "bg-muted text-muted-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function OwnerBubble({ children }: { children: React.ReactNode }) {
  return (
    <p className="ml-auto max-w-prose rounded-2xl rounded-tr-sm bg-gradient-brand px-4 py-2.5 text-sm font-medium text-white">
      {children}
    </p>
  );
}
