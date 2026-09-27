import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { generationJobs } from "@/db/schema";
import { getBalance, grantCredits } from "@/lib/billing/wallet";
import { MOCK_FAILURE_MARKER, MockProvider } from "@/lib/providers/mock";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";
import { createMemoryStorage } from "@/test/storage";

import type { AdForm } from "./schema";
import {
  createAd,
  getOrganizationJob,
  listOrganizationJobs,
  quoteTemplates,
} from "./service";

let testDb: TestDatabase;
let provider: MockProvider;
let storage: ReturnType<typeof createMemoryStorage>;

beforeAll(async () => {
  testDb = await createTestDatabase();
});
beforeEach(async () => {
  await testDb.reset();
  provider = new MockProvider({ latencyMs: 0 });
  storage = createMemoryStorage();
});
afterAll(async () => {
  await testDb.close();
});

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

// Estado de WhatsApp: video de 10 s → 70 créditos.
const baseForm: AdForm = {
  templateId: "whatsappStatus",
  aspectRatio: "9:16",
  productName: "Pan de yuca",
  description: "Recién horneado",
  offer: "",
  adCopy: "Hoy en La Esquina: pan de yuca 🙌",
  photo: null,
  photoConsent: false,
  expectedPriceCredits: 70,
};

async function fundedOrganization(credits = 100) {
  const context = await createOrganization(testDb);
  await grantCredits(testDb.db, {
    organizationId: context.organization.id,
    credits,
    note: "Saldo de prueba",
  });
  return context;
}

async function create(
  context: Awaited<ReturnType<typeof fundedOrganization>>,
  form: Partial<AdForm> = {},
) {
  return createAd(
    testDb.db,
    { provider, photos: storage.storage },
    {
      organizationId: context.organization.id,
      userId: context.user.id,
      form: { ...baseForm, ...form },
    },
  );
}

describe("quoteTemplates", () => {
  it("cotiza cada plantilla y formato con el margen de la organización", async () => {
    expect(await quoteTemplates(testDb.db, provider, "pyme")).toEqual({
      // 15 s × 0,05 = 0,75 USD → 105 créditos.
      promoInstagram: { "9:16": 105, "1:1": 105, "16:9": 105 },
      whatsappStatus: { "9:16": 70 },
      // 0,02 USD → 3 créditos.
      dailyOffer: { "1:1": 3, "9:16": 3, "16:9": 3 },
    });
  });
});

