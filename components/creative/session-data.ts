import type { CreativeSession } from "@/db/schema";
import type { CreativeScript } from "@/lib/creative/types";

/**
 * Lo que las pantallas necesitan de una sesión creativa. Los prompts completos
 * del video y del primer cuadro se quedan en el servidor; el cliente ve sus
 * partes en "Para curiosos".
 */
export type CreativeSessionData = Pick<
  CreativeSession,
  | "id"
  | "status"
  | "tier"
  | "aspectRatio"
  | "turns"
  | "brief"
  | "ideas"
  | "chosenIdea"
> & {
  script: Omit<CreativeScript, "videoPrompt" | "keyframePrompt"> | null;
};

export function toSessionData(session: CreativeSession): CreativeSessionData {
  const script = session.script && {
    title: session.script.title,
    shots: session.script.shots,
    callToAction: session.script.callToAction,
    promptParts: session.script.promptParts,
    durationSeconds: session.script.durationSeconds,
    aspectRatio: session.script.aspectRatio,
    revisions: session.script.revisions,
  };
  return {
    id: session.id,
    status: session.status,
    tier: session.tier,
    aspectRatio: session.aspectRatio,
    turns: session.turns,
    brief: session.brief,
    ideas: session.ideas,
    chosenIdea: session.chosenIdea,
    script,
  };
}
