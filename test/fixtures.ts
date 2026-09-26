import { generationJobs, type Segment } from "@/db/schema";
import type { OnboardingAnswers } from "@/lib/onboarding/schema";
import { createOrganizationForOwner } from "@/lib/organizations/service";
import { ensureUser } from "@/lib/users/service";

import type { TestDatabase } from "./db";

const answers: Record<Segment, OnboardingAnswers> = {
  pyme: {
    businessName: "Panadería La Esquina",
    country: "EC",
    industry: "food",
    teamSize: "2-5",
    teamType: "owner",
    videoPurposes: ["social_media"],
  },
  empresa: {
    businessName: "Agencia Andina",
    country: "PE",
    industry: "other",
    teamSize: "11-50",
    teamType: "agency",
    videoPurposes: ["paid_ads"],
  },
};

/** Usuario con una organización del segmento pedido. */
export async function createOrganization(
  testDb: TestDatabase,
  segment: Segment = "pyme",
) {
  const authUser = await testDb.createAuthUser();
  const user = await ensureUser(testDb.db, { ...authUser, locale: "es" });
  const organization = await createOrganizationForOwner(
    testDb.db,
    user.id,
    answers[segment],
  );
  return { user, organization };
}

/** Job mínimo para probar reservas sin pasar por el servicio de generación. */
export async function insertJob(
  testDb: TestDatabase,
  organizationId: string,
  priceCredits: number,
) {
  const [job] = await testDb.db
    .insert(generationJobs)
    .values({
      organizationId,
      provider: "mock",
      modelId: "mock-image",
      request: { modelId: "mock-image", prompt: "x", aspectRatio: "1:1" },
      costMicroUsd: 0,
      surchargeBps: 500,
      marginBps: 2_500,
      priceCredits,
    })
    .returning();
  if (!job) throw new Error("No se pudo crear el job de prueba.");
  return job;
}
