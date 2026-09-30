import { and, count, desc, eq, gte } from "drizzle-orm";

import {
  creditPurchases,
  organizations,
  type CreditPurchase,
  type CreditPurchaseStatus,
} from "@/db/schema";
import type { Database } from "@/db/types";
import {
  getCreditPackage,
  splitIva,
  type CreditPackageId,
} from "@/lib/billing/packages";
import { grantCredits } from "@/lib/billing/wallet";

import {
  CheckoutGatewayError,
  type CheckoutConfirmation,
  type CheckoutGateway,
} from "./checkout";

// Compra de paquetes de créditos con la pasarela (docs/pagos.md):
// startCheckout crea la compra `pending` y lleva al cliente a pagar;
// confirmPurchase consulta el resultado y, si está aprobado, acredita los
// créditos una sola vez.

/** Compras que una organización puede iniciar por hora (frena abusos). */
export const CHECKOUT_RATE_LIMIT = { maxPurchases: 10, windowSeconds: 3_600 };

export class CheckoutRateLimitError extends Error {
  constructor() {
    super("Demasiadas compras iniciadas en la última hora.");
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function startCheckout(
  db: Database,
  gateway: CheckoutGateway,
  input: {
    organizationId: string;
    userId: string;
    packageId: CreditPackageId;
    email?: string;
    /** Motivo del cobro que ve el cliente en la pasarela. */
    reference: string;
    /** URL pública de la app, sin barra final. */
    siteUrl: string;
    now?: Date;
  },
): Promise<{ purchase: CreditPurchase; redirectUrl: string }> {
  const now = input.now ?? new Date();
  const pkg = getCreditPackage(input.packageId);

  const since = new Date(
    now.getTime() - CHECKOUT_RATE_LIMIT.windowSeconds * 1_000,
  );
  const [recent] = await db
    .select({ count: count() })
    .from(creditPurchases)
    .where(
      and(
        eq(creditPurchases.organizationId, input.organizationId),
        gte(creditPurchases.createdAt, since),
      ),
    );
  if ((recent?.count ?? 0) >= CHECKOUT_RATE_LIMIT.maxPurchases) {
    throw new CheckoutRateLimitError();
  }

  const amounts = splitIva(pkg.totalCents);
  const [purchase] = await db
    .insert(creditPurchases)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      packageId: pkg.id,
      credits: pkg.credits,
      ...amounts,
      gateway: gateway.id,
      createdAt: now,
    })
    .returning();
  if (!purchase) throw new Error("No se pudo crear la compra.");

  try {
    const { redirectUrl } = await gateway.prepare({
      purchaseId: purchase.id,
      amounts,
      reference: input.reference,
      email: input.email,
      responseUrl: `${input.siteUrl}/api/payments/payphone/return`,
      cancellationUrl: `${input.siteUrl}/credits?purchase=${purchase.id}&canceled=1`,
    });
    return { purchase, redirectUrl };
  } catch (error) {
    await db
      .update(creditPurchases)
      .set({ status: "failed", failureReason: "prepare_failed" })
      .where(eq(creditPurchases.id, purchase.id));
    throw error;
  }
}

export type ConfirmOutcome =
  /** Se acreditaron los créditos (ahora o en una confirmación anterior). */
  | "paid"
  /** La pasarela no aprobó el pago: no se cobró. */
  | "failed"
  /** No se pudo consultar a la pasarela: el resultado todavía es desconocido. */
  | "pending"
  /** No existe la compra o no es de esta pasarela. */
  | "not_found";

/**
 * Confirma el pago con la pasarela y, si está aprobado, acredita los créditos.
 * Es idempotente: si el cliente recarga la página de vuelta, o llegan dos
 * confirmaciones a la vez, los créditos se acreditan una sola vez.
 */
