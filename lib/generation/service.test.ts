import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { creditTransactions, generationJobs } from "@/db/schema";
import {
  getBalance,
  grantCredits,
  InsufficientCreditsError,
} from "@/lib/billing/wallet";
import type {
  GenerationProvider,
  GenerationRequest,
} from "@/lib/providers/generation-provider";
import { MOCK_FAILURE_MARKER, MockProvider } from "@/lib/providers/mock";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";

import {
  InvalidGenerationRequestError,
  startGeneration,
  SUBMIT_TIMEOUT_MS,
  syncActiveJobs,
  syncJob,
} from "./service";

let testDb: TestDatabase;
let clock: number;
let provider: MockProvider;
const resolve = () => provider;
const now = () => new Date(clock);

beforeAll(async () => {
  testDb = await createTestDatabase();
});
beforeEach(async () => {
  await testDb.reset();
  clock = Date.parse("2026-03-01T10:00:00Z");
  provider = new MockProvider({ latencyMs: 5_000, now: () => clock });
});
afterAll(async () => {
  await testDb.close();
});

// 10 s de video estándar: 0,50 USD → 70 créditos (ver pricing.test.ts).
const videoRequest: GenerationRequest = {
  modelId: "mock-video-standard",
  prompt: "Promo de pan recién horneado",
  aspectRatio: "9:16",
  durationSeconds: 10,
};

async function fundedOrganization(credits = 100) {
  const context = await createOrganization(testDb);
  await grantCredits(testDb.db, {
    organizationId: context.organization.id,
    credits,
    note: "Saldo de prueba",
    now: now(),
  });
  return context;
}

async function start(
  context: Awaited<ReturnType<typeof fundedOrganization>>,
  request = videoRequest,
  withProvider: GenerationProvider = provider,
) {
  return startGeneration(testDb.db, withProvider, {
    organizationId: context.organization.id,
    userId: context.user.id,
    request,
    now: now(),
  });
}

describe("startGeneration", () => {
  it("reserva el precio y envía el job al proveedor", async () => {
    const context = await fundedOrganization();

    const job = await start(context);

    expect(job).toMatchObject({
      status: "pending",
      provider: "mock",
      priceCredits: 70,
      costMicroUsd: 500_000,
      surchargeBps: 500,
      marginBps: 2_500,
    });
    expect(job.providerJobId).toMatch(/^mock_/);
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      {
        available: 30,
        held: 70,
      },
    );
  });

  it("sin saldo suficiente no crea el job", async () => {
    const context = await fundedOrganization(10);

    await expect(start(context)).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    );

    expect(await testDb.db.select().from(generationJobs)).toEqual([]);
  });

  it.each([
    [{ ...videoRequest, modelId: "no-existe" }, "unknownModel"],
    [
      {
        ...videoRequest,
        modelId: "mock-video-pro",
        aspectRatio: "1:1" as const,
      },
      "unsupportedAspectRatio",
    ],
    [{ ...videoRequest, durationSeconds: 7 }, "invalidDuration"],
    [{ ...videoRequest, prompt: "   " }, "emptyPrompt"],
  ])("rechaza solicitudes inválidas (%#)", async (request, reason) => {
    const context = await fundedOrganization();

    await expect(start(context, request)).rejects.toMatchObject({
      constructor: InvalidGenerationRequestError,
      reason,
    });
  });

  it("si el proveedor no acepta el job, lo marca fallido y reembolsa", async () => {
    const context = await fundedOrganization();
    const broken: GenerationProvider = {
      id: "mock",
      listModels: () => provider.listModels(),
      estimate: (request) => provider.estimate(request),
      submit: async () => {
        throw new Error("proveedor caído");
      },
      getStatus: (id) => provider.getStatus(id),
      fetchOutput: (id) => provider.fetchOutput(id),
    };

    const job = await start(context, videoRequest, broken);

    expect(job).toMatchObject({ status: "failed", error: "submit_failed" });
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      {
        available: 100,
        held: 0,
      },
    );
  });
});

describe("syncJob", () => {
  it("pasa a running mientras el proveedor procesa", async () => {
    const context = await fundedOrganization();
    const job = await start(context);

    clock += 1_000;
    const synced = await syncJob(testDb.db, resolve, job.id, now());

    expect(synced.status).toBe("running");
  });

  it("al terminar guarda los outputs y cobra la reserva", async () => {
    const context = await fundedOrganization();
    const job = await start(context);

    clock += 5_000;
    const synced = await syncJob(testDb.db, resolve, job.id, now());

    expect(synced).toMatchObject({ status: "succeeded", completedAt: now() });
    expect(synced.outputs).toEqual([
      expect.objectContaining({
        url: "/mock/preview-9x16.svg",
        mediaType: "video",
      }),
    ]);
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      {
        available: 30,
        held: 0,
      },
    );
  });

  it("si el proveedor falla, reembolsa todo", async () => {
    const context = await fundedOrganization();
    const job = await start(context, {
      ...videoRequest,
      prompt: `Promo ${MOCK_FAILURE_MARKER}`,
    });

    clock += 5_000;
    const synced = await syncJob(testDb.db, resolve, job.id, now());

    expect(synced).toMatchObject({ status: "failed", error: "mock_failure" });
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      {
        available: 100,
        held: 0,
      },
    );
  });

  it("es idempotente: sincronizar dos veces no cobra dos veces", async () => {
    const context = await fundedOrganization();
    const job = await start(context);
    clock += 5_000;

    await syncJob(testDb.db, resolve, job.id, now());
    await syncJob(testDb.db, resolve, job.id, now());

    const settles = await testDb.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.type, "settle"));
    expect(settles).toHaveLength(1);
  });

  it("un job que nunca llegó al proveedor se reembolsa después del timeout", async () => {
    const context = await fundedOrganization();
    const job = await start(context);
    await testDb.db
      .update(generationJobs)
      .set({ providerJobId: null, createdAt: now() })
      .where(eq(generationJobs.id, job.id));

    clock += SUBMIT_TIMEOUT_MS - 1_000;
    expect((await syncJob(testDb.db, resolve, job.id, now())).status).toBe(
      "pending",
    );

    clock += 2_000;
    const synced = await syncJob(testDb.db, resolve, job.id, now());
    expect(synced).toMatchObject({ status: "failed", error: "submit_timeout" });
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      {
        available: 100,
        held: 0,
      },
    );
  });
});

describe("syncActiveJobs", () => {
  it("sincroniza los jobs en curso y sigue si uno falla", async () => {
    const context = await fundedOrganization(500);
    const ok = await start(context);
    const failing = await start(context, {
      ...videoRequest,
      prompt: `Promo ${MOCK_FAILURE_MARKER}`,
    });
    const broken = await start(context);
    await testDb.db
      .update(generationJobs)
      .set({ providerJobId: "id-que-el-mock-no-entiende" })
      .where(eq(generationJobs.id, broken.id));

    clock += 5_000;
    const result = await syncActiveJobs(testDb.db, resolve, { now: now() });

    expect(result).toEqual({ checked: 3, errors: 1 });
    const statuses = Object.fromEntries(
      (await testDb.db.select().from(generationJobs)).map((job) => [
        job.id,
        job.status,
      ]),
    );
    expect(statuses[ok.id]).toBe("succeeded");
    expect(statuses[failing.id]).toBe("failed");
    expect(statuses[broken.id]).toBe("pending");
  });
});
