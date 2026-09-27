import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  or,
  sql,
  sum,
} from "drizzle-orm";

import {
  creditAllocations,
  creditLots,
  creditTransactions,
  creditWallets,
  organizations,
} from "@/db/schema";
import type { Database } from "@/db/types";

import { CREDIT_EXPIRATION_MONTHS } from "./config";

// Billetera de créditos (CLAUDE.md §3.2 y §5): acreditar, reservar, liquidar,
// reembolsar y vencer. Cada operación bloquea la fila de la billetera de la
// organización, así dos operaciones simultáneas nunca gastan el mismo crédito.
// Todo movimiento queda en el ledger inmutable `credit_transactions`.

export class InsufficientCreditsError extends Error {
  constructor(
    readonly required: number,
    readonly available: number,
  ) {
    super(
      `Créditos insuficientes: se necesitan ${required} y hay ${available}.`,
    );
  }
}

export class ReservationStateError extends Error {}

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} debe ser un entero positivo: ${value}`);
  }
}

/** Fecha de vencimiento de un lote acreditado hoy a una organización de ese segmento. */
export function creditExpiration(
  months: number | null,
  now: Date,
): Date | null {
  if (months === null) return null;
  const expiresAt = new Date(now);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + months);
  return expiresAt;
}

/** Bloquea la billetera (y la crea si no existe) hasta el fin de la transacción. */
async function lockWallet(tx: Database, organizationId: string) {
  await tx
    .insert(creditWallets)
    .values({ organizationId })
    .onConflictDoNothing();
  await tx
    .select({ organizationId: creditWallets.organizationId })
    .from(creditWallets)
    .where(eq(creditWallets.organizationId, organizationId))
    .for("update");
}

const notExpired = (now: Date) =>
  or(isNull(creditLots.expiresAt), gt(creditLots.expiresAt, now));

/** Acredita créditos en un lote nuevo, con el vencimiento del segmento de la organización. */
export async function grantCredits(
  db: Database,
  input: {
    organizationId: string;
    credits: number;
    note: string;
    actorUserId?: string;
    now?: Date;
  },
) {
  assertPositiveInteger(input.credits, "credits");
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .select({ segment: organizations.segment })
      .from(organizations)
      .where(eq(organizations.id, input.organizationId));
    if (!organization) throw new Error("La organización no existe.");

    await lockWallet(tx, input.organizationId);

    const [lot] = await tx
      .insert(creditLots)
      .values({
        organizationId: input.organizationId,
        grantedCredits: input.credits,
        remainingCredits: input.credits,
        expiresAt: creditExpiration(
          CREDIT_EXPIRATION_MONTHS[organization.segment],
          now,
        ),
      })
      .returning();
    if (!lot) throw new Error("No se pudo crear el lote de créditos.");

    await tx.insert(creditTransactions).values({
      organizationId: input.organizationId,
      type: "grant",
      availableDelta: input.credits,
      heldDelta: 0,
      lotId: lot.id,
      note: input.note,
      actorUserId: input.actorUserId,
    });

    return lot;
  });
}

/** Créditos disponibles (sin vencer) y reservados por jobs en curso. */
export async function getBalance(
  db: Database,
  organizationId: string,
  now: Date = new Date(),
): Promise<{ available: number; held: number }> {
  const [lots] = await db
    .select({ available: sum(creditLots.remainingCredits).mapWith(Number) })
    .from(creditLots)
    .where(and(eq(creditLots.organizationId, organizationId), notExpired(now)));
  const [ledger] = await db
    .select({ held: sum(creditTransactions.heldDelta).mapWith(Number) })
    .from(creditTransactions)
    .where(eq(creditTransactions.organizationId, organizationId));

  return { available: lots?.available ?? 0, held: ledger?.held ?? 0 };
}

/**
 * Pasa a vencidos los lotes de la organización cuya fecha ya llegó. Debe
 * llamarse dentro de una transacción con la billetera bloqueada.
 */
async function expireDueLots(tx: Database, organizationId: string, now: Date) {
  const due = await tx
    .select({ id: creditLots.id, remaining: creditLots.remainingCredits })
    .from(creditLots)
    .where(
      and(
        eq(creditLots.organizationId, organizationId),
        lte(creditLots.expiresAt, now),
        gt(creditLots.remainingCredits, 0),
      ),
    )
    .for("update");

  for (const lot of due) {
    await tx.insert(creditTransactions).values({
      organizationId,
      type: "expire",
      availableDelta: -lot.remaining,
      heldDelta: 0,
      lotId: lot.id,
    });
    await tx
      .update(creditLots)
      .set({ remainingCredits: 0 })
      .where(eq(creditLots.id, lot.id));
  }
  return due.length;
}

/** Vence los lotes de todas las organizaciones (lo llama el cron). */
export async function expireAllDueLots(db: Database, now: Date = new Date()) {
  const organizationsWithDueLots = await db
    .selectDistinct({ organizationId: creditLots.organizationId })
    .from(creditLots)
    .where(
      and(lte(creditLots.expiresAt, now), gt(creditLots.remainingCredits, 0)),
    );

  let expired = 0;
  for (const { organizationId } of organizationsWithDueLots) {
    expired += await db.transaction(async (tx) => {
      await lockWallet(tx, organizationId);
      return expireDueLots(tx, organizationId, now);
    });
  }
  return expired;
}

/**
 * Reserva créditos para un job, tomando primero los lotes que vencen antes.
 * Debe llamarse dentro de la transacción que crea el job.
 */
export async function reserveCredits(
  tx: Database,
  input: { organizationId: string; jobId: string; credits: number; now?: Date },
) {
  assertPositiveInteger(input.credits, "credits");
  const now = input.now ?? new Date();

  await lockWallet(tx, input.organizationId);
  await expireDueLots(tx, input.organizationId, now);

  const lots = await tx
    .select({ id: creditLots.id, remaining: creditLots.remainingCredits })
    .from(creditLots)
    .where(
      and(
        eq(creditLots.organizationId, input.organizationId),
        gt(creditLots.remainingCredits, 0),
        notExpired(now),
      ),
    )
    .orderBy(
      sql`${creditLots.expiresAt} asc nulls last`,
      asc(creditLots.createdAt),
    )
    .for("update");

  const available = lots.reduce((total, lot) => total + lot.remaining, 0);
  if (available < input.credits) {
    throw new InsufficientCreditsError(input.credits, available);
  }

  let pending = input.credits;
  for (const lot of lots) {
    if (pending === 0) break;
    const take = Math.min(pending, lot.remaining);
    await tx
      .update(creditLots)
      .set({ remainingCredits: lot.remaining - take })
      .where(eq(creditLots.id, lot.id));
    await tx
      .insert(creditAllocations)
      .values({ jobId: input.jobId, lotId: lot.id, credits: take });
    pending -= take;
  }

  await tx.insert(creditTransactions).values({
    organizationId: input.organizationId,
    type: "reserve",
    availableDelta: -input.credits,
    heldDelta: input.credits,
    jobId: input.jobId,
  });
}

/** Créditos reservados para el job; falla si no hay reserva o ya se cerró. */
async function openReservation(
  tx: Database,
  organizationId: string,
  jobId: string,
): Promise<number> {
  const entries = await tx
    .select({
      type: creditTransactions.type,
      heldDelta: creditTransactions.heldDelta,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.organizationId, organizationId),
        eq(creditTransactions.jobId, jobId),
      ),
    );

  const reserve = entries.find((entry) => entry.type === "reserve");
  if (!reserve)
    throw new ReservationStateError(`El job ${jobId} no tiene reserva.`);
  if (
    entries.some((entry) => entry.type === "settle" || entry.type === "refund")
  ) {
    throw new ReservationStateError(`La reserva del job ${jobId} ya se cerró.`);
  }
  return reserve.heldDelta;
}

/** Cobra los créditos reservados de un job terminado con éxito. */
export async function settleReservation(
  tx: Database,
  input: { organizationId: string; jobId: string },
) {
  await lockWallet(tx, input.organizationId);
  const credits = await openReservation(tx, input.organizationId, input.jobId);

  await tx.insert(creditTransactions).values({
    organizationId: input.organizationId,
    type: "settle",
    availableDelta: 0,
    heldDelta: -credits,
    jobId: input.jobId,
  });
}

/**
 * Devuelve completos los créditos reservados de un job fallido, a los mismos
 * lotes de donde salieron. Si un lote venció mientras tanto, esos créditos
 * vuelven vencidos y el siguiente vencimiento los descuenta.
 */
export async function refundReservation(
  tx: Database,
  input: { organizationId: string; jobId: string },
) {
  await lockWallet(tx, input.organizationId);
  const credits = await openReservation(tx, input.organizationId, input.jobId);

  const allocations = await tx
    .select()
    .from(creditAllocations)
    .where(eq(creditAllocations.jobId, input.jobId));
  const lotIds = allocations.map((allocation) => allocation.lotId);
  if (lotIds.length > 0) {
    await tx
      .select({ id: creditLots.id })
      .from(creditLots)
      .where(inArray(creditLots.id, lotIds))
      .for("update");
  }
  for (const allocation of allocations) {
    await tx
      .update(creditLots)
      .set({
        remainingCredits: sql`${creditLots.remainingCredits} + ${allocation.credits}`,
      })
      .where(eq(creditLots.id, allocation.lotId));
  }

  await tx.insert(creditTransactions).values({
    organizationId: input.organizationId,
    type: "refund",
    availableDelta: credits,
    heldDelta: -credits,
    jobId: input.jobId,
  });
}