describe("createAd", () => {
  it("crea el job con el modelo de la plantilla y reserva el precio", async () => {
    const context = await fundedOrganization();

    const result = await create(context);

    expect(result.ok).toBe(true);
    const job = result.ok ? result.job : null;
    expect(job).toMatchObject({
      status: "pending",
      modelId: "mock-video-standard",
      priceCredits: 70,
      templateId: "whatsappStatus",
      inputImagePath: null,
      brief: {
        productName: "Pan de yuca",
        description: "Recién horneado",
        adCopy: "Hoy en La Esquina: pan de yuca 🙌",
        photoConsent: false,
      },
      request: { aspectRatio: "9:16", durationSeconds: 10 },
    });
    expect(job?.request.prompt).toContain(
      '"Hoy en La Esquina: pan de yuca 🙌"',
    );
    expect(job?.request.inputImageUrl).toBeUndefined();
    expect(await getBalance(testDb.db, context.organization.id)).toEqual({
      available: 30,
      held: 70,
    });
  });

  it("sube la foto a la carpeta de la organización y pasa una URL firmada", async () => {
    const context = await fundedOrganization();

    const result = await create(context, {
      description: "",
      photo: new Blob([jpegBytes]),
      photoConsent: true,
    });

    if (!result.ok) throw new Error(result.error.code);
    const { inputImagePath, request, brief } = result.job;
    expect(inputImagePath).toMatch(
      new RegExp(`^${context.organization.id}/[0-9a-f-]{36}\\.jpg$`),
    );
    expect(storage.files.get(inputImagePath ?? "")?.bytes).toEqual(jpegBytes);
    expect(request.inputImageUrl).toBe(
      `https://storage.test/${inputImagePath}?ttl=3600`,
    );
    expect(request.prompt).toContain("reference photo");
    expect(brief).toEqual({
      productName: "Pan de yuca",
      adCopy: baseForm.adCopy,
      photoConsent: true,
    });
  });

  it("solo usa la oferta en plantillas que la piden", async () => {
    const context = await fundedOrganization();

    const result = await create(context, { offer: "2x1" });

    if (!result.ok) throw new Error(result.error.code);
    expect(result.job.brief).not.toHaveProperty("offer");
    expect(result.job.request.prompt).not.toContain("2x1");
  });

  it("bloquea textos que no pasan la moderación, sin subir nada", async () => {
    const context = await fundedOrganization();

    const result = await create(context, {
      adCopy: "Oferta de cocaína",
      photo: new Blob([jpegBytes]),
      photoConsent: true,
    });

    expect(result).toEqual({ ok: false, error: { code: "moderation" } });
    expect(storage.files.size).toBe(0);
    expect(await testDb.db.select().from(generationJobs)).toEqual([]);
  });

  it("rechaza archivos que no son imágenes", async () => {
    const context = await fundedOrganization();

    const result = await create(context, {
      photo: new Blob(["<svg></svg>"]),
      photoConsent: true,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "photoUnsupportedType" },
    });
  });

  it("sin saldo suficiente no crea el job y borra la foto subida", async () => {
    const context = await fundedOrganization(50);

    const result = await create(context, {
      photo: new Blob([jpegBytes]),
      photoConsent: true,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "insufficientCredits", required: 70, available: 50 },
    });
    expect(storage.files.size).toBe(0);
    expect(await testDb.db.select().from(generationJobs)).toEqual([]);
  });

  it("avisa si el precio cambió desde la revisión", async () => {
    const context = await fundedOrganization();

    const result = await create(context, { expectedPriceCredits: 60 });

    expect(result).toEqual({
      ok: false,
      error: { code: "priceChanged", priceCredits: 70 },
    });
  });

  it("el mock falla a propósito con el marcador y el job queda para reembolsar", async () => {
    const context = await fundedOrganization();

    const result = await create(context, {
      description: `Recién horneado ${MOCK_FAILURE_MARKER}`,
    });

    if (!result.ok) throw new Error(result.error.code);
    expect(result.job.request.prompt).toContain(MOCK_FAILURE_MARKER);
  });
});

describe("getOrganizationJob", () => {
  it("solo devuelve jobs de la propia organización", async () => {
    const context = await fundedOrganization();
    const other = await fundedOrganization();
    const result = await create(context);
    if (!result.ok) throw new Error(result.error.code);
    const { id } = result.job;

    expect(
      await getOrganizationJob(testDb.db, context.organization.id, id),
    ).toMatchObject({ id });
    expect(
      await getOrganizationJob(testDb.db, other.organization.id, id),
    ).toBeNull();
    expect(
      await getOrganizationJob(
        testDb.db,
        context.organization.id,
        "no-es-uuid",
      ),
    ).toBeNull();
  });
});

describe("listOrganizationJobs", () => {
  it("lista solo los anuncios de la organización, del más nuevo al más viejo, por páginas", async () => {
    const context = await fundedOrganization(1_000);
    const other = await fundedOrganization(1_000);
    const ids: string[] = [];
    for (let index = 0; index < 3; index++) {
      const result = await create(context);
      if (!result.ok) throw new Error(result.error.code);
      ids.push(result.job.id);
    }
    await create(other);

    const first = await listOrganizationJobs(
      testDb.db,
      context.organization.id,
      {
        limit: 2,
      },
    );
    const second = await listOrganizationJobs(
      testDb.db,
      context.organization.id,
      { limit: 2, offset: 2 },
    );

    expect(first.jobs.map((job) => job.id)).toEqual([ids[2], ids[1]]);
    expect(first.hasMore).toBe(true);
    expect(second.jobs.map((job) => job.id)).toEqual([ids[0]]);
    expect(second.hasMore).toBe(false);
  });
});
