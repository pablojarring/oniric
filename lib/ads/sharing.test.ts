import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { generationJobs } from "@/db/schema";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization, insertJob } from "@/test/fixtures";

import {
  disableShareLink,
  enableShareLink,
  getSharedAd,
  NotShareableError,
} from "./sharing";

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

async function succeededJob() {
  const context = await createOrganization(testDb);
  const job = await insertJob(testDb, context.organization.id, 3);
  await testDb.db
    .update(generationJobs)
    .set({ status: "succeeded" })
    .where(eq(generationJobs.id, job.id));
  return { ...context, job };
}

describe("enlaces públicos", () => {
  it("activa un enlace con un token aleatorio y lo reutiliza", async () => {
    const { organization, job } = await succeededJob();
    const input = { organizationId: organization.id, jobId: job.id };

    const token = await enableShareLink(testDb.db, input);

    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await enableShareLink(testDb.db, input)).toBe(token);
    expect(await getSharedAd(testDb.db, token)).toMatchObject({
      job: { id: job.id },
      businessName: "Panadería La Esquina",
    });
  });

  it("desactivar el enlace invalida el token; reactivarlo crea otro", async () => {
    const { organization, job } = await succeededJob();
    const input = { organizationId: organization.id, jobId: job.id };
    const token = await enableShareLink(testDb.db, input);

    await disableShareLink(testDb.db, input);

    expect(await getSharedAd(testDb.db, token)).toBeNull();
    const next = await enableShareLink(testDb.db, input);
    expect(next).not.toBe(token);
  });

  it("solo el dueño puede activarlo o desactivarlo", async () => {
    const { organization, job } = await succeededJob();
    const other = await createOrganization(testDb);

    await expect(
      enableShareLink(testDb.db, {
        organizationId: other.organization.id,
        jobId: job.id,
      }),
    ).rejects.toBeInstanceOf(NotShareableError);

    const token = await enableShareLink(testDb.db, {
      organizationId: organization.id,
      jobId: job.id,
    });
    await disableShareLink(testDb.db, {
      organizationId: other.organization.id,
      jobId: job.id,
    });
    expect(await getSharedAd(testDb.db, token)).not.toBeNull();
  });

  it("no comparte anuncios que no terminaron", async () => {
    const context = await createOrganization(testDb);
    const job = await insertJob(testDb, context.organization.id, 3);

    await expect(
      enableShareLink(testDb.db, {
        organizationId: context.organization.id,
        jobId: job.id,
      }),
    ).rejects.toBeInstanceOf(NotShareableError);
  });

  it("ignora tokens con formato inválido", async () => {
    expect(await getSharedAd(testDb.db, "' or 1=1 --")).toBeNull();
    expect(await getSharedAd(testDb.db, "")).toBeNull();
  });
});
