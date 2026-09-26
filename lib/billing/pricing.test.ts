import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { modelPricing } from "@/db/schema";
import { createTestDatabase, type TestDatabase } from "@/test/db";

import { DEFAULT_MARGIN_BPS, MIN_MARGIN_BPS } from "./config";
import { priceGeneration, quotePrice, usdToMicroUsd } from "./pricing";

const defaults = { marginBps: DEFAULT_MARGIN_BPS, minPriceCredits: 1 };

describe("quotePrice", () => {
  it("aplica ISD (5 %) y margen (25 %) y redondea hacia arriba a créditos", () => {
    // 0,50 × 1,05 × 1,25 = 0,65625 USD → 65,625 créditos → 66
    expect(quotePrice({ costMicroUsd: 500_000, ...defaults })).toEqual({
      costMicroUsd: 500_000,
      surchargeBps: 500,
      marginBps: 2_500,
      priceCredits: 66,
    });
    // 0,02 × 1,05 × 1,25 = 0,02625 USD → 3 créditos
    expect(quotePrice({ costMicroUsd: 20_000, ...defaults }).priceCredits).toBe(
      3,
    );
  });

  it("no suma un crédito cuando el precio es exacto", () => {
    // 0,80 × 1,05 × 1,25 = 1,05 USD → 105 créditos exactos
    expect(
      quotePrice({ costMicroUsd: 800_000, ...defaults }).priceCredits,
    ).toBe(105);
  });

  it("respeta el precio mínimo por generación", () => {
    expect(quotePrice({ costMicroUsd: 0, ...defaults }).priceCredits).toBe(1);
    expect(
      quotePrice({
        costMicroUsd: 20_000,
        marginBps: 2_500,
        minPriceCredits: 10,
      }).priceCredits,
    ).toBe(10);
  });

  it("nunca usa un margen menor al mínimo", () => {
    const quote = quotePrice({
      costMicroUsd: 500_000,
      marginBps: 500,
      minPriceCredits: 1,
    });

    expect(quote.marginBps).toBe(MIN_MARGIN_BPS);
    expect(quote.priceCredits).toBe(66);
  });

  it("usa un margen mayor si el modelo lo tiene", () => {
    // 0,50 × 1,05 × 1,40 = 0,735 USD → 74 créditos
    expect(
      quotePrice({
        costMicroUsd: 500_000,
        marginBps: 4_000,
        minPriceCredits: 1,
      }).priceCredits,
    ).toBe(74);
  });

  it("es exacto con costos grandes", () => {
    // 10.000 USD × 1,05 × 1,25 = 13.125 USD → 1.312.500 créditos
    expect(
      quotePrice({ costMicroUsd: usdToMicroUsd(10_000), ...defaults })
        .priceCredits,
    ).toBe(1_312_500);
  });
});

describe("usdToMicroUsd", () => {
  it("convierte y redondea a micro-dólares", () => {
    expect(usdToMicroUsd(0.1 + 0.2)).toBe(300_000);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rechaza %s", (value) => {
    expect(() => usdToMicroUsd(value)).toThrow();
  });
});

describe("priceGeneration", () => {
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

  const input = {
    provider: "mock",
    modelId: "mock-video-standard",
    costUsd: 0.5,
  };

  it("usa los valores por defecto si el modelo no tiene precio propio", async () => {
    const quote = await priceGeneration(testDb.db, {
      ...input,
      segment: "pyme",
    });

    expect(quote.priceCredits).toBe(66);
  });

  it("usa el margen del modelo para el segmento", async () => {
    await testDb.db.insert(modelPricing).values({
      provider: "mock",
      modelId: "mock-video-standard",
      segment: "empresa",
      marginBps: 4_000,
      minPriceCredits: 1,
    });

    const empresa = await priceGeneration(testDb.db, {
      ...input,
      segment: "empresa",
    });
    const pyme = await priceGeneration(testDb.db, {
      ...input,
      segment: "pyme",
    });

    expect(empresa.priceCredits).toBe(74);
    expect(pyme.priceCredits).toBe(66);
  });
});
