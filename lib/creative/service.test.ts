import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { creativeSessions, textUsage } from "@/db/schema";
import { MockTextProvider } from "@/lib/providers/text/mock";
import type { TextRequest, TextResult } from "@/lib/providers/text";
import { MockTranscriptionProvider } from "@/lib/providers/transcription/mock";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";

import {
  answerCreativeInsight,
  answerCreativeTurn,
  type BriefEdit,
  chooseCreativeIdea,
  type CreativeContext,
  CreativeFlowError,
  generateCreativeIdeas,
  getCreativeSession,
  listCreativeSessions,
  normalizeShots,
  refreshTurnOptions,
  resumeCreativeConversation,
  reviseCreativeScript,
  sessionTextCostMicroUsd,
  setCreativeSettings,
  startCreativeSession,
  TEXT_RATE_LIMIT,
  transcribeVoiceNote,
  updateCreativeBrief,
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
    session = await setCreativeSettings(testDb.db, context, session.id, {
      tier: "pro",
      featuring: null,
    });
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
    session = await setCreativeSettings(testDb.db, context, session.id, {
      tier: "cine",
      featuring: null,
    });
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
    session = await setCreativeSettings(testDb.db, context, session.id, {
      tier: "rapido",
      featuring: null,
    });
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
    session = await setCreativeSettings(testDb.db, context, session.id, {
      tier: "pro",
      featuring: null,
    });
    session = await generateCreativeIdeas(testDb.db, deps, context, session.id);
    expect(
      await errorCode(
        chooseCreativeIdea(testDb.db, deps, context, session.id, 3),
      ),
    ).toBe("invalidAnswer");
  });
});

/** Proveedor de texto que guarda las instrucciones de cada pedido. */
function recordingProvider() {
  const instructions: string[] = [];
  return {
    instructions,
    text: {
      id: "mock",
      model: "mock",
      generate: <T>(request: TextRequest<T>): Promise<TextResult<T>> => {
        instructions.push(request.instructions);
        return deps.text.generate(request);
      },
    },
  };
}

async function ideasSession() {
  let session = await briefedSession();
  session = await setCreativeSettings(testDb.db, context, session.id, {
    tier: "pro",
    featuring: null,
  });
  return generateCreativeIdeas(testDb.db, deps, context, session.id);
}

