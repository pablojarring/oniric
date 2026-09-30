import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { creditPurchases, creditTransactions } from "@/db/schema";
import { getBalance } from "@/lib/billing/wallet";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";

import {
  CheckoutGatewayError,
  type CheckoutConfirmation,
  type CheckoutGateway,
} from "./checkout";
import { mockCheckoutGateway } from "./mock-checkout";
import {
  CHECKOUT_RATE_LIMIT,
  CheckoutRateLimitError,
  confirmPurchase,
  getOrganizationPurchase,
  listPurchases,
  startCheckout,
} from "./purchases";

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

const siteUrl = "https://oniric.test";

/** Pasarela de prueba cuya confirmación se puede elegir en cada test. */
function gatewayWith(
  confirm: (input: {
    transactionId: string;
    clientTransactionId: string;
    expectedAmountCents: number;
  }) => Promise<CheckoutConfirmation>,
): CheckoutGateway {
  return { ...mockCheckoutGateway, confirm };
}

async function checkout(gateway: CheckoutGateway = mockCheckoutGateway) {
  const { user, organization } = await createOrganization(testDb);
  const result = await startCheckout(testDb.db, gateway, {
    organizationId: organization.id,
    userId: user.id,
    packageId: "entrepreneur",
    email: "ana@negocio.ec",
    reference: "Oniric · 1.575 créditos",
    siteUrl,
  });
  return { user, organization, ...result };
}

function returnParams(redirectUrl: string) {
  const url = new URL(redirectUrl);
  return {
    transactionId: url.searchParams.get("id") ?? "",
    clientTransactionId: url.searchParams.get("clientTransactionId") ?? "",
  };
}

describe("startCheckout", () => {
  it("crea la compra pendiente con el desglose de IVA y lleva a pagar", async () => {
    const { purchase, redirectUrl } = await checkout();

    expect(purchase).toMatchObject({
      status: "pending",
      packageId: "entrepreneur",
      credits: 1_575,
      baseCents: 1_304,
      taxCents: 196,
      totalCents: 1_500,
      currency: "USD",
      gateway: "mock",
    });
    expect(redirectUrl).toMatch(
      /^https:\/\/oniric\.test\/api\/payments\/payphone\/return\?/,
    );
    expect(returnParams(redirectUrl).clientTransactionId).toBe(purchase.id);
  });

  it("si la pasarela falla, la compra queda fallida", async () => {
    const failing: CheckoutGateway = {
      ...mockCheckoutGateway,
      prepare: async () => {
        throw new CheckoutGatewayError("caído");
      },
    };

    await expect(checkout(failing)).rejects.toBeInstanceOf(
      CheckoutGatewayError,
    );
    const [stored] = await testDb.db.select().from(creditPurchases);
    expect(stored).toMatchObject({
      status: "failed",
      failureReason: "prepare_failed",
    });
  });

  it("limita las compras iniciadas por hora", async () => {
    const { user, organization } = await createOrganization(testDb);
    const start = () =>
      startCheckout(testDb.db, mockCheckoutGateway, {
        organizationId: organization.id,
        userId: user.id,
        packageId: "starter",
        reference: "x",
        siteUrl,
      });

    for (let index = 0; index < CHECKOUT_RATE_LIMIT.maxPurchases; index++) {
      await start();
    }
    await expect(start()).rejects.toBeInstanceOf(CheckoutRateLimitError);
  });
});

