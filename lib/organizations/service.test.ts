import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { memberships } from "@/db/schema";
import type { OnboardingAnswers } from "@/lib/onboarding/schema";
import { ensureUser } from "@/lib/users/service";
import { createTestDatabase, type TestDatabase } from "@/test/db";

import {
  AlreadyOnboardedError,
  createOrganizationForOwner,
  getCurrentMembership,
  NotOrganizationAdminError,
  setOrganizationSegment,
} from "./service";

const answers: OnboardingAnswers = {
  businessName: "Panadería La Esquina",
  country: "EC",
  industry: "food",
  teamSize: "2-5",
  teamType: "owner",
  videoPurposes: ["social_media", "whatsapp"],
};

let testDb: TestDatabase;

async function createUser() {
  const authUser = await testDb.createAuthUser();
  return ensureUser(testDb.db, { ...authUser, locale: "es" });
}

beforeAll(async () => {
  testDb = await createTestDatabase();
});

beforeEach(async () => {
  await testDb.reset();
});

afterAll(async () => {
  await testDb.close();
});

describe("createOrganizationForOwner", () => {
  it("crea una organización pyme y deja al usuario como admin", async () => {
    const user = await createUser();

    const organization = await createOrganizationForOwner(
      testDb.db,
      user.id,
      answers,
    );

    expect(organization).toMatchObject({
      name: "Panadería La Esquina",
      segment: "pyme",
      country: "EC",
      videoPurposes: ["social_media", "whatsapp"],
    });
    const current = await getCurrentMembership(testDb.db, user.id);
    expect(current?.organization.id).toBe(organization.id);
    expect(current?.membership.role).toBe("admin");
  });

  it("asigna empresa a una agencia", async () => {
    const user = await createUser();

    const organization = await createOrganizationForOwner(testDb.db, user.id, {
      ...answers,
      teamSize: "1",
      teamType: "agency",
    });

    expect(organization.segment).toBe("empresa");
  });

  it("asigna empresa a un equipo de más de 10 personas", async () => {
    const user = await createUser();

    const organization = await createOrganizationForOwner(testDb.db, user.id, {
      ...answers,
      teamSize: "11-50",
    });

    expect(organization.segment).toBe("empresa");
  });

  it("no permite completar el onboarding dos veces", async () => {
    const user = await createUser();
    await createOrganizationForOwner(testDb.db, user.id, answers);

    await expect(
      createOrganizationForOwner(testDb.db, user.id, answers),
    ).rejects.toThrow(AlreadyOnboardedError);
  });
});

describe("getCurrentMembership", () => {
  it("devuelve null si el usuario no completó el onboarding", async () => {
    const user = await createUser();

    expect(await getCurrentMembership(testDb.db, user.id)).toBeNull();
  });
});

describe("setOrganizationSegment", () => {
  it("permite al admin activar el modo avanzado", async () => {
    const user = await createUser();
    const organization = await createOrganizationForOwner(
      testDb.db,
      user.id,
      answers,
    );

    await setOrganizationSegment(testDb.db, {
      userId: user.id,
      organizationId: organization.id,
      segment: "empresa",
    });

    const current = await getCurrentMembership(testDb.db, user.id);
    expect(current?.organization.segment).toBe("empresa");
  });

  it("rechaza a quien no es admin de la organización", async () => {
    const owner = await createUser();
    const editor = await createUser();
    const outsider = await createUser();
    const organization = await createOrganizationForOwner(
      testDb.db,
      owner.id,
      answers,
    );
    await testDb.db.insert(memberships).values({
      organizationId: organization.id,
      userId: editor.id,
      role: "editor",
    });

    for (const user of [editor, outsider]) {
      await expect(
        setOrganizationSegment(testDb.db, {
          userId: user.id,
          organizationId: organization.id,
          segment: "empresa",
        }),
      ).rejects.toThrow(NotOrganizationAdminError);
    }
    const current = await getCurrentMembership(testDb.db, owner.id);
    expect(current?.organization.segment).toBe("pyme");
  });
});
