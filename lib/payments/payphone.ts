import {
  CheckoutGatewayError,
  type CheckoutConfirmation,
  type CheckoutGateway,
} from "./checkout";

// Botón de pago de Payphone por redirección:
// https://docs.payphone.app/boton-de-pago-por-redireccion
//
// 1. Prepare: se envían los montos (en centavos, con el IVA separado) y
//    Payphone devuelve la página de pago.
// 2. El cliente paga y Payphone lo redirige a la URL de respuesta con `id` y
//    `clientTransactionId`.
// 3. Confirm: el servidor consulta el resultado con esos dos datos. Sin
//    confirmación en 5 minutos, Payphone reversa el pago.

const API_URL = "https://pay.payphonetodoesposible.com/api/button";
const TIMEOUT_MS = 20_000;

/** Payphone: 3 = aprobada, 2 = cancelada. */
const STATUS_APPROVED = 3;

type PrepareResponse = {
  paymentId?: string;
  payWithCard?: string;
  payWithPayPhone?: string;
};

type ConfirmResponse = {
  statusCode?: number;
  transactionStatus?: string;
  transactionId?: number;
  clientTransactionId?: string;
  amount?: number;
  currency?: string;
  authorizationCode?: string;
  email?: string;
  phoneNumber?: string;
  document?: string;
  optionalParameter4?: string;
  cardBrand?: string;
  lastDigits?: string;
  message?: string | null;
};

export function createPayphoneGateway(options: {
  token: string;
  storeId: string;
  fetch?: typeof fetch;
}): CheckoutGateway {
  const fetchFn = options.fetch ?? fetch;

  async function post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetchFn(`${API_URL}/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new CheckoutGatewayError(
        `Payphone no respondió (${path}): ${String(error)}`,
      );
    }
    const data = (await response.json().catch(() => null)) as
      (T & { message?: string }) | null;
    if (!response.ok || !data) {
      // Nunca se incluye el token en el mensaje.
      throw new CheckoutGatewayError(
        `Payphone respondió ${response.status} (${path}): ${data?.message ?? "sin detalle"}`,
      );
    }
    return data;
  }

  return {
    id: "payphone",

    async prepare(request) {
      const data = await post<PrepareResponse>("Prepare", {
        // Montos en centavos: el total es la base con IVA más el IVA.
        amount: request.amounts.totalCents,
        amountWithoutTax: 0,
        amountWithTax: request.amounts.baseCents,
        tax: request.amounts.taxCents,
        service: 0,
        tip: 0,
        currency: "USD",
        clientTransactionId: request.purchaseId,
        storeId: options.storeId,
        reference: request.reference,
        responseUrl: request.responseUrl,
        cancellationUrl: request.cancellationUrl,
        email: request.email,
        // TODO(producto): Payphone solo tiene español e inglés.
        lang: "es",
        timeZone: -5,
      });
      if (!data.payWithCard) {
        throw new CheckoutGatewayError(
          "Payphone no devolvió la página de pago.",
        );
      }
      return { redirectUrl: data.payWithCard };
    },

    async confirm({ transactionId, clientTransactionId }) {
      const id = Number(transactionId);
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new CheckoutGatewayError(
          `Id de transacción inválido: ${transactionId}`,
        );
      }
      const data = await post<ConfirmResponse>("V2/Confirm", {
        id,
        clientTxId: clientTransactionId,
      });
      return toConfirmation(data, transactionId, clientTransactionId);
    },
  };
}

function toConfirmation(
  data: ConfirmResponse,
  transactionId: string,
  clientTransactionId: string,
): CheckoutConfirmation {
  const common = {
    transactionId: String(data.transactionId ?? transactionId),
    clientTransactionId: data.clientTransactionId ?? clientTransactionId,
    raw: data,
  };
  if (data.statusCode !== STATUS_APPROVED) {
    return { status: "canceled", ...common };
  }
  return {
    status: "approved",
    ...common,
    amountCents: data.amount ?? 0,
    currency: data.currency ?? "USD",
    authorizationCode: data.authorizationCode,
    payer: {
      name: data.optionalParameter4 || undefined,
      email: data.email || undefined,
      phone: data.phoneNumber || undefined,
      document: data.document || undefined,
    },
    card: {
      brand: data.cardBrand || undefined,
      lastDigits: data.lastDigits || undefined,
    },
  };
}
