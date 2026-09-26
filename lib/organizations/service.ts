import { and, asc, eq } from "drizzle-orm";

import {
  memberships,
  organizations,
  users,
  type Membership,
  type Organization,
  type Segment,
} from "@/db/schema";
import type { Database } from "@/db/types";
import type { OnboardingAnswers } from "@/lib/onboarding/schema";
import { assignSegment } from "@/lib/segment";

export type MembershipWithOrganization = {
  membership: Membership;
  organization: Organization;
};

/**
 * Organización actual del usuario. Por ahora cada usuario pertenece a una sola;
 * TODO(fase 2): elegir organización cuando pertenezca a varias.
 */
export async function getCurrentMembership(
  db: Database,
  userId: string,
): Promise<MembershipWithOrganization | null> {
  const [row] = await db
    .select({ membership: memberships, organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt))
    .limit(1);

  return row ?? null;
}

export class AlreadyOnboardedError extends Error {
  constructor() {
    super("El usuario ya tiene una organización.");
  }
}

/**
 * Crea la organización del onboarding con el segmento asignado por
 * `assignSegment` y deja al usuario como administrador.
 */
export async function createOrganizationForOwner(
  db: Database,
  userId: string,
  answers: OnboardingAnswers,
): Promise<Organization> {
  return db.transaction(async (tx) => {
    // Bloquea al usuario para que dos envíos simultáneos no creen dos
    // organizaciones.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");

    const existing = await getCurrentMembership(tx, userId);
    if (existing) throw new AlreadyOnboardedError();

    const [organization] = await tx
      .insert(organizations)
      .values({
        name: answers.businessName,
        segment: assignSegment(answers),
        country: answers.country,
        industry: answers.industry,
        teamSize: answers.teamSize,
        teamType: answers.teamType,
        videoPurposes: answers.videoPurposes,
      })
      .returning();

    if (!organization) throw new Error("No se pudo crear la organización.");

    await tx
      .insert(memberships)
      .values({ organizationId: organization.id, userId, role: "admin" });

    return organization;
  });
}

export class NotOrganizationAdminError extends Error {
  constructor() {
    super("Solo un administrador puede cambiar el modo de la organización.");
  }
}

/** Cambia el segmento de la organización ("Modo avanzado"). Solo administradores. */
export async function setOrganizationSegment(
  db: Database,
  input: { userId: string; organizationId: string; segment: Segment },
): Promise<void> {
  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, input.userId),
        eq(memberships.organizationId, input.organizationId),
      ),
    );

  if (membership?.role !== "admin") throw new NotOrganizationAdminError();

  await db
    .update(organizations)
    .set({ segment: input.segment })
    .where(eq(organizations.id, input.organizationId));
}
