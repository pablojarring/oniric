import type { CreditPurchase } from "@/db/schema";

/**
 * Tiempo después del cual una compra que sigue pendiente se da por no
 * completada: Payphone reversa los pagos que no se confirman en 5 minutos.
 */
export const PENDING_PURCHASE_TIMEOUT_MS = 10 * 60 * 1_000;

export type PurchaseResult = "paid" | "failed" | "canceled" | "pending";

/** Qué mostrarle al cliente cuando vuelve de la página de pago. */
export function purchaseResult(
  purchase: Pick<CreditPurchase, "status" | "failureReason" | "createdAt">,
  options: { canceled: boolean; now: Date },
): PurchaseResult {
  switch (purchase.status) {
    case "paid":
      return "paid";
    case "failed":
      return purchase.failureReason === "canceled" ? "canceled" : "failed";
    case "pending":
      if (options.canceled) return "canceled";
      return options.now.getTime() - purchase.createdAt.getTime() >
        PENDING_PURCHASE_TIMEOUT_MS
        ? "failed"
        : "pending";
  }
}
