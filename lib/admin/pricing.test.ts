import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { modelPricing } from "@/db/schema";
import { priceGeneration } from "@/lib/billing/pricing";
import { MockProvider } from "@/lib/providers/mock";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { createOrganization } from "@/test/fixtures";

import {
  InvalidPricingError,
  listEffectivePricing,
  parsePercentToBps,
  resetModelPricing,
  setModelPricing,
} from "./pricing";

let testDb: TestDatabase;
const providers = [new MockProvider()];

beforeAll(async () => {
  testDb = await createTestDatabase();
});
beforeEach(async () => {
  await testDb.reset();
});
afterAll(async () => {
  await testDb.close();
});

async function adminId() {
  return (await createOrganization(testDb)).user.id;
}

const promo = {
  provider: "mock",
  modelId: "mock-video-standard",
  segment: "pyme" as const,
};

describe("listEffectivePricing", () => {
  it("lista cada modelo por segmento con los valores por defecto", async () => {
    const rows = await listEffectivePricing(testDb.db, providers);

    // 3 modelos del mock × 2 segmentos.
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({
      provider: "mock",
      modelId: "mock-video-standard",
      modelName: "Video estándar (mock)",
      mediaType: "video",
      segment: "pyme",
      marginBps: 2_500,
      minPriceCredits: 1,
      isDefault: true,
      // 5 s × 0,05 = 0,25 USD → 35 créditos.
      example: { durationSeconds: 5, priceCredits: 35 },
    });
  });
});

describe("setModelPricing", () => {
  it("guarda el margen del modelo y segmento, y lo usan las generaciones nuevas", async () => {
    const actorUserId = await adminId();

    await setModelPricing(testDb.db, providers, {
      ...promo,
      marginBps: 4_000,
      minPriceCredits: 50,
      actorUserId,
    });

    const [stored] = await testDb.db.select().from(modelPricing);
    expect(stored).toMatchObject({ marginBps: 4_000, updatedBy: actorUserId });
    // 0,50 × 1,05 ÷ 0,60 = 0,875 USD → 88 créditos.
    expect(
      (await priceGeneration(testDb.db, { ...promo, costUsd: 0.5 }))
        .priceCredits,
    ).toBe(88);
    // El otro segmento sigue con el valor por defecto.
    expect(
      (
        await priceGeneration(testDb.db, {
          ...promo,
          segment: "empresa",
          costUsd: 0.5,
        })
      ).priceCredits,
    ).toBe(70);

    const rows = await listEffectivePricing(testDb.db, providers);
    expect(rows[0]).toMatchObject({
      marginBps: 4_000,
      minPriceCredits: 50,
      isDefault: false,
      // 5 s: 0,25 × 1,05 ÷ 0,60 = 0,4375 → 44, pero el mínimo es 50.
      example: { priceCredits: 50 },
    });
  });

  it("actualiza la fila si ya existe", async () => {
    const actorUserId = await adminId();
    const input = { ...promo, minPriceCredits: 1, actorUserId };

    await setModelPricing(testDb.db, providers, { ...input, marginBps: 3_000 });
    await setModelPricing(testDb.db, providers, { ...input, marginBps: 3_500 });

    const stored = await testDb.db.select().from(modelPricing);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.marginBps).toBe(3_500);
  });

  it.each([
    [{ marginBps: 2_499 }, "marginBps"],
    [{ marginBps: 9_001 }, "marginBps"],
    [{ marginBps: 2_600.5 }, "marginBps"],
    [{ minPriceCredits: 0 }, "minPriceCredits"],
    [{ modelId: "no-existe" }, "model"],
    [{ provider: "higgsfield" }, "model"],
  ])("rechaza valores fuera de rango (%o)", async (override, field) => {
    const actorUserId = await adminId();

    await expect(
      setModelPricing(testDb.db, providers, {
        ...promo,
        marginBps: 3_000,
        minPriceCredits: 1,
        actorUserId,
        ...override,
      }),
    ).rejects.toMatchObject({ constructor: InvalidPricingError, field });
    expect(await testDb.db.select().from(modelPricing)).toEqual([]);
  });

  it("restablecer vuelve a los valores por defecto", async () => {
    const actorUserId = await adminId();
    await setModelPricing(testDb.db, providers, {
      ...promo,
      marginBps: 4_000,
      minPriceCredits: 1,
      actorUserId,
    });

    await resetModelPricing(testDb.db, promo);

    const [row] = await listEffectivePricing(testDb.db, providers);
    expect(row).toMatchObject({ marginBps: 2_500, isDefault: true });
  });
});

describe("parsePercentToBps", () => {
  it.each([
    ["25", 2_500],
    ["27.5", 2_750],
    ["27,5", 2_750],
    [" 40 ", 4_000],
    ["33.33", 3_333],
  ])("%s → %d", (value, bps) => {
    expect(parsePercentToBps(value)).toBe(bps);
  });

  it.each(["", "abc", "-10", "25.555", "1e3"])("rechaza %o", (value) => {
    expect(parsePercentToBps(value)).toBeNull();
  });
});
