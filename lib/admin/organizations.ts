import {
  aliasedTable,
  and,
  desc,
  eq,
  exists,
  gt,
  ilike,
  or,
} from "drizzle-orm";
import { z } from "zod";

import {
  creditLots,
  creditTransactions,
  memberships,
  organizations,
  users,
  type Organization,
} from "@/db/schema";
import type { Database } from "@/db/types";
import { getBalance } from "@/lib/billing/wallet";

// Consultas del panel de admin sobre organizaciones y sus créditos.

/** Escapa % y _ para usar el texto tal cual dentro de un ILIKE. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/**
 * Organizaciones cuyo nombre o el correo de algún miembro contiene el texto,
 * de la más nueva a la más vieja. Sin texto, las más nuevas.
 */
export async function searchOrganizations(
  db: Database,
  query: string,
  limit = 20,
): Promise<Organization[]> {
  const text = query.trim();
  const pattern = likePattern(text);
  const memberMatches = exists(
    db
      .select({ one: memberships.userId })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(
        and(
          eq(memberships.organizationId, organizations.id),
          ilike(users.email, pattern),
        ),
      ),
  );

  return db
    .select()
    .from(organizations)
    .where(
      text ? or(ilike(organizations.name, pattern), memberMatches) : undefined,
    )
    .orderBy(desc(organizations.createdAt))
    .limit(limit);
}

const actors = aliasedTable(users, "actors");

/** Todo lo que el admin necesita ver de una organización antes de acreditar. */
export async function getOrganizationOverview(
  db: Database,
  organizationId: string,
  now: Date = new Date(),
) {
  if (!z.uuid().safeParse(organizationId).success) return null;
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  if (!organization) return null;

  const [members, balance, lots, transactions] = await Promise.all([
    db
      .select({ email: users.email, role: memberships.role })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.organizationId, organizationId))
      .orderBy(users.email),
    getBalance(db, organizationId, now),
    db
      .select()
      .from(creditLots)
      .where(
        and(
          eq(creditLots.organizationId, organizationId),
          gt(creditLots.remainingCredits, 0),
        ),
      )
      .orderBy(creditLots.expiresAt),
    db
      .select({
        id: creditTransactions.id,
        type: creditTransactions.type,
        availableDelta: creditTransactions.availableDelta,
        heldDelta: creditTransactions.heldDelta,
        note: creditTransactions.note,
        createdAt: creditTransactions.createdAt,
        actorEmail: actors.email,
      })
      .from(creditTransactions)
      .leftJoin(actors, eq(actors.id, creditTransactions.actorUserId))
      .where(eq(creditTransactions.organizationId, organizationId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(20),
  ]);

  return { organization, members, balance, lots, transactions };
}
