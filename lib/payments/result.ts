import type { CreditPurchase } from "@/db/schema";

/**
 * Tiempo después del cual una compra que sigue pendiente se da por no
 * completada: Payphone reversa los pagos que no se confirman en 5 minutos.
 */
export const PENDING_PURCHASE_TIMEOUT_MS = 10 * 60 * 1_000;

/**
 * - `declined`: el cliente intentó pagar y la pasarela o el banco no lo
 *   aprobaron. Payphone informa los pagos rechazados como "Canceled", por eso la
 *   compra queda con `failureReason: "canceled"`.
 * - `canceled`: el cliente volvió de la página de pago sin pagar.
 */
export type PurchaseResult =
  "paid" | "failed" | "declined" | "canceled" | "pending";

type PurchaseState = Pick<CreditPurchase, "status" | "createdAt">;

/** Una compra pendiente hace rato: el cliente no terminó de pagar. */
export function isAbandoned(purchase: PurchaseState, now: Date): boolean {
  return (
    purchase.status === "pending" &&
    now.getTime() - purchase.createdAt.getTime() > PENDING_PURCHASE_TIMEOUT_MS
  );
}

/** Qué mostrarle al cliente cuando vuelve de la página de pago. */
export function purchaseResult(
  purchase: PurchaseState & Pick<CreditPurchase, "failureReason">,
  options: { canceled: boolean; now: Date },
): PurchaseResult {
  switch (purchase.status) {
    case "paid":
      return "paid";
    case "failed":
      return purchase.failureReason === "canceled" ? "declined" : "failed";
    case "pending":
      if (options.canceled) return "canceled";
      return isAbandoned(purchase, options.now) ? "failed" : "pending";
  }
}

/** Motivo que dio la pasarela al no aprobar el pago (Payphone: `message`). */
export function gatewayMessage(confirmation: unknown): string | undefined {
  if (typeof confirmation !== "object" || confirmation === null) return;
  const { message } = confirmation as { message?: unknown };
  return typeof message === "string" && message.trim() !== ""
    ? message.trim()
    : undefined;
}
