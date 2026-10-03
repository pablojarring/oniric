import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { textUsage } from "@/db/schema";
import { MockTextProvider } from "@/lib/providers/text/mock";
import type { TextRequest, TextResult } from "@/lib/providers/text";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";

import {
  answerCreativeTurn,
  chooseCreativeIdea,
  type CreativeContext,
  CreativeFlowError,
  generateCreativeIdeas,
  getCreativeSession,
  listCreativeSessions,
  normalizeShots,
  resumeCreativeConversation,
  reviseCreativeScript,
  sessionTextCostMicroUsd,
  setCreativeTier,
  startCreativeSession,
  TEXT_RATE_LIMIT,
} from "./service";

let testDb: TestDatabase;
let context: CreativeContext;
const deps = { text: new MockTextProvider() };

beforeAll(async () => {
  testDb = await createTestDatabase();
});
beforeEach(async () => {
  await testDb.reset();
  const { user, organization } = await createOrganization(testDb);
  context = { user, organization };
});
afterAll(async () => {
  await testDb.close();
});

async function errorCode(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(CreativeFlowError);
  return (error as CreativeFlowError).code;
}

/** Sesión con la conversación terminada (el simulador pregunta 3 cosas). */
async function briefedSession() {
  let session = await startCreativeSession(testDb.db, deps, context, {
    locale: "es",
  });
  session = await answerCreativeTurn(testDb.db, deps, context, session.id, {
    kind: "option",
    optionIndex: 1,
  });
  session = await answerCreativeTurn(testDb.db, deps, context, session.id, {
    kind: "text",
    text: "El pan de yuca de los domingos",
  });
  return answerCreativeTurn(testDb.db, deps, context, session.id, {
    kind: "decide",
  });
}

describe("conversación guiada", () => {
  it("empieza preguntando por el objetivo, con respuestas para el negocio", async () => {
    const session = await startCreativeSession(testDb.db, deps, context, {
      locale: "es",
      seasonId: "dayOfTheDead",
    });

    expect(session.status).toBe("conversation");
    expect(session.seasonId).toBe("dayOfTheDead");
    expect(session.turns).toHaveLength(1);
    const [turn] = session.turns;
    expect(turn?.topic).toBe("objective");
    expect(turn?.answer).toBeNull();
    expect(turn?.options.length).toBeGreaterThanOrEqual(3);
    expect(turn?.options[0]?.label).toContain("Panadería La Esquina");
  });

  it("guarda cada respuesta y termina con el brief", async () => {
    const session = await briefedSession();

    expect(session.status).toBe("briefed");
    expect(session.turns.map((turn) => turn.answer?.kind)).toEqual([
      "option",
      "text",
      "decide",
    ]);
    expect(session.turns[0]?.answer).toMatchObject({
      kind: "option",
      text: "Vender más mi producto estrella",
    });
    expect(session.brief).toMatchObject({
      objective: "Vender más mi producto estrella",
      product: "El pan de yuca de los domingos",
    });
  });

  it("rechaza opciones inexistentes, texto vacío o largo y texto bloqueado", async () => {
    const session = await startCreativeSession(testDb.db, deps, context, {
      locale: "es",
    });
    const answer = (input: Parameters<typeof answerCreativeTurn>[4]) =>
      answerCreativeTurn(testDb.db, deps, context, session.id, input);

    expect(await errorCode(answer({ kind: "option", optionIndex: 9 }))).toBe(
      "invalidAnswer",
    );
    expect(await errorCode(answer({ kind: "text", text: "   " }))).toBe(
      "invalidAnswer",
    );
    expect(
      await errorCode(answer({ kind: "text", text: "a".repeat(501) })),
    ).toBe("invalidAnswer");
    expect(
      await errorCode(answer({ kind: "text", text: "Un video con cocaina" })),
    ).toBe("moderation");
  });

  it("no deja ver ni responder la sesión de otra organización", async () => {
    const session = await startCreativeSession(testDb.db, deps, context, {
      locale: "es",
    });
    const other = await createOrganization(testDb);
    const otherContext = { user: other.user, organization: other.organization };

    expect(
      await errorCode(getCreativeSession(testDb.db, otherContext, session.id)),
    ).toBe("notFound");
    expect(
      await errorCode(
        answerCreativeTurn(testDb.db, deps, otherContext, session.id, {
          kind: "skip",
        }),
      ),
    ).toBe("notFound");
  });

  it("si el proveedor falla después de una respuesta, se puede retomar", async () => {
    let failing = false;
    const flaky = {
      id: "mock",
      model: "mock",
      generate: <T>(request: TextRequest<T>): Promise<TextResult<T>> =>
        failing
          ? Promise.reject(new Error("caído"))
          : deps.text.generate(request),
    };
    const session = await startCreativeSession(
      testDb.db,
      { text: flaky },
      context,
      { locale: "es" },
    );
    failing = true;
    expect(
      await errorCode(
        answerCreativeTurn(testDb.db, { text: flaky }, context, session.id, {
          kind: "option",
          optionIndex: 0,
        }),
      ),
    ).toBe("providerFailed");

    failing = false;
    const resumed = await resumeCreativeConversation(
      testDb.db,
      { text: flaky },
      context,
      session.id,
    );
    expect(resumed.turns).toHaveLength(2);
    expect(resumed.turns[0]?.answer?.kind).toBe("option");
    expect(resumed.turns[1]?.answer).toBeNull();
  });
});

