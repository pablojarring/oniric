"use client";

import { ConversationStep } from "./conversation-step";
import { IdeasStep } from "./ideas-step";
import { ScriptStep } from "./script-step";
import type { CreativeSessionData } from "./session-data";
import { TierStep } from "./tier-step";

/** La pantalla de cada paso de la sesión, según su estado. */
export function CreativeSession({
  session,
  maxQuestions,
}: {
  session: CreativeSessionData;
  maxQuestions: number;
}) {
  switch (session.status) {
    case "conversation":
      return <ConversationStep session={session} maxQuestions={maxQuestions} />;
    case "briefed":
      return <TierStep session={session} />;
    case "ideas":
      return <IdeasStep session={session} />;
    case "scripted":
      return <ScriptStep session={session} />;
  }
}
