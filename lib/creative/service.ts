import { and, count, desc, eq, gt, sql } from "drizzle-orm";

import {
  type CreativeSession,
  creativeSessions,
  type CreativeSessionStatus,
  textUsage,
} from "@/db/schema";
import type { Database } from "@/db/types";
import type { Locale } from "@/i18n/config";
import { moderateText } from "@/lib/moderation";
import type { Country, Industry } from "@/lib/onboarding/options";
import type { AspectRatio } from "@/lib/providers/generation-provider";
import type { TextProvider, TextRequest } from "@/lib/providers/text";
import type { TranscriptionProvider } from "@/lib/providers/transcription";
import type { SeasonId } from "@/lib/seasons";

import { brandCharacters } from "./brand";
import type { BusinessContext } from "./context";
import {
  MAX_BRIEF_FIELD,
  MAX_BRIEF_ITEM,
  MAX_BRIEF_ITEMS,
  MAX_FREE_TEXT,
  MAX_QUESTIONS,
  MAX_VOICE_BYTES,
  MAX_VOICE_SECONDS,
  voiceMimeTypes,
} from "./limits";
import type { CreativeBrief, Featuring, QualityTier } from "./schemas";
import { conversationRequest } from "./tasks/conversation";
import { ideasRequest } from "./tasks/ideas";
import { scriptRequest } from "./tasks/script";
import { tierSettings } from "./tiers";
import type {
  ConversationTurn,
  CreativeIdeas,
  CreativeScript,
  TurnAnswer,
} from "./types";

// El director creativo (docs/director-creativo.md): conversación guiada,
// brief, nivel de calidad, 3 ideas, guion por tomas y prompts. Cada pedido al
// proveedor de texto queda en `text_usage` con su costo. Las pantallas están
// en `app/[locale]/(pyme)/director`; la imagen de prueba y el video llegan en
// el paso 3.

/** Pedidos de texto por organización y hora, para frenar abusos. */
export const TEXT_RATE_LIMIT = { maxRequests: 120, windowSeconds: 3600 };

export type CreativeContext = {
  organization: {
    id: string;
    name: string;
    industry: Industry;
    country: Country;
  };
  user: { id: string };
};

export type CreativeDeps = { text: TextProvider };

export type CreativeErrorCode =
  | "notFound"
  | "invalidState"
  | "invalidAnswer"
  | "invalidAudio"
  | "moderation"
  | "rateLimited"
  | "conflict"
  | "providerFailed";

export class CreativeFlowError extends Error {
  constructor(
    readonly code: CreativeErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

export type AnswerInput =
  | { kind: "option"; optionIndex: number }
  | { kind: "text"; text: string }
  | { kind: "decide" }
  | { kind: "skip" };

/** Crea la sesión y hace la primera pregunta. */
export async function startCreativeSession(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  input: { locale: Locale; seasonId?: SeasonId; aspectRatio?: AspectRatio },
): Promise<CreativeSession> {
  const [session] = await db
    .insert(creativeSessions)
    .values({
      organizationId: context.organization.id,
      createdBy: context.user.id,
      locale: input.locale,
      seasonId: input.seasonId ?? null,
      aspectRatio: input.aspectRatio ?? "9:16",
    })
    .returning();
  if (!session) throw new Error("No se pudo crear la sesión creativa.");
  return askNext(db, deps, context, session);
}

/** Guarda la respuesta a la última pregunta y pide la siguiente (o el brief). */
export async function answerCreativeTurn(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  sessionId: string,
  input: AnswerInput,
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["conversation"]);
  const current = session.turns.at(-1);
  if (!current || current.answer) {
    throw new CreativeFlowError("invalidState", "No hay pregunta pendiente.");
  }

  const answer = toAnswer(current, input);
  const turns = [...session.turns.slice(0, -1), { ...current, answer }];
  const [updated] = await db
    .update(creativeSessions)
    .set({ turns })
    .where(
      and(
        eq(creativeSessions.id, session.id),
        sql`jsonb_array_length(${creativeSessions.turns}) = ${session.turns.length}`,
        sql`${creativeSessions.turns} -> -1 -> 'answer' = 'null'::jsonb`,
      ),
    )
    .returning();
  if (!updated) {
    throw new CreativeFlowError(
      "conflict",
      "La sesión cambió mientras se respondía.",
    );
  }
  return askNext(db, deps, context, updated);
}

/**
 * Retoma la conversación si quedó sin pregunta pendiente (por ejemplo, si el
 * proveedor de texto falló justo después de una respuesta).
 */
export async function resumeCreativeConversation(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  sessionId: string,
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["conversation"]);
  const current = session.turns.at(-1);
  if (current && !current.answer) return session;
  return askNext(db, deps, context, session);
}

