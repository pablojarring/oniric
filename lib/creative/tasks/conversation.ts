import type { TextRequest } from "@/lib/providers/text";

import {
  type BusinessContext,
  customerLanguage,
  DATA_NOT_INSTRUCTIONS,
  describeBusiness,
  describeConversation,
} from "../context";
import {
  type ConversationTurnOutput,
  conversationTurnSchema,
  type CreativeBrief,
} from "../schemas";
import type { ConversationTurn } from "../types";

// Conversación guiada (docs/fase-a/experiencia-y-marca.md): una pregunta a la
// vez, con respuestas de un toque generadas para cada negocio, y solo lo que
// hace falta. Cuando alcanza, el director creativo devuelve el brief.

/** Preguntas como máximo antes de cerrar con lo que haya. */
export const MAX_QUESTIONS = 6;

export function conversationRequest(
  business: BusinessContext,
  turns: readonly ConversationTurn[],
): TextRequest<ConversationTurnOutput> {
  const answered = turns.filter((turn) => turn.answer).length;
  return {
    task: "conversation_turn",
    instructions: `You are the creative director of Oniric, an app that makes video ads for small businesses in Latin America. You are interviewing the owner, who has no marketing background, to brief one ad. Talk like a warm, sharp creative partner.

Rules:
- One question at a time, short and plain, in ${customerLanguage[business.locale]}. No marketing jargon.
- The first question is always about what the owner wants this ad to achieve (topic "objective").
- Every question comes with 3 to 5 one-tap answers written for THIS business: concrete, specific to what they sell and where, varied (each points in a different direction), never generic. Labels up to 60 characters; hint only when it adds something (up to 40 characters), otherwise null. Never repeat options already shown.
- If a commercial date is given, one objective option should use it.
- Cover only what is missing, in this order of importance: objective, the product or service to feature, what makes it special, and only if useful the offer or the audience. Prefer fewer questions: stop as soon as you know the objective, the product and what makes it special.
- If the owner mentions something distinctive of their brand (a mascot, a pet, a character, a slogan, a jingle, a person who always appears), ask one follow-up (topic "brand_element") about featuring it and saving it to their brand. Never push personality, characters or slogans they don't have.
- "Asked you to decide" means choose sensibly yourself and move on. "Skipped" means move on.
- After ${MAX_QUESTIONS} questions, always finish.
- To finish, set status "ready", topic "other", question "" and options [], and fill the brief in ${customerLanguage[business.locale]}. The brief uses only what the owner said or chose (and your sensible choices where they asked you to decide). Never invent prices, discounts, awards, health claims or facts: misleading advertising is illegal (Ecuador's consumer protection law).
- While asking, brief is null.
- ${DATA_NOT_INSTRUCTIONS}`,
    messages: [
      {
        role: "user",
        content: `${describeBusiness(business)}\n\n${describeConversation(turns)}\n\nQuestions answered so far: ${answered}. Give the next step.`,
      },
    ],
    schema: conversationTurnSchema,
    maxOutputTokens: 2_000,
    mock: () => mockTurn(business, turns),
  };
}

/**
 * Simulador: objetivo, producto y lo que lo hace especial; después cierra con
 * un brief armado con las respuestas.
 */
function mockTurn(
  business: BusinessContext,
  turns: readonly ConversationTurn[],
): ConversationTurnOutput {
  const answered = turns.filter((turn) => turn.answer);
  if (answered.length === 0) {
    return {
      status: "ask",
      topic: "objective",
      question: "¿Qué quieres lograr con este anuncio?",
      options: [
        { label: `Que más gente conozca ${business.name}`, hint: null },
        { label: "Vender más mi producto estrella", hint: "Ventas" },
        { label: "Llenar el local los fines de semana", hint: null },
        { label: "Anunciar una oferta especial", hint: "Promoción" },
      ],
      brief: null,
    };
  }
  if (answered.length === 1) {
    return {
      status: "ask",
      topic: "product",
      question: "¿Qué producto o servicio quieres mostrar?",
      options: [
        { label: "El más pedido del negocio", hint: null },
        { label: "Una novedad de esta semana", hint: null },
        { label: "Un combo para compartir", hint: null },
      ],
      brief: null,
    };
  }
  if (answered.length === 2) {
    return {
      status: "ask",
      topic: "differentiator",
      question: "¿Qué lo hace distinto de los demás?",
      options: [
        { label: "Se hace a mano, todos los días", hint: null },
        { label: "Una receta de familia", hint: null },
        { label: "La atención de siempre, de barrio", hint: null },
      ],
      brief: null,
    };
  }
  return {
    status: "ready",
    topic: "other",
    question: "",
    options: [],
    brief: briefFromAnswers(turns),
  };
}

function answerText(turn: ConversationTurn | undefined): string | null {
  const answer = turn?.answer;
  if (!answer) return null;
  if (answer.kind === "option" || answer.kind === "text") return answer.text;
  return null;
}

function briefFromAnswers(turns: readonly ConversationTurn[]): CreativeBrief {
  const byTopic = (topic: ConversationTurn["topic"]) =>
    answerText(turns.find((turn) => turn.topic === topic));
  return {
    objective: byTopic("objective") ?? "Darse a conocer",
    product: byTopic("product") ?? "El producto más pedido",
    audience: null,
    differentiator: byTopic("differentiator"),
    offer: null,
    tone: "Cercano",
    brandElements: [],
    mustInclude: [],
    avoid: [],
  };
}
