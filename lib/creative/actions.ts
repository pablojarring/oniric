"use server";

import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { getDb } from "@/db";
import type { Locale } from "@/i18n/config";
import { redirect } from "@/i18n/navigation";
import { requireOrganization } from "@/lib/auth/session";
import { aspectRatios } from "@/lib/providers/generation-provider";
import { getTextProvider } from "@/lib/providers/text";
import { getTranscriptionProvider } from "@/lib/providers/transcription";
import { isSeasonId, isSeasonInCalendar } from "@/lib/seasons";
import { hasFeature } from "@/lib/segment";

import {
  MAX_BRIEF_FIELD,
  MAX_BRIEF_ITEM,
  MAX_BRIEF_ITEMS,
  MAX_FREE_TEXT,
  MAX_VOICE_BYTES,
} from "./limits";
import { featuringOptions, qualityTiers } from "./schemas";
import {
  answerCreativeInsight,
  answerCreativeTurn,
  chooseCreativeIdea,
  type CreativeContext,
  type CreativeErrorCode,
  CreativeFlowError,
  generateCreativeIdeas,
  refreshTurnOptions,
  resumeCreativeConversation,
  reviseCreativeScript,
  setCreativeSettings,
  startCreativeSession,
  transcribeVoiceNote,
  updateCreativeBrief,
} from "./service";

// Acciones de las pantallas del director creativo (docs/director-creativo.md).
// Cada una valida lo que llega del navegador, llama al servicio y refresca la
// página, que vuelve a leer la sesión: también si falla, porque una respuesta
// puede haber quedado guardada antes de que fallara el proveedor de texto.

export type CreativeActionResult =
  { ok: true } | { ok: false; error: CreativeErrorCode };

export type StartCreativeState = { error: CreativeErrorCode } | undefined;

export type VoiceNoteResult =
  { ok: true; text: string } | { ok: false; error: CreativeErrorCode };

const sessionIdSchema = z.uuid();

/** Lo que el navegador puede mandar; el servicio valida el resto. */
const freeTextSchema = z.string().max(MAX_FREE_TEXT * 4);

const answerSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("option"),
    optionIndex: z.number().int().min(0),
  }),
  z.object({ kind: z.literal("text"), text: freeTextSchema }),
  z.object({ kind: z.literal("decide") }),
  z.object({ kind: z.literal("skip") }),
]);

const briefTextSchema = z.string().max(MAX_BRIEF_FIELD * 2);
const briefListSchema = z
  .array(z.string().max(MAX_BRIEF_ITEM * 2))
  .max(MAX_BRIEF_ITEMS * 2);
const briefEditSchema = z.object({
  objective: briefTextSchema,
  product: briefTextSchema,
  audience: briefTextSchema,
  differentiator: briefTextSchema,
  offer: briefTextSchema,
  tone: briefTextSchema,
  mustInclude: briefListSchema,
  avoid: briefListSchema,
  keepBrandElements: z.array(z.number().int().min(0)).max(10),
});

/** Empieza una sesión con la primera pregunta y lleva a su página. */
export async function startCreativeSessionAction(
  _state: StartCreativeState,
  formData: FormData,
): Promise<StartCreativeState> {
  const context = await creativeContext();
  const aspectRatio = z
    .enum(aspectRatios)
    .catch("9:16")
    .parse(formData.get("aspectRatio"));
  const season = formData.get("season");
  const seasonId =
    hasFeature(context.segment, "seasonalCalendar") &&
    isSeasonId(season) &&
    isSeasonInCalendar(context.organization.country, season)
      ? season
      : undefined;
  const locale = (await getLocale()) as Locale;

  let sessionId: string;
  try {
    const session = await startCreativeSession(
      getDb(),
      { text: getTextProvider() },
      context,
      { locale, seasonId, aspectRatio },
    );
    sessionId = session.id;
  } catch (error) {
    return { error: flowErrorCode(error) };
  }
  redirect({ href: `/director/${sessionId}`, locale });
}

/** Respuesta del dueño a la pregunta pendiente. */
export async function answerCreativeTurnAction(
  sessionId: string,
  answer: unknown,
): Promise<CreativeActionResult> {
  const input = answerSchema.safeParse(answer);
  if (!input.success) return { ok: false, error: "invalidAnswer" };
  return run(sessionId, (context, id) =>
    answerCreativeTurn(getDb(), deps(), context, id, input.data),
  );
}

/** Pide de nuevo la siguiente pregunta si el proveedor falló. */
export async function resumeCreativeConversationAction(
  sessionId: string,
): Promise<CreativeActionResult> {
  return run(sessionId, (context, id) =>
    resumeCreativeConversation(getDb(), deps(), context, id),
  );
}

