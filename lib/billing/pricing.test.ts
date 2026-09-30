import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { modelPricing } from "@/db/schema";
import { createTestDatabase, type TestDatabase } from "@/test/db";

import {
  DEFAULT_MARGIN_BPS,
  MIN_MARGIN_BPS,
  NET_CREDIT_VALUE_MICRO_USD,
} from "./config";
import { priceGeneration, quotePrice, usdToMicroUsd } from "./pricing";

const defaults = { marginBps: DEFAULT_MARGIN_BPS, minPriceCredits: 1 };

describe("NET_CREDIT_VALUE_MICRO_USD", () => {
  it("es el crédito sin IVA (15 %) y sin la comisión de Payphone (5,75 %)", () => {
    // 10.000 ÷ 1,15 = 8.695 − 575 = 8.120 micro-dólares
    expect(NET_CREDIT_VALUE_MICRO_USD).toBe(8_120);
  });
});

describe("quotePrice", () => {
  it("aplica ISD y comisiones (7 %) y un margen del 35 % sobre el ingreso neto", () => {
    // 0,50 × 1,07 ÷ 0,65 = 0,823 USD netos ÷ 0,00812 = 101,4 → 102 créditos
    expect(quotePrice({ costMicroUsd: 500_000, ...defaults })).toEqual({
      costMicroUsd: 500_000,
      surchargeBps: 700,
      marginBps: 3_500,
      priceCredits: 102,
    });
  });

  it("el margen es la ganancia sobre lo que de verdad queda de cada crédito", () => {
    const costMicroUsd = 500_000;
    const { priceCredits } = quotePrice({ costMicroUsd, ...defaults });

    const netMicroUsd = priceCredits * NET_CREDIT_VALUE_MICRO_USD;
    const costWithSurcharges = costMicroUsd * 1.07;
    const margin = (netMicroUsd - costWithSurcharges) / netMicroUsd;
    // Al redondear hacia arriba, el margen real nunca es menor.
    expect(margin).toBeGreaterThanOrEqual(0.35);
    expect(margin).toBeLessThan(0.36);
  });

  it("redondea hacia arriba a créditos enteros", () => {
    // 0,02 × 1,07 ÷ 0,65 ÷ 0,00812 = 4,05 → 5 créditos
    expect(quotePrice({ costMicroUsd: 20_000, ...defaults }).priceCredits).toBe(
      5,
    );
  });

  it("no suma un crédito cuando el precio es exacto", () => {
    // 0,5278 × 1,07 ÷ 0,65 ÷ 0,00812 = 107 créditos exactos
    expect(
      quotePrice({ costMicroUsd: 527_800, ...defaults }).priceCredits,
    ).toBe(107);
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
    expect(quote.priceCredits).toBe(88);
  });

  it("usa un margen mayor si el modelo lo tiene", () => {
    // 0,50 × 1,07 ÷ 0,60 ÷ 0,00812 = 109,8 → 110 créditos
    expect(
      quotePrice({
        costMicroUsd: 500_000,
        marginBps: 4_000,
        minPriceCredits: 1,
      }).priceCredits,
    ).toBe(110);
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
    // 10.000 USD × 1,07 ÷ 0,65 ÷ 0,00812 = 2.027.283,06 → 2.027.284 créditos
    expect(
      quotePrice({ costMicroUsd: usdToMicroUsd(10_000), ...defaults })
        .priceCredits,
    ).toBe(2_027_284);
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

    expect(quote.priceCredits).toBe(102);
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

    expect(empresa.priceCredits).toBe(110);
    expect(pyme.priceCredits).toBe(102);
  });
});