describe("decisiones del dueño", () => {
  it("¿Quién sale? llega a las ideas y al guion", async () => {
    const recorder = recordingProvider();
    let session = await briefedSession();
    session = await setCreativeSettings(testDb.db, context, session.id, {
      tier: "pro",
      featuring: "nobody",
    });
    expect(session.featuring).toBe("nobody");
    session = await generateCreativeIdeas(
      testDb.db,
      { text: recorder.text },
      context,
      session.id,
    );
    await chooseCreativeIdea(
      testDb.db,
      { text: recorder.text },
      context,
      session.id,
      0,
    );
    expect(recorder.instructions).toHaveLength(2);
    for (const text of recorder.instructions) {
      expect(text).toContain("No people on screen");
    }
  });

  it("el personaje de la marca solo se puede elegir si la marca lo tiene", async () => {
    const session = await briefedSession();
    expect(
      await errorCode(
        setCreativeSettings(testDb.db, context, session.id, {
          tier: "pro",
          featuring: "brandCharacter",
        }),
      ),
    ).toBe("invalidAnswer");

    await testDb.db
      .update(creativeSessions)
      .set({
        brief: {
          ...session.brief!,
          brandElements: [
            {
              name: "Mishi",
              kind: "pet",
              description: "El gato de la panadería",
              saveToBrand: true,
            },
          ],
        },
      })
      .where(eq(creativeSessions.id, session.id));
    const updated = await setCreativeSettings(testDb.db, context, session.id, {
      tier: "pro",
      featuring: "brandCharacter",
    });
    expect(updated.featuring).toBe("brandCharacter");
  });

  it("el dueño corrige a mano lo que entendió el director", async () => {
    const session = await briefedSession();
    await testDb.db
      .update(creativeSessions)
      .set({
        featuring: "brandCharacter",
        brief: {
          ...session.brief!,
          brandElements: [
            {
              name: "Mishi",
              kind: "pet",
              description: "El gato",
              saveToBrand: true,
            },
          ],
        },
      })
      .where(eq(creativeSessions.id, session.id));
    const edit: BriefEdit = {
      objective: "  Vender más pan de yuca  ",
      product: "Pan de yuca recién horneado",
      audience: "",
      differentiator: "Receta de la abuela",
      offer: "",
      tone: "Alegre",
      mustInclude: ["El horno de leña", " "],
      avoid: ["Precios"],
      keepBrandElements: [],
    };
    const updated = await updateCreativeBrief(
      testDb.db,
      context,
      session.id,
      edit,
    );
    expect(updated.brief).toMatchObject({
      objective: "Vender más pan de yuca",
      product: "Pan de yuca recién horneado",
      audience: null,
      differentiator: "Receta de la abuela",
      offer: null,
      tone: "Alegre",
      brandElements: [],
      mustInclude: ["El horno de leña"],
      avoid: ["Precios"],
    });
    // Sin el personaje, "¿Quién sale?" vuelve a decidirlo el director.
    expect(updated.featuring).toBeNull();

    expect(
      await errorCode(
        updateCreativeBrief(testDb.db, context, session.id, {
          ...edit,
          product: "   ",
        }),
      ),
    ).toBe("invalidAnswer");
    expect(
      await errorCode(
        updateCreativeBrief(testDb.db, context, session.id, {
          ...edit,
          offer: "Un video con cocaina",
        }),
      ),
    ).toBe("moderation");
  });

  it("el brief solo se corrige antes de pedir las ideas", async () => {
    const session = await ideasSession();
    expect(
      await errorCode(
        updateCreativeBrief(testDb.db, context, session.id, {
          objective: "Vender",
          product: "Pan",
          audience: "",
          differentiator: "",
          offer: "",
          tone: "",
          mustInclude: [],
          avoid: [],
          keepBrandElements: [],
        }),
      ),
    ).toBe("invalidState");
  });

  it("otras respuestas cambian las opciones sin cambiar la pregunta", async () => {
    const session = await startCreativeSession(testDb.db, deps, context, {
      locale: "es",
    });
    const before = session.turns[0];
    const updated = await refreshTurnOptions(
      testDb.db,
      deps,
      context,
      session.id,
    );
    expect(updated.turns).toHaveLength(1);
    const after = updated.turns[0];
    expect(after?.question).toBe(before?.question);
    expect(after?.answer).toBeNull();
    expect(after?.options.map((option) => option.label)).not.toEqual(
      before?.options.map((option) => option.label),
    );

    const answered = await answerCreativeTurn(
      testDb.db,
      deps,
      context,
      session.id,
      { kind: "option", optionIndex: 0 },
    );
    expect(answered.turns[0]?.answer).toMatchObject({
      text: after?.options[0]?.label,
    });
  });

  it("el dueño confirma el insight o pide otro", async () => {
    const session = await ideasSession();
    const confirmed = await answerCreativeInsight(
      testDb.db,
      deps,
      context,
      session.id,
      true,
    );
    expect(confirmed.ideas?.insightConfirmed).toBe(true);
    expect(confirmed.ideas?.round).toBe(1);

    const rejected = await answerCreativeInsight(
      testDb.db,
      deps,
      context,
      session.id,
      false,
    );
    expect(rejected.ideas?.round).toBe(2);
    expect(rejected.ideas?.insightConfirmed).toBe(false);
    expect(rejected.ideas?.rejectedInsights).toEqual([session.ideas?.insight]);
    expect(rejected.ideas?.insight).not.toBe(session.ideas?.insight);
  });
});

describe("notas de voz", () => {
  const transcription = { transcription: new MockTranscriptionProvider() };
  const audio = (type = "audio/webm;codecs=opus", size = 2_000) =>
    new Blob([new Uint8Array(size)], { type });

  it("transcribe la nota y registra su costo", async () => {
    const session = await startCreativeSession(testDb.db, deps, context, {
      locale: "es",
    });
    const text = await transcribeVoiceNote(
      testDb.db,
      transcription,
      context,
      session.id,
      { audio: audio(), durationSeconds: 12 },
    );
    expect(text).toBe("Quiero que más gente conozca mi negocio");

    const [row] = await testDb.db
      .select()
      .from(textUsage)
      .where(eq(textUsage.task, "voice_note"));
    // 12 s a US$0,0045 por minuto.
    expect(row?.costMicroUsd).toBe(900);
    expect(row?.sessionId).toBe(session.id);
  });

  it("rechaza formatos no admitidos, audios vacíos o muy grandes", async () => {
    const session = await startCreativeSession(testDb.db, deps, context, {
      locale: "es",
    });
    const send = (blob: Blob) =>
      transcribeVoiceNote(testDb.db, transcription, context, session.id, {
        audio: blob,
        durationSeconds: 5,
      });
    expect(await errorCode(send(audio("audio/ogg")))).toBe("invalidAudio");
    expect(await errorCode(send(audio("audio/webm", 0)))).toBe("invalidAudio");
    expect(await errorCode(send(audio("audio/mp4", 3 * 1024 * 1024)))).toBe(
      "invalidAudio",
    );
  });

  it("solo sirve para responder o pedir cambios al guion", async () => {
    const session = await briefedSession();
    expect(
      await errorCode(
        transcribeVoiceNote(testDb.db, transcription, context, session.id, {
          audio: audio(),
          durationSeconds: 5,
        }),
      ),
    ).toBe("invalidState");
  });
});

describe("sesiones recientes", () => {
  it("lista las sesiones de la organización con su título, la última primero", async () => {
    const first = await briefedSession();
    let second = await briefedSession();
    second = await setCreativeSettings(testDb.db, context, second.id, {
      tier: "pro",
      featuring: null,
    });
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