describe("confirmPurchase", () => {
  it("con el pago aprobado acredita los créditos y guarda los datos del pagador", async () => {
    const { organization, purchase, redirectUrl } = await checkout();

    const result = await confirmPurchase(
      testDb.db,
      mockCheckoutGateway,
      returnParams(redirectUrl),
    );

    expect(result.outcome).toBe("paid");
    expect(result.purchase).toMatchObject({
      id: purchase.id,
      status: "paid",
      authorizationCode: "MOCK",
      payerEmail: "pagos@oniric.test",
    });
    expect(result.purchase?.lotId).toBeTruthy();
    expect(await getBalance(testDb.db, organization.id)).toEqual({
      available: 1_575,
      held: 0,
    });
  });

  it("es idempotente: confirmar dos veces acredita una sola vez", async () => {
    const { organization, redirectUrl } = await checkout();
    const params = returnParams(redirectUrl);

    const results = await Promise.all([
      confirmPurchase(testDb.db, mockCheckoutGateway, params),
      confirmPurchase(testDb.db, mockCheckoutGateway, params),
    ]);
    const again = await confirmPurchase(testDb.db, mockCheckoutGateway, params);

    expect(results.map((result) => result.outcome)).toEqual(["paid", "paid"]);
    expect(again.outcome).toBe("paid");
    const grants = await testDb.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.organizationId, organization.id));
    expect(grants).toHaveLength(1);
    expect(await getBalance(testDb.db, organization.id)).toEqual({
      available: 1_575,
      held: 0,
    });
  });

  it("un pago cancelado deja la compra fallida y no acredita", async () => {
    const { organization, redirectUrl } = await checkout();
    const canceled = gatewayWith(async (input) => ({
      status: "canceled",
      transactionId: input.transactionId,
      clientTransactionId: input.clientTransactionId,
      raw: { statusCode: 2 },
    }));

    const result = await confirmPurchase(
      testDb.db,
      canceled,
      returnParams(redirectUrl),
    );

    expect(result.outcome).toBe("failed");
    expect(result.purchase).toMatchObject({
      status: "failed",
      failureReason: "canceled",
    });
    expect(await getBalance(testDb.db, organization.id)).toEqual({
      available: 0,
      held: 0,
    });
  });

  it("si el monto pagado no coincide, no acredita", async () => {
    const { organization, redirectUrl } = await checkout();
    const wrongAmount = gatewayWith(async (input) => ({
      ...(await mockCheckoutGateway.confirm(input)),
      amountCents: 100,
    }));

    const result = await confirmPurchase(
      testDb.db,
      wrongAmount,
      returnParams(redirectUrl),
    );

    expect(result.purchase).toMatchObject({
      status: "failed",
      failureReason: "amount_mismatch",
    });
    expect((await getBalance(testDb.db, organization.id)).available).toBe(0);
  });

  it("si no se puede consultar a la pasarela, la compra sigue pendiente", async () => {
    const { redirectUrl } = await checkout();
    const down = gatewayWith(async () => {
      throw new CheckoutGatewayError("sin respuesta");
    });

    const result = await confirmPurchase(
      testDb.db,
      down,
      returnParams(redirectUrl),
    );

    expect(result.outcome).toBe("pending");
    expect(result.purchase?.status).toBe("pending");

    // Al recargar, con la pasarela sana, se acredita.
    const retry = await confirmPurchase(
      testDb.db,
      mockCheckoutGateway,
      returnParams(redirectUrl),
    );
    expect(retry.outcome).toBe("paid");
  });

  it("no acepta la confirmación de otra compra", async () => {
    const { redirectUrl } = await checkout();
    const other = gatewayWith(async (input) => ({
      ...(await mockCheckoutGateway.confirm(input)),
      clientTransactionId: "00000000-0000-4000-8000-000000000000",
    }));

    const result = await confirmPurchase(
      testDb.db,
      other,
      returnParams(redirectUrl),
    );

    expect(result.outcome).toBe("pending");
  });

  it("ignora compras inexistentes o de otra pasarela", async () => {
    const { redirectUrl } = await checkout();
    const params = returnParams(redirectUrl);

    expect(
      (
        await confirmPurchase(testDb.db, mockCheckoutGateway, {
          ...params,
          clientTransactionId: "no-es-un-uuid",
        })
      ).outcome,
    ).toBe("not_found");
    expect(
      (
        await confirmPurchase(
          testDb.db,
          { ...mockCheckoutGateway, id: "payphone" },
          params,
        )
      ).outcome,
    ).toBe("not_found");
  });
});

describe("consultas", () => {
  it("una organización solo ve sus compras", async () => {
    const { organization, purchase } = await checkout();
    const other = await createOrganization(testDb);

    expect(
      await getOrganizationPurchase(testDb.db, organization.id, purchase.id),
    ).toMatchObject({ id: purchase.id });
    expect(
      await getOrganizationPurchase(
        testDb.db,
        other.organization.id,
        purchase.id,
      ),
    ).toBeUndefined();
  });

  it("el admin lista las compras con el nombre del negocio", async () => {
    const { redirectUrl } = await checkout();
    await confirmPurchase(
      testDb.db,
      mockCheckoutGateway,
      returnParams(redirectUrl),
    );

    const paid = await listPurchases(testDb.db, { status: "paid" });

    expect(paid).toHaveLength(1);
    expect(paid[0]).toMatchObject({
      organizationName: "Panadería La Esquina",
      totalCents: 1_500,
    });
  });
});
