import { eq, sql, sum } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { creditLots, creditTransactions } from "@/db/schema";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization, insertJob } from "@/test/fixtures";

import {
  expireAllDueLots,
  getBalance,
  grantCredits,
  InsufficientCreditsError,
  refundReservation,
  ReservationStateError,
  reserveCredits,
  settleReservation,
} from "./wallet";

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

const JAN_1 = new Date("2026-01-01T12:00:00Z");
const daysAfter = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

async function grant(organizationId: string, credits: number, now = JAN_1) {
  return grantCredits(testDb.db, {
    organizationId,
    credits,
    note: "Acreditación de prueba",
    now,
  });
}

async function reserve(organizationId: string, credits: number, now = JAN_1) {
  const job = await insertJob(testDb, organizationId, credits);
  await testDb.db.transaction((tx) =>
    reserveCredits(tx, { organizationId, jobId: job.id, credits, now }),
  );
  return job;
}

/** El ledger y los lotes siempre deben coincidir. */
async function expectLedgerMatchesLots(organizationId: string) {
  const [ledger] = await testDb.db
    .select({
      available: sum(creditTransactions.availableDelta).mapWith(Number),
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.organizationId, organizationId));
  const [lots] = await testDb.db
    .select({ remaining: sum(creditLots.remainingCredits).mapWith(Number) })
    .from(creditLots)
    .where(eq(creditLots.organizationId, organizationId));
  expect(ledger?.available ?? 0).toBe(lots?.remaining ?? 0);
}

describe("grantCredits", () => {
  it("los créditos pyme vencen a los 12 meses", async () => {
    const { organization } = await createOrganization(testDb, "pyme");

    const lot = await grant(organization.id, 500);

    expect(lot.expiresAt).toEqual(new Date("2027-01-01T12:00:00Z"));
    expect(await getBalance(testDb.db, organization.id, JAN_1)).toEqual({
      available: 500,
      held: 0,
    });
  });

  it("los créditos empresa no vencen (por ahora)", async () => {
    const { organization } = await createOrganization(testDb, "empresa");

    const lot = await grant(organization.id, 500);

    expect(lot.expiresAt).toBeNull();
  });

  it("rechaza cantidades inválidas", async () => {
    const { organization } = await createOrganization(testDb);

    for (const credits of [0, -5, 1.5]) {
      await expect(grant(organization.id, credits)).rejects.toThrow();
    }
  });
});

describe("reserva, liquidación y reembolso", () => {
  it("reserva descuenta del disponible y liquidar lo cobra", async () => {
    const { organization } = await createOrganization(testDb);
    await grant(organization.id, 100);

    const job = await reserve(organization.id, 66);
    expect(await getBalance(testDb.db, organization.id, JAN_1)).toEqual({
      available: 34,
      held: 66,
    });

    await testDb.db.transaction((tx) =>
      settleReservation(tx, { organizationId: organization.id, jobId: job.id }),
    );
    expect(await getBalance(testDb.db, organization.id, JAN_1)).toEqual({
      available: 34,
      held: 0,
    });
    await expectLedgerMatchesLots(organization.id);
  });

  it("el reembolso devuelve todo a los mismos lotes", async () => {
    const { organization } = await createOrganization(testDb);
    const first = await grant(organization.id, 40);
    const second = await grant(organization.id, 40, daysAfter(JAN_1, 10));

    const job = await reserve(organization.id, 60);
    await testDb.db.transaction((tx) =>
      refundReservation(tx, { organizationId: organization.id, jobId: job.id }),
    );

    const lots = await testDb.db.select().from(creditLots);
    expect(lots.find((lot) => lot.id === first.id)?.remainingCredits).toBe(40);
    expect(lots.find((lot) => lot.id === second.id)?.remainingCredits).toBe(40);
    expect(await getBalance(testDb.db, organization.id, JAN_1)).toEqual({
      available: 80,
      held: 0,
    });
    await expectLedgerMatchesLots(organization.id);
  });

  it("usa primero los créditos que vencen antes", async () => {
    const { organization } = await createOrganization(testDb);
    const later = await grant(organization.id, 50, daysAfter(JAN_1, 30));
    const sooner = await grant(organization.id, 50, JAN_1);

    await reserve(organization.id, 60, daysAfter(JAN_1, 31));

    const lots = await testDb.db.select().from(creditLots);
    expect(lots.find((lot) => lot.id === sooner.id)?.remainingCredits).toBe(0);
    expect(lots.find((lot) => lot.id === later.id)?.remainingCredits).toBe(40);
  });

  it("sin saldo suficiente falla y no toca nada", async () => {
    const { organization } = await createOrganization(testDb);
    await grant(organization.id, 10);

    const error = await reserve(organization.id, 66).catch((error) => error);

    expect(error).toBeInstanceOf(InsufficientCreditsError);
    expect(error).toMatchObject({ required: 66, available: 10 });
    expect(await getBalance(testDb.db, organization.id, JAN_1)).toEqual({
      available: 10,
      held: 0,
    });
  });

  it("una reserva se cierra una sola vez", async () => {
    const { organization } = await createOrganization(testDb);
    await grant(organization.id, 100);
    const job = await reserve(organization.id, 10);
    const input = { organizationId: organization.id, jobId: job.id };

    await testDb.db.transaction((tx) => settleReservation(tx, input));

    await expect(
      testDb.db.transaction((tx) => settleReservation(tx, input)),
    ).rejects.toThrow(ReservationStateError);
    await expect(
      testDb.db.transaction((tx) => refundReservation(tx, input)),
    ).rejects.toThrow(ReservationStateError);
  });
});

describe("vencimiento", () => {
  it("los créditos vencidos no se pueden usar", async () => {
    const { organization } = await createOrganization(testDb);
    await grant(organization.id, 100);
    const afterExpiry = new Date("2027-01-02T00:00:00Z");

    expect(await getBalance(testDb.db, organization.id, afterExpiry)).toEqual({
      available: 0,
      held: 0,
    });
    await expect(reserve(organization.id, 1, afterExpiry)).rejects.toThrow(
      InsufficientCreditsError,
    );
    await expectLedgerMatchesLots(organization.id);
  });

  it("el cron registra el vencimiento en el ledger", async () => {
    const { organization } = await createOrganization(testDb);
    const lot = await grant(organization.id, 100);
    await reserve(organization.id, 30);

    const expired = await expireAllDueLots(
      testDb.db,
      new Date("2027-01-02T00:00:00Z"),
    );

    expect(expired).toBe(1);
    const entries = await testDb.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.type, "expire"));
    expect(entries).toEqual([
      expect.objectContaining({ lotId: lot.id, availableDelta: -70 }),
    ]);
    await expectLedgerMatchesLots(organization.id);
  });
});

describe("ledger", () => {
  it("es inmutable: no se puede editar ni borrar", async () => {
    const { organization } = await createOrganization(testDb);
    await grant(organization.id, 100);

    // Drizzle envuelve el error de Postgres; el del trigger queda en `cause`.
    const rejectedByTrigger = {
      cause: expect.objectContaining({
        message: expect.stringContaining("credit_transactions es inmutable"),
      }),
    };
    await expect(
      testDb.db.execute(
        sql`update credit_transactions set available_delta = 1000000`,
      ),
    ).rejects.toMatchObject(rejectedByTrigger);
    await expect(
      testDb.db.execute(sql`delete from credit_transactions`),
    ).rejects.toMatchObject(rejectedByTrigger);
  });
});
