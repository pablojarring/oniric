import type { Database } from "@/db/types";

// Pasarela de pago desacoplada (CLAUDE.md §5). La pasarela real (Payphone,
// Kushki u otra) está pendiente de decidir; mientras tanto, un admin acredita
// los pagos a mano con ManualPaymentProvider.
//
// TODO(fase 3): iniciar el cobro (checkout) y verificar los webhooks de la
// pasarela elegida, con IVA separado y factura electrónica (InvoiceProvider).

/** Una compra de créditos ya pagada, lista para acreditar. */
export type CreditPurchase = {
  organizationId: string;
  credits: number;
  /** Referencia del pago o motivo: n.º de transferencia, id de la pasarela, etc. */
  reference: string;
  /** Quién la acredita (admin), si es manual. */
  actorUserId?: string;
  now?: Date;
};

export interface PaymentProvider {
  readonly id: string;
  /** Suma los créditos al ledger con la referencia del pago. */
  fulfill(db: Database, purchase: CreditPurchase): Promise<void>;
}