describe("ideas y guion", () => {
  it("pide el nivel antes de las ideas", async () => {
    const session = await briefedSession();
    expect(
      await errorCode(
        generateCreativeIdeas(testDb.db, deps, context, session.id),
      ),
    ).toBe("invalidState");
  });

  it("propone un insight y 3 ideas, y otras 3 sin repetir", async () => {
    let session = await briefedSession();
    session = await setCreativeTier(testDb.db, context, session.id, "pro");
    session = await generateCreativeIdeas(testDb.db, deps, context, session.id);

    expect(session.status).toBe("ideas");
    expect(session.ideas?.round).toBe(1);
    expect(session.ideas?.insight).toContain("Panadería La Esquina");
    expect(session.ideas?.ideas).toHaveLength(3);
    const firstTitles = session.ideas?.ideas.map((idea) => idea.title) ?? [];

    session = await generateCreativeIdeas(testDb.db, deps, context, session.id);
    expect(session.ideas?.round).toBe(2);
    expect(session.ideas?.previousTitles).toEqual(firstTitles);
    const secondTitles = session.ideas?.ideas.map((idea) => idea.title) ?? [];
    expect(secondTitles.some((title) => firstTitles.includes(title))).toBe(
      false,
    );
  });

  it("escribe el guion de la idea elegida con la duración del nivel", async () => {
    let session = await briefedSession();
    session = await setCreativeTier(testDb.db, context, session.id, "cine");
    session = await generateCreativeIdeas(testDb.db, deps, context, session.id);
    session = await chooseCreativeIdea(testDb.db, deps, context, session.id, 2);

    expect(session.status).toBe("scripted");
    expect(session.chosenIdea).toBe(2);
    const script = session.script;
    expect(script?.durationSeconds).toBe(15);
    expect(script?.aspectRatio).toBe("9:16");
    expect(script?.shots[0]?.startSecond).toBe(0);
    expect(script?.shots.at(-1)?.endSecond).toBe(15);
    expect(script?.videoPrompt).toContain("No text");
    expect(script?.keyframePrompt).toBeTruthy();
    expect(script?.revisions).toEqual([]);
  });

  it("revisa el guion con el cambio pedido y lo registra", async () => {
    let session = await briefedSession();
    session = await setCreativeTier(testDb.db, context, session.id, "rapido");
    session = await generateCreativeIdeas(testDb.db, deps, context, session.id);
    session = await chooseCreativeIdea(testDb.db, deps, context, session.id, 0);
    session = await reviseCreativeScript(
      testDb.db,
      deps,
      context,
      session.id,
      "Que el gato sea atigrado",
    );

    expect(session.script?.revisions).toEqual(["Que el gato sea atigrado"]);
    expect(session.script?.shots[0]?.action).toContain("atigrado");
  });

  it("no acepta ideas inexistentes", async () => {
    let session = await briefedSession();
    session = await setCreativeTier(testDb.db, context, session.id, "pro");
    session = await generateCreativeIdeas(testDb.db, deps, context, session.id);
    expect(
      await errorCode(
        chooseCreativeIdea(testDb.db, deps, context, session.id, 3),
      ),
    ).toBe("invalidAnswer");
  });
});

