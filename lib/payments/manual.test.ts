import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { creditTransactions } from "@/db/schema";
import { getBalance } from "@/lib/billing/wallet";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";

import {
  InvalidManualCreditError,
  MAX_MANUAL_CREDITS,
  manualPaymentProvider,
} from "./manual";

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

describe("manualPaymentProvider", () => {
  it("acredita en el ledger con la referencia y el admin", async () => {
    const { organization, user } = await createOrganization(testDb);

    await manualPaymentProvider.fulfill(testDb.db, {
      organizationId: organization.id,
      credits: 1_000,
      reference: "  Transferencia Banco 4567  ",
      actorUserId: user.id,
    });

    expect(await getBalance(testDb.db, organization.id)).toEqual({
      available: 1_000,
      held: 0,
    });
    const [entry] = await testDb.db.select().from(creditTransactions);
    expect(entry).toMatchObject({
      type: "grant",
      note: "[manual] Transferencia Banco 4567",
      actorUserId: user.id,
    });
  });

  it.each([
    [{ credits: 0 }, "credits"],
    [{ credits: 10.5 }, "credits"],
    [{ credits: MAX_MANUAL_CREDITS + 1 }, "credits"],
    [{ reference: "   " }, "reference"],
    [{ reference: "x".repeat(201) }, "reference"],
  ])("rechaza %o sin acreditar", async (override, field) => {
    const { organization } = await createOrganization(testDb);

    await expect(
      manualPaymentProvider.fulfill(testDb.db, {
        organizationId: organization.id,
        credits: 100,
        reference: "Cortesía",
        ...override,
      }),
    ).rejects.toMatchObject({ constructor: InvalidManualCreditError, field });
    expect(await testDb.db.select().from(creditTransactions)).toEqual([]);
  });
});
