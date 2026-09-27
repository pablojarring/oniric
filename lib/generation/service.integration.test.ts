import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import type { Database } from "@/db/types";
import { getBalance, grantCredits } from "@/lib/billing/wallet";
import { createOrganizationForOwner } from "@/lib/organizations/service";
import { MockProvider } from "@/lib/providers/mock";
import { ensureUser } from "@/lib/users/service";
import { createMemoryStorage } from "@/test/storage";

import { RateLimitExceededError, startGeneration, syncJob } from "./service";

// Concurrencia real contra el Postgres de Supabase local (`pnpm supabase:start`).

const client = postgres(process.env.DATABASE_URL ?? "", { max: 10 });
const db: Database = drizzle({ client, schema, casing: "snake_case" });
const provider = new MockProvider({ latencyMs: 0 });
const { storage } = createMemoryStorage();

afterAll(async () => {
  await client.end();
});

// 10 s de video estándar: 70 créditos.
const request = {
  modelId: "mock-video-standard",
  prompt: "Promo",
  aspectRatio: "9:16",
  durationSeconds: 10,
} as const;

async function fundedOrganization(credits: number) {
  const id = randomUUID();
  const email = `jobs-${id.slice(0, 8)}@oniric.test`;
  await db.execute(
    sql`insert into auth.users (id, email) values (${id}, ${email})`,
  );
  const user = await ensureUser(db, { id, email, locale: "es" });
  const organization = await createOrganizationForOwner(db, user.id, {
    businessName: "Jobs en paralelo",
    country: "EC",
    industry: "retail",
    teamSize: "1",
    teamType: "owner",
    videoPurposes: ["social_media"],
  });
  await grantCredits(db, {
    organizationId: organization.id,
    credits,
    note: "Test de jobs",
  });
  return { user, organization };
}

/**
 * Barrera: la función envuelta espera a que lleguen `parties` llamadas y las
 * suelta juntas, para que las transacciones que siguen compitan de verdad.
 */
function barrier<Args extends unknown[], Result>(
  parties: number,
  fn: (...args: Args) => Promise<Result>,
) {
  let arrived = 0;
  let releaseAll = () => {};
  const allArrived = new Promise<void>((resolve) => {
    releaseAll = resolve;
  });
  return async (...args: Args) => {
    arrived += 1;
    if (arrived === parties) releaseAll();
    await allArrived;
    return fn(...args);
  };
}

describe.skipIf(!process.env.DATABASE_URL)("jobs con concurrencia real", () => {
  it("sincronizar el mismo job en paralelo cobra una sola vez", async () => {
    const { user, organization } = await fundedOrganization(100);

    const job = await startGeneration(db, provider, {
      organizationId: organization.id,
      userId: user.id,
      request,
    });

    // Las 5 transacciones que cierran el job arrancan juntas.
    const parallel = 5;
    const racingProvider = Object.assign(Object.create(provider), {
      fetchOutput: barrier(parallel, (providerJobId: string) =>
        provider.fetchOutput(providerJobId),
      ),
    }) as MockProvider;

    const results = await Promise.all(
      Array.from({ length: parallel }, () =>
        syncJob(
          db,
          { resolveProvider: () => racingProvider, outputs: storage },
          job.id,
        ),
      ),
    );

    expect(results.every((result) => result.status === "succeeded")).toBe(true);
    const settles = await db
      .select()
      .from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.jobId, job.id));
    expect(settles.map((entry) => entry.type).sort()).toEqual([
      "reserve",
      "settle",
    ]);
    expect(await getBalance(db, organization.id)).toEqual({
      available: 30,
      held: 0,
    });
  });

  it("el límite por organización se respeta con generaciones simultáneas", async () => {
    const { user, organization } = await fundedOrganization(1_000);
    const parallel = 6;
    const racingProvider = Object.assign(Object.create(provider), {
      estimate: barrier(parallel, (req: typeof request) =>
        provider.estimate(req),
      ),
    }) as MockProvider;

    const results = await Promise.allSettled(
      Array.from({ length: parallel }, () =>
        startGeneration(db, racingProvider, {
          organizationId: organization.id,
          userId: user.id,
          request,
          rateLimit: { maxJobs: 2, windowSeconds: 3_600 },
        }),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(RateLimitExceededError);
      }
    }
    expect(await getBalance(db, organization.id)).toEqual({
      available: 860,
      held: 140,
    });
  });
});