/** "Otras respuestas": la misma pregunta pendiente con opciones nuevas. */
export async function refreshTurnOptions(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  sessionId: string,
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["conversation"]);
  const current = session.turns.at(-1);
  if (!current || current.answer) {
    throw new CreativeFlowError("invalidState", "No hay pregunta pendiente.");
  }
  const output = await runTask(
    db,
    deps,
    context,
    session.id,
    conversationRequest(businessContext(context, session), session.turns, {
      alternatives: true,
    }),
  );
  if (output.options.length < 2) {
    throw new CreativeFlowError(
      "providerFailed",
      "El director creativo no propuso otras respuestas.",
    );
  }
  const turns = [
    ...session.turns.slice(0, -1),
    { ...current, options: output.options },
  ];
  const [updated] = await db
    .update(creativeSessions)
    .set({ turns })
    .where(
      and(
        eq(creativeSessions.id, session.id),
        sql`jsonb_array_length(${creativeSessions.turns}) = ${session.turns.length}`,
        sql`${creativeSessions.turns} -> -1 -> 'answer' = 'null'::jsonb`,
      ),
    )
    .returning();
  if (!updated) {
    throw new CreativeFlowError(
      "conflict",
      "La sesión cambió mientras se pedían otras respuestas.",
    );
  }
  return updated;
}

/**
 * El dueño elige qué tan pro quiere el anuncio y quién sale (null: decide el
 * director creativo). Se puede cambiar antes del guion.
 */
export async function setCreativeSettings(
  db: Database,
  context: CreativeContext,
  sessionId: string,
  settings: { tier: QualityTier; featuring: Featuring | null },
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["briefed", "ideas"]);
  if (
    settings.featuring === "brandCharacter" &&
    brandCharacters(requireBrief(session)).length === 0
  ) {
    throw new CreativeFlowError(
      "invalidAnswer",
      "La marca no tiene un personaje para el anuncio.",
    );
  }
  return updateSession(db, session, {
    tier: settings.tier,
    featuring: settings.featuring,
  });
}

/** Lo que el dueño puede corregir a mano en "Esto entendí". */
export type BriefEdit = {
  objective: string;
  product: string;
  audience: string;
  differentiator: string;
  offer: string;
  tone: string;
  mustInclude: string[];
  avoid: string[];
  /** Índices de los elementos de la marca que se quedan. */
  keepBrandElements: number[];
};

