import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { generationJobs } from "@/db/schema";
import { signWebhookReference } from "@/lib/providers/higgsfield";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";

import { handleHiggsfieldWebhook } from "./webhook";

const SECRET = "s3cret";
const REQUEST_ID = "d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});
beforeEach(async () => {
  await testDb.reset();
});
afterAll(async () => {
  await testDb.close();
});

async function createJob(
  values: { provider?: string; providerJobId?: string | null } = {},
) {
  const { organization, user } = await createOrganization(testDb);
  const [job] = await testDb.db
    .insert(generationJobs)
    .values({
      organizationId: organization.id,
      createdBy: user.id,
      provider: values.provider ?? "higgsfield",
      modelId: "kling-3.0-std",
      request: {
        modelId: "kling-3.0-std",
        prompt: "Pan de yuca",
        aspectRatio: "9:16",
        durationSeconds: 10,
      },
      costMicroUsd: 1_000_000,
      surchargeBps: 700,
      priceCredits: 200,
      marginBps: 3500,
      providerJobId:
        values.providerJobId === undefined ? REQUEST_ID : values.providerJobId,
    })
    .returning();
  if (!job) throw new Error("No se creó el job");
  return job;
}

const completed = {
  request_id: REQUEST_ID,
  status: "completed",
  error: null,
  payload: { video: { url: "https://cdn.test/v.mp4" } },
};

function deliver(
  jobId: string,
  options: {
    body?: unknown;
    signature?: string;
    secret?: string | null;
  } = {},
) {
  return handleHiggsfieldWebhook(testDb.db, {
    secret: options.secret === null ? undefined : (options.secret ?? SECRET),
    jobId,
    signature: options.signature ?? signWebhookReference(SECRET, jobId),
    body: "body" in options ? options.body : completed,
  });
}

describe("handleHiggsfieldWebhook", () => {
  it("un aviso válido sincroniza su job", async () => {
    const job = await createJob();
    await expect(deliver(job.id)).resolves.toEqual({
      status: 200,
      syncJobId: job.id,
    });
  });

  it("acepta los avisos de fallo y de moderación", async () => {
    const job = await createJob();
    for (const status of ["failed", "nsfw"]) {
      await expect(
        deliver(job.id, {
          body: { request_id: REQUEST_ID, status, error: "x", payload: null },
        }),
      ).resolves.toEqual({ status: 200, syncJobId: job.id });
    }
  });

  it("rechaza una firma inválida o de otro job", async () => {
    const job = await createJob();
    const other = await createJob({
      providerJobId: "22222222-2222-4222-8222-222222222222",
    });

    await expect(deliver(job.id, { signature: "00" })).resolves.toEqual({
      status: 401,
    });
    await expect(
      deliver(job.id, { signature: signWebhookReference(SECRET, other.id) }),
    ).resolves.toEqual({ status: 401 });
    await expect(
      deliver(job.id, { signature: signWebhookReference("otro", job.id) }),
    ).resolves.toEqual({ status: 401 });
  });

  it("sin secreto configurado rechaza todo", async () => {
    const job = await createJob();
    await expect(deliver(job.id, { secret: null })).resolves.toEqual({
      status: 401,
    });
  });

  it("rechaza un cuerpo que no es el sobre documentado", async () => {
    const job = await createJob();
    await expect(deliver(job.id, { body: null })).resolves.toEqual({
      status: 400,
    });
    await expect(
      deliver(job.id, { body: { request_id: REQUEST_ID, status: "listo" } }),
    ).resolves.toEqual({ status: 400 });
  });

  it("no sincroniza un job de otro proveedor ni uno inexistente", async () => {
    const mockJob = await createJob({ provider: "mock" });
    await expect(deliver(mockJob.id)).resolves.toEqual({ status: 404 });
    await expect(
      deliver("8f8f8f8f-8f8f-4f8f-8f8f-8f8f8f8f8f8f"),
    ).resolves.toEqual({ status: 404 });
  });

  it("rechaza el aviso de otra solicitud de Higgsfield", async () => {
    const job = await createJob({
      providerJobId: "11111111-1111-4111-8111-111111111111",
    });
    await expect(deliver(job.id)).resolves.toEqual({ status: 409 });
  });

  it("si el envío todavía no guardó el id, lo deja al polling", async () => {
    const job = await createJob({ providerJobId: null });
    await expect(deliver(job.id)).resolves.toEqual({
      status: 200,
      syncJobId: null,
    });
  });
});
