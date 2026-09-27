import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { manualPaymentProvider } from "@/lib/payments/manual";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";

import { getOrganizationOverview, searchOrganizations } from "./organizations";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});
beforeEach(async () => {
  await testDb.reset();
});
afterAll(async () => {
  await testDb.close();
});

describe("searchOrganizations", () => {
  it("busca por nombre o por correo de un miembro, sin distinguir mayúsculas", async () => {
    const pyme = await createOrganization(testDb, "pyme");
    const agency = await createOrganization(testDb, "empresa");

    const byName = await searchOrganizations(testDb.db, "esquina");
    const byEmail = await searchOrganizations(
      testDb.db,
      agency.user.email.toUpperCase(),
    );
    const all = await searchOrganizations(testDb.db, "");

    expect(byName.map((org) => org.id)).toEqual([pyme.organization.id]);
    expect(byEmail.map((org) => org.id)).toEqual([agency.organization.id]);
    expect(all.map((org) => org.id)).toEqual([
      agency.organization.id,
      pyme.organization.id,
    ]);
  });

  it("trata % y _ como texto", async () => {
    await createOrganization(testDb);

    expect(await searchOrganizations(testDb.db, "%")).toEqual([]);
    expect(await searchOrganizations(testDb.db, "_")).toEqual([]);
  });
});

describe("getOrganizationOverview", () => {
  it("muestra miembros, saldo, lotes y movimientos con el admin que acreditó", async () => {
    const { organization, user } = await createOrganization(testDb);
    const admin = await createOrganization(testDb, "empresa");

    await manualPaymentProvider.fulfill(testDb.db, {
      organizationId: organization.id,
      credits: 500,
      reference: "Transferencia 123",
      actorUserId: admin.user.id,
    });

    const overview = await getOrganizationOverview(testDb.db, organization.id);

    expect(overview?.members).toEqual([{ email: user.email, role: "admin" }]);
    expect(overview?.balance).toEqual({ available: 500, held: 0 });
    expect(overview?.lots).toHaveLength(1);
    expect(overview?.transactions).toEqual([
      expect.objectContaining({
        type: "grant",
        availableDelta: 500,
        note: "[manual] Transferencia 123",
        actorEmail: admin.user.email,
      }),
    ]);
  });

  it("devuelve null si no existe o el id no es válido", async () => {
    expect(
      await getOrganizationOverview(
        testDb.db,
        "00000000-0000-4000-8000-000000000000",
      ),
    ).toBeNull();
    expect(await getOrganizationOverview(testDb.db, "no-es-uuid")).toBeNull();
  });
});