/** Corrige a mano el brief antes de pedir las ideas. */
export async function updateCreativeBrief(
  db: Database,
  context: CreativeContext,
  sessionId: string,
  edit: BriefEdit,
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["briefed"]);
  const current = requireBrief(session);

  const required = (value: string) => {
    const clean = value.trim();
    if (!clean || clean.length > MAX_BRIEF_FIELD) {
      throw new CreativeFlowError("invalidAnswer", "Campo vacío o muy largo.");
    }
    return clean;
  };
  const optional = (value: string) => {
    const clean = value.trim();
    if (clean.length > MAX_BRIEF_FIELD) {
      throw new CreativeFlowError("invalidAnswer", "Campo muy largo.");
    }
    return clean || null;
  };
  const list = (items: string[]) => {
    const clean = items.map((item) => item.trim()).filter(Boolean);
    if (
      clean.length > MAX_BRIEF_ITEMS ||
      clean.some((item) => item.length > MAX_BRIEF_ITEM)
    ) {
      throw new CreativeFlowError("invalidAnswer", "Lista muy larga.");
    }
    return clean;
  };

  const brief: CreativeBrief = {
    objective: required(edit.objective),
    product: required(edit.product),
    audience: optional(edit.audience),
    differentiator: optional(edit.differentiator),
    offer: optional(edit.offer),
    tone: optional(edit.tone),
    brandElements: current.brandElements.filter((_, index) =>
      edit.keepBrandElements.includes(index),
    ),
    mustInclude: list(edit.mustInclude),
    avoid: list(edit.avoid),
  };
  const texts = [
    brief.objective,
    brief.product,
    brief.audience,
    brief.differentiator,
    brief.offer,
    brief.tone,
    ...brief.mustInclude,
    ...brief.avoid,
  ].filter((text): text is string => Boolean(text));
  if (!moderateText(texts).allowed) {
    throw new CreativeFlowError(
      "moderation",
      "El texto no pasó la moderación.",
    );
  }
  // Sin el personaje en la marca, "¿Quién sale?" vuelve a decidirlo el director.
  const featuring =
    session.featuring === "brandCharacter" &&
    brandCharacters(brief).length === 0
      ? null
      : session.featuring;
  return updateSession(db, session, { brief, featuring });
}

/** Insight y 3 ideas. Volver a llamarla pide 3 ideas distintas. */
export async function generateCreativeIdeas(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  sessionId: string,
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["briefed", "ideas"]);
  return writeIdeas(db, deps, context, session, {
    rejectedInsights: session.ideas?.rejectedInsights ?? [],
  });
}

/**
 * El dueño confirma el insight con un toque, o dice que no es del todo así y
 * el director propone otro, con 3 ideas nuevas.
 */
export async function answerCreativeInsight(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  sessionId: string,
  agrees: boolean,
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["ideas"]);
  const ideas = session.ideas;
  if (!ideas) throw new CreativeFlowError("invalidState", "No hay ideas.");
  if (agrees) {
    return updateSession(db, session, {
      ideas: { ...ideas, insightConfirmed: true },
    });
  }
  return writeIdeas(db, deps, context, session, {
    rejectedInsights: [...(ideas.rejectedInsights ?? []), ideas.insight],
  });
}

/** Elige una de las 3 ideas y escribe su guion con los prompts. */
export async function chooseCreativeIdea(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  sessionId: string,
  index: number,
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["ideas", "scripted"]);
  const idea = session.ideas?.ideas[index];
  if (!idea || !session.tier) {
    throw new CreativeFlowError("invalidAnswer", "Idea inexistente.");
  }
  const script = await writeScript(db, deps, context, session, idea, null);
  return updateSession(db, session, {
    status: "scripted",
    chosenIdea: index,
    script,
  });
}

/** Aplica al guion un cambio pedido por el dueño ("que el gato sea atigrado"). */
export async function reviseCreativeScript(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  sessionId: string,
  request: string,
): Promise<CreativeSession> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["scripted"]);
  const change = cleanFreeText(request);
  const idea =
    session.chosenIdea === null
      ? undefined
      : session.ideas?.ideas[session.chosenIdea];
  if (!idea || !session.script) {
    throw new CreativeFlowError("invalidState", "No hay guion para revisar.");
  }
  const script = await writeScript(db, deps, context, session, idea, change);
  return updateSession(db, session, { script });
}

/**
 * Transcribe una nota de voz del dueño para responder una pregunta o pedir un
 * cambio al guion. Devuelve el texto para que lo revise antes de enviarlo; el
 * costo queda en `text_usage` como tarea `voice_note`.
 */