export async function confirmPurchase(
  db: Database,
  gateway: CheckoutGateway,
  input: { transactionId: string; clientTransactionId: string; now?: Date },
): Promise<{ outcome: ConfirmOutcome; purchase?: CreditPurchase }> {
  if (!UUID_PATTERN.test(input.clientTransactionId)) {
    return { outcome: "not_found" };
  }
  const purchase = await findPurchase(db, input.clientTransactionId);
  if (!purchase || purchase.gateway !== gateway.id) {
    return { outcome: "not_found" };
  }
  if (purchase.status === "paid") return { outcome: "paid", purchase };

  let confirmation: CheckoutConfirmation;
  try {
    confirmation = await gateway.confirm({
      transactionId: input.transactionId,
      clientTransactionId: purchase.id,
      expectedAmountCents: purchase.totalCents,
    });
  } catch (error) {
    if (!(error instanceof CheckoutGatewayError)) throw error;
    console.error(`No se pudo confirmar la compra ${purchase.id}`, error);
    return { outcome: "pending", purchase };
  }

  if (confirmation.clientTransactionId !== purchase.id) {
    console.error(
      `La pasarela confirmó otra compra (${confirmation.clientTransactionId}) para ${purchase.id}`,
    );
    return { outcome: "pending", purchase };
  }

  if (confirmation.status === "canceled") {
    const failed = await markFailed(db, purchase.id, "canceled", confirmation);
    return { outcome: "failed", purchase: failed };
  }

  if (
    confirmation.amountCents !== purchase.totalCents ||
    confirmation.currency !== purchase.currency
  ) {
    // El cliente pagó otro monto: no se acredita y queda para revisar a mano.
    console.error(
      `Monto confirmado distinto para la compra ${purchase.id}: ${confirmation.amountCents} ${confirmation.currency}`,
    );
    const failed = await markFailed(
      db,
      purchase.id,
      "amount_mismatch",
      confirmation,
    );
    return { outcome: "failed", purchase: failed };
  }

  const now = input.now ?? new Date();
  const paid = await db.transaction(async (tx) => {
    // Bloquea la compra: una segunda confirmación simultánea espera y la ve pagada.
    const [locked] = await tx
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.id, purchase.id))
      .for("update");
    if (!locked || locked.status === "paid") return locked;

    const lot = await grantCredits(tx, {
      organizationId: locked.organizationId,
      credits: locked.credits,
      note: `[${gateway.id}] compra ${locked.id} · transacción ${confirmation.transactionId}`,
      actorUserId: locked.userId,
      now,
    });
    const [updated] = await tx
      .update(creditPurchases)
      .set({
        status: "paid",
        paidAt: now,
        lotId: lot.id,
        failureReason: null,
        gatewayTransactionId: confirmation.transactionId,
        authorizationCode: confirmation.authorizationCode ?? null,
        payerName: confirmation.payer.name ?? null,
        payerEmail: confirmation.payer.email ?? null,
        payerPhone: confirmation.payer.phone ?? null,
        payerDocument: confirmation.payer.document ?? null,
        cardBrand: confirmation.card.brand ?? null,
        cardLastDigits: confirmation.card.lastDigits ?? null,
        confirmation: confirmation.raw,
      })
      .where(eq(creditPurchases.id, locked.id))
      .returning();
    return updated;
  });

  return { outcome: "paid", purchase: paid ?? purchase };
}

async function markFailed(
  db: Database,
  purchaseId: string,
  reason: string,
  confirmation: CheckoutConfirmation,
): Promise<CreditPurchase | undefined> {
  const [updated] = await db
    .update(creditPurchases)
    .set({
      status: "failed",
      failureReason: reason,
      gatewayTransactionId: confirmation.transactionId,
      confirmation: confirmation.raw,
    })
    .where(
      and(
        eq(creditPurchases.id, purchaseId),
        // Una compra ya pagada nunca vuelve atrás.
        eq(creditPurchases.status, "pending"),
      ),
    )
    .returning();
  return updated ?? (await findPurchase(db, purchaseId));
}

async function findPurchase(
  db: Database,
  purchaseId: string,
): Promise<CreditPurchase | undefined> {
  const [purchase] = await db
    .select()
    .from(creditPurchases)
    .where(eq(creditPurchases.id, purchaseId));
  return purchase;
}

/** Una compra de la organización, para mostrar su resultado al volver de pagar. */
export async function getOrganizationPurchase(
  db: Database,
  organizationId: string,
  purchaseId: string,
): Promise<CreditPurchase | undefined> {
  if (!UUID_PATTERN.test(purchaseId)) return undefined;
  const [purchase] = await db
    .select()
    .from(creditPurchases)
    .where(
      and(
        eq(creditPurchases.id, purchaseId),
        eq(creditPurchases.organizationId, organizationId),
      ),
    );
  return purchase;
}

export type PurchaseListItem = CreditPurchase & { organizationName: string };

/** Compras para el panel de admin (facturación), de la más nueva a la más vieja. */
export async function listPurchases(
  db: Database,
  options: {
    status?: CreditPurchaseStatus;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PurchaseListItem[]> {
  const rows = await db
    .select({ purchase: creditPurchases, organizationName: organizations.name })
    .from(creditPurchases)
    .innerJoin(
      organizations,
      eq(organizations.id, creditPurchases.organizationId),
    )
    .where(
      options.status ? eq(creditPurchases.status, options.status) : undefined,
    )
    .orderBy(desc(creditPurchases.createdAt))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);
  return rows.map((row) => ({
    ...row.purchase,
    organizationName: row.organizationName,
  }));
}
