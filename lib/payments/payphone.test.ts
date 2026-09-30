import { describe, expect, it } from "vitest";

import { CheckoutGatewayError } from "./checkout";
import { createPayphoneGateway } from "./payphone";

type Call = { url: string; init: RequestInit };

function fakeFetch(body: unknown, init: ResponseInit = {}) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, requestInit: RequestInit) => {
    calls.push({ url, init: requestInit });
    return new Response(JSON.stringify(body), init);
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

const request = {
  purchaseId: "7f0d5a1c-2b1e-4c55-9a55-6d9f3c8b1a10",
  amounts: { baseCents: 435, taxCents: 65, totalCents: 500 },
  reference: "Oniric · 500 créditos",
  email: "ana@negocio.ec",
  responseUrl: "https://oniric.test/api/payments/payphone/return",
  cancellationUrl: "https://oniric.test/credits?purchase=x&canceled=1",
};

describe("Payphone: prepare", () => {
  it("envía los montos en centavos con el IVA separado y devuelve la página de pago", async () => {
    const { fetchFn, calls } = fakeFetch({
      paymentId: "abc",
      payWithCard:
        "https://pay.payphonetodoesposible.com/Anonymous/Index?paymentId=abc",
    });
    const gateway = createPayphoneGateway({
      token: "secreto",
      storeId: "tienda-1",
      fetch: fetchFn,
    });

    const { redirectUrl } = await gateway.prepare(request);

    expect(redirectUrl).toContain("paymentId=abc");
    expect(calls[0]?.url).toBe(
      "https://pay.payphonetodoesposible.com/api/button/Prepare",
    );
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: "Bearer secreto",
    });
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      amount: 500,
      amountWithoutTax: 0,
      amountWithTax: 435,
      tax: 65,
      service: 0,
      tip: 0,
      currency: "USD",
      clientTransactionId: request.purchaseId,
      storeId: "tienda-1",
      reference: "Oniric · 500 créditos",
      responseUrl: request.responseUrl,
      cancellationUrl: request.cancellationUrl,
    });
  });

  it("si Payphone responde con error, falla sin mostrar el token", async () => {
    const { fetchFn } = fakeFetch(
      { message: "Token inválido", errorCode: 401 },
      { status: 401 },
    );
    const gateway = createPayphoneGateway({
      token: "secreto",
      storeId: "tienda-1",
      fetch: fetchFn,
    });

    const error = await gateway.prepare(request).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CheckoutGatewayError);
    expect(String(error)).toContain("Token inválido");
    expect(String(error)).not.toContain("secreto");
  });
});

describe("Payphone: confirm", () => {
  const approved = {
    statusCode: 3,
    transactionStatus: "Approved",
    transactionId: 23178284,
    clientTransactionId: request.purchaseId,
    amount: 500,
    currency: "USD",
    authorizationCode: "W23178284",
    email: "ana@negocio.ec",
    phoneNumber: "593999999999",
    document: "1234567890",
    optionalParameter4: "ANA PEREZ",
    cardBrand: "Visa Pichincha",
    lastDigits: "XX17",
  };

  it("consulta el pago y devuelve los datos del pagador", async () => {
    const { fetchFn, calls } = fakeFetch(approved);
    const gateway = createPayphoneGateway({
      token: "secreto",
      storeId: "tienda-1",
      fetch: fetchFn,
    });

    const confirmation = await gateway.confirm({
      transactionId: "23178284",
      clientTransactionId: request.purchaseId,
      expectedAmountCents: 500,
    });

    expect(calls[0]?.url).toBe(
      "https://pay.payphonetodoesposible.com/api/button/V2/Confirm",
    );
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      id: 23178284,
      clientTxId: request.purchaseId,
    });
    expect(confirmation).toMatchObject({
      status: "approved",
      transactionId: "23178284",
      amountCents: 500,
      authorizationCode: "W23178284",
      payer: {
        name: "ANA PEREZ",
        email: "ana@negocio.ec",
        phone: "593999999999",
        document: "1234567890",
      },
      card: { brand: "Visa Pichincha", lastDigits: "XX17" },
    });
  });

  it("un pago cancelado no es aprobado", async () => {
    const { fetchFn } = fakeFetch({
      ...approved,
      statusCode: 2,
      transactionStatus: "Canceled",
    });
    const gateway = createPayphoneGateway({
      token: "secreto",
      storeId: "tienda-1",
      fetch: fetchFn,
    });

    await expect(
      gateway.confirm({
        transactionId: "23178284",
        clientTransactionId: request.purchaseId,
        expectedAmountCents: 500,
      }),
    ).resolves.toMatchObject({ status: "canceled" });
  });

  it("rechaza un id que no es numérico sin llamar a Payphone", async () => {
    const { fetchFn, calls } = fakeFetch(approved);
    const gateway = createPayphoneGateway({
      token: "secreto",
      storeId: "tienda-1",
      fetch: fetchFn,
    });

    await expect(
      gateway.confirm({
        transactionId: "abc",
        clientTransactionId: request.purchaseId,
        expectedAmountCents: 500,
      }),
    ).rejects.toBeInstanceOf(CheckoutGatewayError);
    expect(calls).toHaveLength(0);
  });
});