export async function transcribeVoiceNote(
  db: Database,
  deps: { transcription: TranscriptionProvider },
  context: CreativeContext,
  sessionId: string,
  input: { audio: Blob; durationSeconds: number },
): Promise<string> {
  const session = await getCreativeSession(db, context, sessionId);
  assertStatus(session, ["conversation", "scripted"]);
  const mimeType = input.audio.type.split(";")[0]?.trim() ?? "";
  const extension = voiceMimeTypes[mimeType as keyof typeof voiceMimeTypes];
  if (
    !extension ||
    input.audio.size === 0 ||
    input.audio.size > MAX_VOICE_BYTES
  ) {
    throw new CreativeFlowError("invalidAudio", "Nota de voz inválida.");
  }
  await assertWithinRateLimit(db, context);

  const question =
    session.status === "conversation" ? session.turns.at(-1)?.question : null;
  let result;
  try {
    result = await deps.transcription.transcribe({
      audio: input.audio,
      filename: `nota.${extension}`,
      durationSeconds: Math.min(
        Math.max(Math.ceil(input.durationSeconds), 1),
        MAX_VOICE_SECONDS,
      ),
      context: question
        ? `${context.organization.name} answers: "${question}"`
        : `${context.organization.name} asks for a change to an ad script.`,
    });
  } catch (error) {
    throw new CreativeFlowError(
      "providerFailed",
      "No se pudo transcribir la nota de voz.",
      { cause: error },
    );
  }
  await db.insert(textUsage).values({
    organizationId: context.organization.id,
    sessionId: session.id,
    provider: deps.transcription.id,
    model: result.model,
    task: "voice_note",
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    costMicroUsd: result.costMicroUsd,
  });
  const text = result.text.trim();
  if (!text) {
    throw new CreativeFlowError("invalidAudio", "La nota de voz está vacía.");
  }
  return text.length > MAX_FREE_TEXT
    ? text.slice(0, MAX_FREE_TEXT).replace(/\s+\S*$/, "")
    : text;
}

/** Sesión de la organización, o error `notFound` si es de otra o no existe. */
export async function getCreativeSession(
  db: Database,
  context: CreativeContext,
  sessionId: string,
): Promise<CreativeSession> {
  const [session] = await db
    .select()
    .from(creativeSessions)
    .where(
      and(
        eq(creativeSessions.id, sessionId),
        eq(creativeSessions.organizationId, context.organization.id),
      ),
    );
  if (!session) {
    throw new CreativeFlowError("notFound", "Sesión creativa inexistente.");
  }
  return session;
}

/** Resumen de una sesión para retomarla desde el inicio del director. */
export type CreativeSessionSummary = {
  id: string;
  status: CreativeSessionStatus;
  /** Título del guion o, si todavía no hay, el producto del brief. */
  title: string | null;
  updatedAt: Date;
};

/** Últimas sesiones de la organización, de la más reciente a la más antigua. */
export async function listCreativeSessions(
  db: Database,
  context: CreativeContext,
  options: { limit: number },
): Promise<CreativeSessionSummary[]> {
  const rows = await db
    .select({
      id: creativeSessions.id,
      status: creativeSessions.status,
      scriptTitle: sql<string | null>`${creativeSessions.script} ->> 'title'`,
      product: sql<string | null>`${creativeSessions.brief} ->> 'product'`,
      updatedAt: creativeSessions.updatedAt,
    })
    .from(creativeSessions)
    .where(eq(creativeSessions.organizationId, context.organization.id))
    .orderBy(desc(creativeSessions.updatedAt), desc(creativeSessions.id))
    .limit(options.limit);
  return rows.map(({ scriptTitle, product, ...row }) => ({
    ...row,
    title: scriptTitle ?? product,
  }));
}

