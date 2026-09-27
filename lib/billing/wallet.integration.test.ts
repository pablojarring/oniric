import { randomUUID } from "node:crypto";

import { eq, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import type { Database } from "@/db/types";
import { createOrganizationForOwner } from "@/lib/organizations/service";
import { ensureUser } from "@/lib/users/service";

import {
  getBalance,
  grantCredits,
  InsufficientCreditsError,
  reserveCredits,
} from "./wallet";

// Concurrencia real: PGlite usa una sola conexión y no puede probar esto.
// Necesita `pnpm supabase:start`. Los datos quedan en la base local (el ledger
// es inmutable y no se borra).

const client = postgres(process.env.DATABASE_URL ?? "", { max: 10 });
const db: Database = drizzle({ client, schema, casing: "snake_case" });

afterAll(async () => {
  await client.end();
});

async function createFundedOrganization(credits: number) {
  const id = randomUUID();
  const email = `wallet-${id.slice(0, 8)}@oniric.test`;
  await db.execute(
    sql`insert into auth.users (id, email) values (${id}, ${email})`,
  );
  const user = await ensureUser(db, { id, email, locale: "es" });
  const organization = await createOrganizationForOwner(db, user.id, {
    businessName: "Concurrencia S.A.",
    country: "EC",
    industry: "retail",
    teamSize: "1",
    teamType: "owner",
    videoPurposes: ["social_media"],
  });
  await grantCredits(db, {
    organizationId: organization.id,
    credits,
    note: "Test de concurrencia",
  });
  return organization.id;
}

async function reserveForNewJob(organizationId: string, credits: number) {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .insert(schema.generationJobs)
      .values({
        organizationId,
        provider: "mock",
        modelId: "mock-image",
        request: { modelId: "mock-image", prompt: "x", aspectRatio: "1:1" },
        costMicroUsd: 0,
        surchargeBps: 500,
        marginBps: 2_500,
        priceCredits: credits,
      })
      .returning();
    if (!job) throw new Error("No se pudo crear el job.");
    await reserveCredits(tx, { organizationId, jobId: job.id, credits });
  });
}

describe.skipIf(!process.env.DATABASE_URL)(
  "billetera con concurrencia real",
  () => {
    it("reservas simultáneas nunca gastan más de lo disponible", async () => {
      const organizationId = await createFundedOrganization(100);

      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () => reserveForNewJob(organizationId, 30)),
      );

      const fulfilled = results.filter(
        (result) => result.status === "fulfilled",
      );
      const rejected = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      expect(fulfilled).toHaveLength(3);
      for (const { reason } of rejected) {
        expect(reason).toBeInstanceOf(InsufficientCreditsError);
      }

      expect(await getBalance(db, organizationId)).toEqual({
        available: 10,
        held: 90,
      });

      const [ledger] = await db
        .select({
          available: sum(schema.creditTransactions.availableDelta).mapWith(
            Number,
          ),
        })
        .from(schema.creditTransactions)
        .where(eq(schema.creditTransactions.organizationId, organizationId));
      expect(ledger?.available).toBe(10);
    });
  },
);
