import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { modelPricing } from "@/db/schema";
import { createTestDatabase, type TestDatabase } from "@/test/db";

import { DEFAULT_MARGIN_BPS, MIN_MARGIN_BPS } from "./config";
import { priceGeneration, quotePrice, usdToMicroUsd } from "./pricing";

const defaults = { marginBps: DEFAULT_MARGIN_BPS, minPriceCredits: 1 };

describe("quotePrice", () => {
  it("aplica ISD (5 %) y un margen del 25 % sobre el precio de venta", () => {
    // 0,50 × 1,05 ÷ 0,75 = 0,70 USD → 70 créditos
    expect(quotePrice({ costMicroUsd: 500_000, ...defaults })).toEqual({
      costMicroUsd: 500_000,
      surchargeBps: 500,
      marginBps: 2_500,
      priceCredits: 70,
    });
  });

  it("el margen es la ganancia sobre lo que paga el cliente", () => {
    const costMicroUsd = 500_000;
    const { priceCredits } = quotePrice({ costMicroUsd, ...defaults });

    const priceMicroUsd = priceCredits * 10_000;
    const costWithIsd = costMicroUsd * 1.05;
    expect((priceMicroUsd - costWithIsd) / priceMicroUsd).toBeCloseTo(0.25);
  });

  it("redondea hacia arriba a créditos enteros", () => {
    // 0,02 × 1,05 ÷ 0,75 = 0,028 USD → 2,8 créditos → 3
    expect(quotePrice({ costMicroUsd: 20_000, ...defaults }).priceCredits).toBe(
      3,
    );
  });

  it("no suma un crédito cuando el precio es exacto", () => {
    // 0,25 × 1,05 ÷ 0,75 = 0,35 USD → 35 créditos exactos
    expect(
      quotePrice({ costMicroUsd: 250_000, ...defaults }).priceCredits,
    ).toBe(35);
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
    expect(quote.priceCredits).toBe(70);
  });

  it("usa un margen mayor si el modelo lo tiene", () => {
    // 0,50 × 1,05 ÷ 0,60 = 0,875 USD → 87,5 créditos → 88
    expect(
      quotePrice({
        costMicroUsd: 500_000,
        marginBps: 4_000,
        minPriceCredits: 1,
      }).priceCredits,
    ).toBe(88);
  });

  it("rechaza un margen del 100 % o más", () => {
    expect(() =>
      quotePrice({
        costMicroUsd: 500_000,
        marginBps: 10_000,
        minPriceCredits: 1,
      }),
    ).toThrow("menor al 100");
  });

  it("es exacto con costos grandes", () => {
    // 10.000 USD × 1,05 ÷ 0,75 = 14.000 USD → 1.400.000 créditos
    expect(
      quotePrice({ costMicroUsd: usdToMicroUsd(10_000), ...defaults })
        .priceCredits,
    ).toBe(1_400_000);
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

    expect(quote.priceCredits).toBe(70);
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

    expect(empresa.priceCredits).toBe(88);
    expect(pyme.priceCredits).toBe(70);
  });
});
