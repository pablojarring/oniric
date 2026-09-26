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

import { startGeneration, syncJob } from "./service";

// Concurrencia real contra el Postgres de Supabase local (`pnpm supabase:start`).

const client = postgres(process.env.DATABASE_URL ?? "", { max: 10 });
const db: Database = drizzle({ client, schema, casing: "snake_case" });
const provider = new MockProvider({ latencyMs: 0 });

afterAll(async () => {
  await client.end();
});

describe.skipIf(!process.env.DATABASE_URL)("jobs con concurrencia real", () => {
  it("sincronizar el mismo job en paralelo cobra una sola vez", async () => {
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
      credits: 100,
      note: "Test de jobs",
    });

    const job = await startGeneration(db, provider, {
      organizationId: organization.id,
      userId: user.id,
      request: {
        modelId: "mock-video-standard",
        prompt: "Promo",
        aspectRatio: "9:16",
        durationSeconds: 10,
      },
    });

    // Barrera: fetchOutput espera a que lleguen las 5 sincronizaciones y las
    // suelta juntas, así las 5 transacciones que cierran el job compiten de
    // verdad.
    const parallel = 5;
    let arrived = 0;
    let releaseAll = () => {};
    const allArrived = new Promise<void>((resolve) => {
      releaseAll = resolve;
    });
    const racingProvider = Object.assign(Object.create(provider), {
      fetchOutput: async (providerJobId: string) => {
        arrived += 1;
        if (arrived === parallel) releaseAll();
        await allArrived;
        return provider.fetchOutput(providerJobId);
      },
    }) as MockProvider;

    const results = await Promise.all(
      Array.from({ length: parallel }, () =>
        syncJob(db, () => racingProvider, job.id),
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
      available: 34,
      held: 0,
    });
  });
});