describe("sesiones recientes", () => {
  it("lista las sesiones de la organización con su título, la última primero", async () => {
    const first = await briefedSession();
    let second = await briefedSession();
    second = await setCreativeTier(testDb.db, context, second.id, "pro");
    second = await generateCreativeIdeas(testDb.db, deps, context, second.id);
    second = await chooseCreativeIdea(testDb.db, deps, context, second.id, 0);
    const other = await createOrganization(testDb);
    await startCreativeSession(
      testDb.db,
      deps,
      { user: other.user, organization: other.organization },
      { locale: "es" },
    );

    const sessions = await listCreativeSessions(testDb.db, context, {
      limit: 5,
    });
    expect(sessions.map((session) => session.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(sessions[0]).toMatchObject({
      status: "scripted",
      title: second.script?.title,
    });
    expect(sessions[1]).toMatchObject({
      status: "briefed",
      title: "El pan de yuca de los domingos",
    });
  });
});

describe("uso del proveedor de texto", () => {
  it("registra cada pedido con su costo y lo suma por sesión", async () => {
    const session = await briefedSession();
    const rows = await testDb.db
      .select()
      .from(textUsage)
      .where(eq(textUsage.sessionId, session.id));

    // Primera pregunta, dos preguntas más y el cierre con el brief.
    expect(rows.map((row) => row.task)).toEqual(
      Array(4).fill("conversation_turn"),
    );
    expect(rows.every((row) => row.provider === "mock")).toBe(true);
    expect(rows.every((row) => row.costMicroUsd > 0)).toBe(true);
    expect(await sessionTextCostMicroUsd(testDb.db, session.id)).toBe(
      rows.reduce((sum, row) => sum + row.costMicroUsd, 0),
    );
  });

  it("frena a la organización que supera el límite por hora", async () => {
    const session = await startCreativeSession(testDb.db, deps, context, {
      locale: "es",
    });
    await testDb.db.insert(textUsage).values(
      Array.from({ length: TEXT_RATE_LIMIT.maxRequests }, () => ({
        organizationId: context.organization.id,
        provider: "mock",
        model: "mock",
        task: "conversation_turn",
        inputTokens: 1,
        cachedInputTokens: 0,
        outputTokens: 1,
        costMicroUsd: 1,
      })),
    );
    expect(
      await errorCode(
        answerCreativeTurn(testDb.db, deps, context, session.id, {
          kind: "skip",
        }),
      ),
    ).toBe("rateLimited");
  });
});

describe("normalizeShots", () => {
  const shot = (startSecond: number, endSecond: number) => ({
    startSecond,
    endSecond,
    label: "Toma",
    action: "Acción",
    camera: "Cámara",
    sound: "Sonido",
    onScreenText: null,
  });

  it("ordena las tomas, las deja seguidas y termina en la duración", () => {
    const shots = normalizeShots([shot(6, 9), shot(1, 4), shot(4, 7)], 10);
    expect(shots.map((s) => [s.startSecond, s.endSecond])).toEqual([
      [0, 4],
      [4, 7],
      [7, 10],
    ]);
  });

  it("deja al menos un segundo para cada toma que sigue", () => {
    const shots = normalizeShots([shot(0, 10), shot(10, 12)], 10);
    expect(shots.map((s) => [s.startSecond, s.endSecond])).toEqual([
      [0, 9],
      [9, 10],
    ]);
  });
});
