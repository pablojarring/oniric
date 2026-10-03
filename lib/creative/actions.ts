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
import { isSeasonId, isSeasonInCalendar } from "@/lib/seasons";
import { hasFeature } from "@/lib/segment";

import { MAX_FREE_TEXT } from "./limits";
import { qualityTiers } from "./schemas";
import {
  answerCreativeTurn,
  chooseCreativeIdea,
  type CreativeContext,
  type CreativeErrorCode,
  CreativeFlowError,
  generateCreativeIdeas,
  resumeCreativeConversation,
  reviseCreativeScript,
  setCreativeTier,
  startCreativeSession,
} from "./service";

// Acciones de las pantallas del director creativo (docs/director-creativo.md).
// Cada una valida lo que llega del navegador, llama al servicio y refresca la
// página, que vuelve a leer la sesión: también si falla, porque una respuesta
// puede haber quedado guardada antes de que fallara el proveedor de texto.

export type CreativeActionResult =
  { ok: true } | { ok: false; error: CreativeErrorCode };

export type StartCreativeState = { error: CreativeErrorCode } | undefined;

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

/** Guarda el nivel y pide 3 ideas (o 3 distintas si ya había). */
export async function requestCreativeIdeasAction(
  sessionId: string,
  tier: unknown,
): Promise<CreativeActionResult> {
  const parsed = z.enum(qualityTiers).safeParse(tier);
  if (!parsed.success) return { ok: false, error: "invalidAnswer" };
  return run(sessionId, async (context, id) => {
    const db = getDb();
    await setCreativeTier(db, context, id, parsed.data);
    await generateCreativeIdeas(db, deps(), context, id);
  });
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
    console.error("El director creativo no respondió", error);
  }
  return error.code;
}