/** Costo de texto acumulado de una sesión (la "preparación" del precio). */
export async function sessionTextCostMicroUsd(
  db: Database,
  sessionId: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${textUsage.costMicroUsd}), 0)`,
    })
    .from(textUsage)
    .where(eq(textUsage.sessionId, sessionId));
  return Number(row?.total ?? 0);
}

// --- Internos ---------------------------------------------------------------

async function askNext(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  session: CreativeSession,
): Promise<CreativeSession> {
  const output = await runTask(
    db,
    deps,
    context,
    session.id,
    conversationRequest(businessContext(context, session), session.turns),
  );
  const asked = session.turns.length;

  if (output.status === "ready" || asked >= MAX_QUESTIONS) {
    if (!output.brief) {
      throw new CreativeFlowError(
        "providerFailed",
        "El director creativo terminó la conversación sin brief.",
      );
    }
    return updateSession(db, session, {
      status: "briefed",
      brief: output.brief,
    });
  }

  if (!output.question.trim() || output.options.length < 2) {
    throw new CreativeFlowError(
      "providerFailed",
      "El director creativo devolvió una pregunta sin opciones.",
    );
  }
  const turn: ConversationTurn = {
    topic: output.topic,
    question: output.question.trim(),
    options: output.options,
    answer: null,
  };
  return updateSession(db, session, { turns: [...session.turns, turn] });
}

async function writeIdeas(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  session: CreativeSession,
  options: { rejectedInsights: string[] },
): Promise<CreativeSession> {
  const brief = requireBrief(session);
  if (!session.tier) {
    throw new CreativeFlowError("invalidState", "Falta elegir el nivel.");
  }
  const previousTitles = session.ideas
    ? [
        ...session.ideas.previousTitles,
        ...session.ideas.ideas.map((idea) => idea.title),
      ]
    : [];
  const output = await runTask(
    db,
    deps,
    context,
    session.id,
    ideasRequest({
      business: businessContext(context, session),
      brief,
      tier: session.tier,
      featuring: session.featuring,
      previousTitles,
      rejectedInsights: options.rejectedInsights,
    }),
  );
  const ideas: CreativeIdeas = {
    ...output,
    round: (session.ideas?.round ?? 0) + 1,
    previousTitles,
    insightConfirmed: false,
    rejectedInsights: options.rejectedInsights,
  };
  return updateSession(db, session, {
    status: "ideas",
    ideas,
    chosenIdea: null,
  });
}

async function writeScript(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  session: CreativeSession,
  idea: NonNullable<CreativeSession["ideas"]>["ideas"][number],
  change: string | null,
): Promise<CreativeScript> {
  const tier = session.tier;
  if (!tier) throw new CreativeFlowError("invalidState", "Falta el nivel.");
  const durationSeconds = tierSettings[tier].durationSeconds;
  const output = await runTask(
    db,
    deps,
    context,
    session.id,
    scriptRequest({
      business: businessContext(context, session),
      brief: requireBrief(session),
      idea,
      tier,
      featuring: session.featuring,
      aspectRatio: session.aspectRatio,
      revision:
        change && session.script
          ? { script: session.script, request: change }
          : null,
    }),
  );
  return {
    ...output,
    shots: normalizeShots(output.shots, durationSeconds),
    durationSeconds,
    aspectRatio: session.aspectRatio,
    revisions: change
      ? [...(session.script?.revisions ?? []), change]
      : (session.script?.revisions ?? []),
  };
}

/**
 * Deja las tomas en orden, seguidas y dentro de la duración: la primera
 * empieza en 0 y la última termina al final, aunque el modelo se desvíe.
 */
export function normalizeShots(
  shots: CreativeScript["shots"],
  durationSeconds: number,
): CreativeScript["shots"] {
  const sorted = [...shots].sort((a, b) => a.startSecond - b.startSecond);
  let cursor = 0;
  return sorted.map((shot, index) => {
    const isLast = index === sorted.length - 1;
    const remaining = sorted.length - index - 1;
    const start = cursor;
    const end = isLast
      ? durationSeconds
      : Math.min(
          Math.max(shot.endSecond, start + 1),
          durationSeconds - remaining,
        );
    cursor = end;
    return { ...shot, startSecond: start, endSecond: end };
  });
}

/** Pide al proveedor de texto, con límite de uso, y registra el costo. */
async function runTask<T>(
  db: Database,
  deps: CreativeDeps,
  context: CreativeContext,
  sessionId: string,
  request: TextRequest<T>,
): Promise<T> {
  await assertWithinRateLimit(db, context);

  let result;
  try {
    result = await deps.text.generate(request);
  } catch (error) {
    throw new CreativeFlowError(
      "providerFailed",
      `El director creativo no respondió (${request.task}).`,
      { cause: error },
    );
  }

  await db.insert(textUsage).values({
    organizationId: context.organization.id,
    sessionId,
    provider: deps.text.id,
    model: result.model,
    task: request.task,
    inputTokens: result.usage.inputTokens,
    cachedInputTokens: result.usage.cachedInputTokens,
    outputTokens: result.usage.outputTokens,
    costMicroUsd: result.usage.costMicroUsd,
  });
  return result.output;
}

/** Límite de pedidos de texto (y notas de voz) por organización y hora. */
async function assertWithinRateLimit(
  db: Database,
  context: CreativeContext,
): Promise<void> {
  const [recent] = await db
    .select({ requests: count() })
    .from(textUsage)
    .where(
      and(
        eq(textUsage.organizationId, context.organization.id),
        gt(
          textUsage.createdAt,
          sql`now() - make_interval(secs => ${TEXT_RATE_LIMIT.windowSeconds})`,
        ),
      ),
    );
  if ((recent?.requests ?? 0) >= TEXT_RATE_LIMIT.maxRequests) {
    throw new CreativeFlowError(
      "rateLimited",
      "Límite de pedidos de texto alcanzado.",
    );
  }
}

async function updateSession(
  db: Database,
  session: CreativeSession,
  values: Partial<
    Pick<
      CreativeSession,
      | "status"
      | "tier"
      | "featuring"
      | "turns"
      | "brief"
      | "ideas"
      | "chosenIdea"
      | "script"
    >
  >,
): Promise<CreativeSession> {
  const [updated] = await db
    .update(creativeSessions)
    .set(values)
    .where(eq(creativeSessions.id, session.id))
    .returning();
  if (!updated) {
    throw new CreativeFlowError("notFound", "Sesión creativa inexistente.");
  }
  return updated;
}

function businessContext(
  context: CreativeContext,
  session: CreativeSession,
): BusinessContext {
  return {
    name: context.organization.name,
    industry: context.organization.industry,
    country: context.organization.country,
    locale: session.locale,
    seasonId: session.seasonId,
  };
}

function assertStatus(
  session: CreativeSession,
  allowed: readonly CreativeSessionStatus[],
): void {
  if (!allowed.includes(session.status)) {
    throw new CreativeFlowError(
      "invalidState",
      `La sesión está en "${session.status}".`,
    );
  }
}

function requireBrief(session: CreativeSession): CreativeBrief {
  if (!session.brief) {
    throw new CreativeFlowError("invalidState", "Falta el brief.");
  }
  return session.brief;
}

function toAnswer(turn: ConversationTurn, input: AnswerInput): TurnAnswer {
  switch (input.kind) {
    case "option": {
      const option = turn.options[input.optionIndex];
      if (!option) {
        throw new CreativeFlowError("invalidAnswer", "Opción inexistente.");
      }
      return {
        kind: "option",
        optionIndex: input.optionIndex,
        text: option.label,
      };
    }
    case "text":
      return { kind: "text", text: cleanFreeText(input.text) };
    case "decide":
    case "skip":
      return { kind: input.kind };
  }
}

/** Texto libre del dueño: recortado, con largo máximo y moderado. */
function cleanFreeText(text: string): string {
  const clean = text.trim();
  if (!clean || clean.length > MAX_FREE_TEXT) {
    throw new CreativeFlowError("invalidAnswer", "Texto vacío o muy largo.");
  }
  if (!moderateText([clean]).allowed) {
    throw new CreativeFlowError(
      "moderation",
      "El texto no pasó la moderación.",
    );
  }
  return clean;
}
