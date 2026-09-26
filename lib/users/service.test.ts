import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "@/test/db";

import { ensureUser, updateUserLocale } from "./service";

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

describe("ensureUser", () => {
  it("crea el perfil con el idioma del registro", async () => {
    const authUser = await testDb.createAuthUser("ana@test.local");

    const user = await ensureUser(testDb.db, { ...authUser, locale: "pt" });

    expect(user).toMatchObject({ email: "ana@test.local", locale: "pt" });
  });

  it("es idempotente: sincroniza el correo y conserva el idioma", async () => {
    const authUser = await testDb.createAuthUser("ana@test.local");
    await ensureUser(testDb.db, { ...authUser, locale: "pt" });

    const user = await ensureUser(testDb.db, {
      id: authUser.id,
      email: "ana.nueva@test.local",
      locale: "es",
    });

    expect(user).toMatchObject({ email: "ana.nueva@test.local", locale: "pt" });
  });
});

describe("updateUserLocale", () => {
  it("guarda el idioma preferido", async () => {
    const authUser = await testDb.createAuthUser();
    await ensureUser(testDb.db, { ...authUser, locale: "es" });

    await updateUserLocale(testDb.db, authUser.id, "pt");

    const user = await ensureUser(testDb.db, { ...authUser, locale: "es" });
    expect(user.locale).toBe("pt");
  });
});
