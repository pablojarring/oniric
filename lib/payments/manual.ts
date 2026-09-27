import { grantCredits } from "@/lib/billing/wallet";

import type { PaymentProvider } from "./payment-provider";

/** Tope por acreditación manual (US$10.000), para frenar errores de tipeo. */
export const MAX_MANUAL_CREDITS = 1_000_000;

export const MAX_REFERENCE_LENGTH = 200;

export class InvalidManualCreditError extends Error {
  constructor(readonly field: "credits" | "reference") {
    super(`Acreditación manual inválida: ${field}`);
  }
}

/**
 * Pagos que se cobran fuera de la app (transferencia, efectivo) o créditos de
 * cortesía: un admin los acredita desde el panel. Queda en el ledger con la
 * referencia y el admin que lo hizo.
 */
export const manualPaymentProvider: PaymentProvider = {
  id: "manual",
  async fulfill(db, purchase) {
    const reference = purchase.reference.trim();
    if (
      !Number.isInteger(purchase.credits) ||
      purchase.credits < 1 ||
      purchase.credits > MAX_MANUAL_CREDITS
    ) {
      throw new InvalidManualCreditError("credits");
    }
    if (reference === "" || reference.length > MAX_REFERENCE_LENGTH) {
      throw new InvalidManualCreditError("reference");
    }

    await grantCredits(db, {
      organizationId: purchase.organizationId,
      credits: purchase.credits,
      note: `[manual] ${reference}`,
      actorUserId: purchase.actorUserId,
      now: purchase.now,
    });
  },
};
