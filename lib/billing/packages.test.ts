import { describe, expect, it } from "vitest";

import {
  CREDIT_VALUE_MICRO_USD,
  DEFAULT_MARGIN_BPS,
  MIN_MARGIN_BPS,
  NET_CREDIT_VALUE_MICRO_USD,
} from "./config";
import {
  creditPackages,
  getCreditPackage,
  isCreditPackageId,
  netRevenueMicroUsd,
  paidCredits,
  pricePerCreditMicroUsd,
  savingsPercent,
  splitIva,
} from "./packages";

describe("splitIva", () => {
  it("separa la base y el IVA del 15 % de un precio que lo incluye", () => {
    expect(splitIva(500)).toEqual({
      baseCents: 435,
      taxCents: 65,
      totalCents: 500,
    });
    expect(splitIva(5_000)).toEqual({
      baseCents: 4_348,
      taxCents: 652,
      totalCents: 5_000,
    });
  });
});

describe("creditPackages", () => {
  it("500 créditos cuestan US$5 con IVA incluido", () => {
    const starter = getCreditPackage("starter");
    expect(starter).toMatchObject({ totalCents: 500, credits: 500 });
    expect(pricePerCreditMicroUsd(starter)).toBe(CREDIT_VALUE_MICRO_USD);
  });

  it.each(creditPackages)(
    "$id: el IVA de la factura cuadra al centavo con el total",
    (pkg) => {
      const { baseCents, taxCents } = splitIva(pkg.totalCents);
      // Así lo calcula la factura electrónica: base × 15 %, redondeado.
      expect(Math.round(baseCents * 0.15)).toBe(taxCents);
      expect(baseCents + taxCents).toBe(pkg.totalCents);
    },
  );

  it.each(creditPackages)(
    "$id: se puede facturar a consumidor final (hasta US$50)",
    (pkg) => {
      expect(pkg.totalCents).toBeLessThanOrEqual(5_000);
    },
  );

  it.each(creditPackages)(
    "$id: los créditos de regalo son los que exceden US$0,01 por crédito",
    (pkg) => {
      expect(pkg.credits - pkg.bonusCredits).toBe(paidCredits(pkg));
    },
  );

  it.each(creditPackages)(
    "$id: con el regalo, el margen sigue por encima del mínimo",
    (pkg) => {
      // Cada crédito reserva (1 − margen) × valor neto para el proveedor.
      const providerAllowance =
        pkg.credits *
        NET_CREDIT_VALUE_MICRO_USD *
        ((10_000 - DEFAULT_MARGIN_BPS) / 10_000);
      const margin = 1 - providerAllowance / netRevenueMicroUsd(pkg);

      expect(margin).toBeGreaterThanOrEqual(MIN_MARGIN_BPS / 10_000);
    },
  );

  it("los paquetes grandes bajan el precio por crédito", () => {
    const prices = creditPackages.map(pricePerCreditMicroUsd);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expect(new Set(prices).size).toBe(prices.length);
  });

  it("el ahorro sale del regalo de créditos", () => {
    expect(
      Object.fromEntries(
        creditPackages.map((pkg) => [pkg.id, savingsPercent(pkg)]),
      ),
    ).toEqual({ starter: 0, entrepreneur: 4, business: 9, pro: 13 });
  });

  it("reconoce los ids de paquete", () => {
    expect(isCreditPackageId("business")).toBe(true);
    expect(isCreditPackageId("gratis")).toBe(false);
  });
});
