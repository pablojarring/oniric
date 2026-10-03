import type { AspectRatio } from "@/lib/providers/generation-provider";

import type {
  CreativeIdeasOutput,
  CreativeScriptOutput,
  TurnOption,
  TurnTopic,
} from "./schemas";

// Lo que se guarda en `creative_sessions` (db/schema.ts).

/** Respuesta del dueño a una pregunta. */
export type TurnAnswer =
  | { kind: "option"; optionIndex: number; text: string }
  | { kind: "text"; text: string }
  /** "No sé, decide tú". */
  | { kind: "decide" }
  | { kind: "skip" };

export type ConversationTurn = {
  topic: TurnTopic;
  question: string;
  options: TurnOption[];
  answer: TurnAnswer | null;
};

export type CreativeIdeas = CreativeIdeasOutput & {
  /** Cuántas veces se pidieron ideas (1 = la primera tanda). */
  round: number;
  /** Títulos de tandas anteriores, para no repetirlos. */
  previousTitles: string[];
  /** El dueño confirmó el insight con un toque. */
  insightConfirmed?: boolean;
  /** Insights que el dueño dijo que no son del todo ciertos. */
  rejectedInsights?: string[];
};

export type CreativeScript = CreativeScriptOutput & {
  durationSeconds: number;
  aspectRatio: AspectRatio;
  /** Cambios que pidió el dueño, en orden. */
  revisions: string[];
};