/** "Otras respuestas" para la pregunta pendiente. */
export async function refreshTurnOptionsAction(
  sessionId: string,
): Promise<CreativeActionResult> {
  return run(sessionId, (context, id) =>
    refreshTurnOptions(getDb(), deps(), context, id),
  );
}

/** Corrige a mano "Esto entendí" antes de pedir las ideas. */
export async function updateCreativeBriefAction(
  sessionId: string,
  edit: unknown,
): Promise<CreativeActionResult> {
  const parsed = briefEditSchema.safeParse(edit);
  if (!parsed.success) return { ok: false, error: "invalidAnswer" };
  return run(sessionId, (context, id) =>
    updateCreativeBrief(getDb(), context, id, parsed.data),
  );
}

/** Guarda el nivel y quién sale, y pide 3 ideas (o 3 distintas si ya había). */
export async function requestCreativeIdeasAction(
  sessionId: string,
  settings: unknown,
): Promise<CreativeActionResult> {
  const parsed = z
    .object({
      tier: z.enum(qualityTiers),
      featuring: z.enum(featuringOptions).nullable(),
    })
    .safeParse(settings);
  if (!parsed.success) return { ok: false, error: "invalidAnswer" };
  return run(sessionId, async (context, id) => {
    const db = getDb();
    await setCreativeSettings(db, context, id, parsed.data);
    await generateCreativeIdeas(db, deps(), context, id);
  });
}

/** El dueño confirma el insight o pide otro (con 3 ideas nuevas). */
export async function answerCreativeInsightAction(
  sessionId: string,
  agrees: unknown,
): Promise<CreativeActionResult> {
  const parsed = z.boolean().safeParse(agrees);
  if (!parsed.success) return { ok: false, error: "invalidAnswer" };
  return run(sessionId, (context, id) =>
    answerCreativeInsight(getDb(), deps(), context, id, parsed.data),
  );
}

/**
 * Transcribe una nota de voz. No cambia la sesión: el texto vuelve a la
 * pantalla para que el dueño lo revise antes de enviarlo.
 */
export async function transcribeVoiceNoteAction(
  formData: FormData,
): Promise<VoiceNoteResult> {
  const context = await creativeContext();
  const id = sessionIdSchema.safeParse(formData.get("sessionId"));
  if (!id.success) return { ok: false, error: "notFound" };
  const audio = formData.get("audio");
  const duration = Number(formData.get("durationSeconds"));
  if (
    !(audio instanceof Blob) ||
    audio.size > MAX_VOICE_BYTES ||
    !Number.isFinite(duration)
  ) {
    return { ok: false, error: "invalidAudio" };
  }
  try {
    const text = await transcribeVoiceNote(
      getDb(),
      { transcription: getTranscriptionProvider() },
      context,
      id.data,
      { audio, durationSeconds: duration },
    );
    return { ok: true, text };
  } catch (error) {
    return { ok: false, error: flowErrorCode(error) };
  }
}

/** Elige una de las 3 ideas y escribe su guion. */
export async function chooseCreativeIdeaAction(
  sessionId: string,
  index: unknown,
): Promise<CreativeActionResult> {
  const parsed = z.number().int().min(0).safeParse(index);
  if (!parsed.success) return { ok: false, error: "invalidAnswer" };
  return run(sessionId, (context, id) =>
    chooseCreativeIdea(getDb(), deps(), context, id, parsed.data),
  );
}

/** Aplica al guion el cambio que pidió el dueño. */
export async function reviseCreativeScriptAction(
  sessionId: string,
  request: unknown,
): Promise<CreativeActionResult> {
  const parsed = freeTextSchema.safeParse(request);
  if (!parsed.success) return { ok: false, error: "invalidAnswer" };
  return run(sessionId, (context, id) =>
    reviseCreativeScript(getDb(), deps(), context, id, parsed.data),
  );
}

// --- Internos ---------------------------------------------------------------

async function creativeContext() {
  const { user, organization } = await requireOrganization();
  if (!hasFeature(organization.segment, "creativeDirector")) {
    throw new Error("El director creativo es del modo pyme.");
  }
  return { user, organization, segment: organization.segment };
}

function deps() {
  return { text: getTextProvider() };
}

async function run(
  sessionId: string,
  action: (context: CreativeContext, sessionId: string) => Promise<unknown>,
): Promise<CreativeActionResult> {
  const id = sessionIdSchema.safeParse(sessionId);
  if (!id.success) return { ok: false, error: "notFound" };
  const context = await creativeContext();
  try {
    await action(context, id.data);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: flowErrorCode(error) };
  } finally {
    refresh();
  }
}

/** Código para la pantalla; los errores inesperados siguen su curso. */
function flowErrorCode(error: unknown): CreativeErrorCode {
  if (!(error instanceof CreativeFlowError)) throw error;
  if (error.code === "providerFailed") {
    console.error(
      "El director creativo no respondió",
      error.message,
      error.cause,
    );
  }
  return error.code;
}
