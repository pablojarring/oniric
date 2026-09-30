import { randomInt } from "node:crypto";

import type { CheckoutGateway } from "./checkout";

/**
 * Pasarela de prueba para desarrollo y tests (PAYMENT_GATEWAY=mock): no hay
 * página de pago; el cliente vuelve de inmediato a la URL de respuesta, como si
 * hubiera pagado. Nunca se activa en producción (ver gateway.ts).
 */
export const mockCheckoutGateway: CheckoutGateway = {
  id: "mock",

  async prepare(request) {
    const url = new URL(request.responseUrl);
    url.searchParams.set("id", String(randomInt(1, 2 ** 31)));
    url.searchParams.set("clientTransactionId", request.purchaseId);
    return { redirectUrl: url.toString() };
  },

  async confirm({ transactionId, clientTransactionId, expectedAmountCents }) {
    return {
      status: "approved",
      transactionId,
      clientTransactionId,
      amountCents: expectedAmountCents,
      currency: "USD",
      authorizationCode: "MOCK",
      payer: { name: "Pago de prueba", email: "pagos@oniric.test" },
      card: { brand: "Mock", lastDigits: "0000" },
      raw: { mock: true },
    };
  },
};
