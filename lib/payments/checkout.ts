import type { PriceBreakdown } from "@/lib/billing/packages";

// Pasarela de cobro en línea (checkout): prepara el pago, el cliente paga en la
// página de la pasarela y vuelve a Oniric, que confirma el resultado con la
// pasarela desde el servidor. Ver docs/pagos.md.

export type CheckoutRequest = {
  /** Id de la compra; la pasarela lo devuelve como `clientTransactionId`. */
  purchaseId: string;
  amounts: PriceBreakdown;
  /** Motivo del cobro que ve el cliente, p. ej. "Oniric · 500 créditos". */
  reference: string;
  /** Correo del comprador, para prellenar el formulario de pago. */
  email?: string;
  /** Adónde vuelve el cliente después de pagar (la pasarela agrega sus parámetros). */
  responseUrl: string;
  /** Adónde vuelve si cancela en la página de pago. */
  cancellationUrl: string;
};

export type CheckoutPayer = {
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
};

export type CheckoutConfirmation =
  | {
      status: "approved";
      transactionId: string;
      clientTransactionId: string;
      amountCents: number;
      currency: string;
      authorizationCode?: string;
      payer: CheckoutPayer;
      card: { brand?: string; lastDigits?: string };
      raw: unknown;
    }
  | {
      /** Cancelado o rechazado: no se cobró. */
      status: "canceled";
      transactionId: string;
      clientTransactionId: string;
      raw: unknown;
    };

export interface CheckoutGateway {
  readonly id: string;
  /** Crea el cobro y devuelve la página de pago a la que se redirige al cliente. */
  prepare(request: CheckoutRequest): Promise<{ redirectUrl: string }>;
  /**
   * Consulta el resultado del pago. Payphone reversa el pago si no se confirma
   * dentro de los 5 minutos siguientes.
   */
  confirm(input: {
    transactionId: string;
    clientTransactionId: string;
    /** Solo lo usa la pasarela de prueba para simular el pago. */
    expectedAmountCents: number;
  }): Promise<CheckoutConfirmation>;
}

/** La pasarela respondió con error o no respondió: el resultado es desconocido. */
export class CheckoutGatewayError extends Error {}
