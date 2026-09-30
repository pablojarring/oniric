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
import { createMemoryStorage } from "@/test/storage";

import {
  InvalidGenerationRequestError,
  PriceChangedError,
  RateLimitExceededError,
  startGeneration,
  SUBMIT_TIMEOUT_MS,
  syncActiveJobs,
  syncJob,
  type SyncDeps,
} from "./service";

let testDb: TestDatabase;
let clock: number;
let provider: MockProvider;
let outputs: ReturnType<typeof createMemoryStorage>;
let deps: SyncDeps;
const now = () => new Date(clock);

beforeAll(async () => {
  testDb = await createTestDatabase();
});
beforeEach(async () => {
  await testDb.reset();
  clock = Date.parse("2026-03-01T10:00:00Z");
  provider = new MockProvider({ latencyMs: 5_000, now: () => clock });
  outputs = createMemoryStorage();
  deps = { resolveProvider: () => provider, outputs: outputs.storage };
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

  it("guarda los datos del asistente pyme", async () => {
    const context = await fundedOrganization();
    const brief = {
      productName: "Pan de yuca",
      adCopy: "Hoy en La Esquina: pan de yuca",
      photoConsent: true,
    };

    const job = await startGeneration(testDb.db, provider, {
      organizationId: context.organization.id,
      userId: context.user.id,
      request: videoRequest,
      ad: {
        templateId: "whatsappStatus",
        brief,
        inputImagePath: "org/foto.jpg",
      },
      now: now(),
    });

    expect(job).toMatchObject({
      templateId: "whatsappStatus",
      brief,
      inputImagePath: "org/foto.jpg",
    });
  });

  it("si el precio no es el que vio el cliente, no crea el job", async () => {
    const context = await fundedOrganization();

    const attempt = startGeneration(testDb.db, provider, {
      organizationId: context.organization.id,
      userId: context.user.id,
      request: videoRequest,
      expectedPriceCredits: 60,
      now: now(),
    });

    await expect(attempt).rejects.toMatchObject({
      constructor: PriceChangedError,
      priceCredits: 70,
    });
    expect(await testDb.db.select().from(generationJobs)).toEqual([]);
  });

  it("respeta el límite de generaciones por organización", async () => {
    const context = await fundedOrganization(1_000);
    const other = await fundedOrganization(1_000);
    const rateLimit = { maxJobs: 2, windowSeconds: 3_600 };
    const startLimited = (organization = context) =>
      startGeneration(testDb.db, provider, {
        organizationId: organization.organization.id,
        userId: organization.user.id,
        request: videoRequest,
        rateLimit,
        now: now(),
      });

    await startLimited();
    await startLimited();
    await expect(startLimited()).rejects.toBeInstanceOf(RateLimitExceededError);

    // El intento rechazado no deja job ni reserva, y no afecta a otras organizaciones.
    const jobs = await testDb.db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.organizationId, context.organization.id));
    expect(jobs).toHaveLength(2);
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      {
        available: 860,
        held: 140,
      },
    );
    await expect(startLimited(other)).resolves.toMatchObject({
      status: "pending",
    });
  });

  it("el límite solo cuenta las generaciones de la ventana", async () => {
    const context = await fundedOrganization(1_000);
    await start(context);
    await testDb.db
      .update(generationJobs)
      .set({ createdAt: new Date(Date.now() - 2 * 3_600_000) });

    const job = await startGeneration(testDb.db, provider, {
      organizationId: context.organization.id,
      userId: context.user.id,
      request: videoRequest,
      rateLimit: { maxJobs: 1, windowSeconds: 3_600 },
      now: now(),
    });

    expect(job.status).toBe("pending");
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
    const synced = await syncJob(testDb.db, deps, job.id, now());

    expect(synced.status).toBe("running");
  });

  it("al terminar copia los resultados a nuestro almacenamiento y cobra", async () => {
    const context = await fundedOrganization();
    const job = await start(context);

    clock += 5_000;
    const synced = await syncJob(testDb.db, deps, job.id, now());

    expect(synced).toMatchObject({ status: "succeeded", completedAt: now() });
    const path = `${context.organization.id}/${job.id}/0.webm`;
    expect(synced.outputs).toEqual([
      {
        path,
        size: outputs.files.get(path)?.bytes.length,
        mediaType: "video",
        mimeType: "video/webm",
        width: 1080,
        height: 1920,
        durationSeconds: 10,
      },
    ]);
    expect(outputs.files.get(path)?.mimeType).toBe("video/webm");
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      {
        available: 30,
        held: 0,
      },
    );
  });

  it("si la copia falla, no cobra y el job queda en curso para reintentar", async () => {
    const context = await fundedOrganization();
    const job = await start(context);
    const failingDeps: SyncDeps = {
      ...deps,
      outputs: {
        ...outputs.storage,
        upload: async () => {
          throw new Error("storage caído");
        },
      },
    };

    clock += 5_000;
    await expect(
      syncJob(testDb.db, failingDeps, job.id, now()),
    ).rejects.toThrow("storage caído");

    const [stillRunning] = await testDb.db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, job.id));
    expect(stillRunning?.status).toBe("pending");
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      { available: 30, held: 70 },
    );

    // El reintento con el almacenamiento sano termina el job.
    const synced = await syncJob(testDb.db, deps, job.id, now());
    expect(synced.status).toBe("succeeded");
  });

  it("un resultado que no se puede guardar da el job por fallido y reembolsa", async () => {
    const context = await fundedOrganization();
    const job = await start(context);
    const unsupported = Object.assign(Object.create(provider), {
      fetchOutput: async () => [
        {
          url: "https://proveedor.test/a.zip",
          mediaType: "video",
          mimeType: "application/zip",
        },
      ],
    }) as MockProvider;

    clock += 5_000;
    const synced = await syncJob(
      testDb.db,
      { ...deps, resolveProvider: () => unsupported },
      job.id,
      now(),
    );

    expect(synced).toMatchObject({
      status: "failed",
      error: "unsupported_output",
    });
    expect(outputs.files.size).toBe(0);
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      { available: 100, held: 0 },
    );
  });

  it("un éxito sin resultados se da por fallido y se reembolsa", async () => {
    const context = await fundedOrganization();
    const job = await start(context);
    const empty = Object.assign(Object.create(provider), {
      fetchOutput: async () => [],
    }) as MockProvider;

    clock += 5_000;
    const synced = await syncJob(
      testDb.db,
      { ...deps, resolveProvider: () => empty },
      job.id,
      now(),
    );

    expect(synced).toMatchObject({ status: "failed", error: "no_outputs" });
    expect(await getBalance(testDb.db, context.organization.id, now())).toEqual(
      { available: 100, held: 0 },
    );
  });

  it("si el proveedor falla, reembolsa todo", async () => {
    const context = await fundedOrganization();
    const job = await start(context, {
      ...videoRequest,
      prompt: `Promo ${MOCK_FAILURE_MARKER}`,
    });

    clock += 5_000;
    const synced = await syncJob(testDb.db, deps, job.id, now());

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

    await syncJob(testDb.db, deps, job.id, now());
    await syncJob(testDb.db, deps, job.id, now());

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
    expect((await syncJob(testDb.db, deps, job.id, now())).status).toBe(
      "pending",
    );

    clock += 2_000;
    const synced = await syncJob(testDb.db, deps, job.id, now());
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
    const result = await syncActiveJobs(testDb.db, deps, { now: now() });

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
