import { CREDIT_VALUE_MICRO_USD, IVA_BPS, PAYMENT_FEE_BPS } from "./config";

// Paquetes de créditos prepagados (CLAUDE.md §5). Los precios incluyen IVA y
// ninguno pasa de US$50, el máximo que se puede facturar a consumidor final.
// Los paquetes grandes traen créditos de regalo, que salen del margen: aun con
// el regalo más grande, el margen sigue por encima del mínimo (ver
// packages.test.ts y docs/creditos.md).
//
// TODO(producto): si hace falta cambiarlos sin deploy, pasarlos a la base de
// datos y editarlos desde el panel de admin.

export const creditPackageIds = [
  "starter",
  "entrepreneur",
  "business",
  "pro",
] as const;

export type CreditPackageId = (typeof creditPackageIds)[number];

export type CreditPackage = {
  id: CreditPackageId;
  /** Lo que paga el cliente, en centavos de dólar, IVA incluido. */
  totalCents: number;
  /** Créditos que recibe, regalo incluido. */
  credits: number;
  /** Parte de `credits` que es regalo (sobre US$0,01 por crédito). */
  bonusCredits: number;
  /** Se destaca como la opción recomendada. */
  featured?: boolean;
};

export const creditPackages: readonly CreditPackage[] = [
  { id: "starter", totalCents: 500, credits: 500, bonusCredits: 0 },
  { id: "entrepreneur", totalCents: 1_500, credits: 1_575, bonusCredits: 75 },
  {
    id: "business",
    totalCents: 3_000,
    credits: 3_300,
    bonusCredits: 300,
    featured: true,
  },
  { id: "pro", totalCents: 5_000, credits: 5_750, bonusCredits: 750 },
];

export function isCreditPackageId(value: unknown): value is CreditPackageId {
  return creditPackageIds.includes(value as CreditPackageId);
}

export function getCreditPackage(id: CreditPackageId): CreditPackage {
  const found = creditPackages.find((pkg) => pkg.id === id);
  if (!found) throw new Error(`Paquete desconocido: ${id}`);
  return found;
}

export type PriceBreakdown = {
  /** Base imponible (subtotal sin IVA), en centavos. */
  baseCents: number;
  /** IVA, en centavos. */
  taxCents: number;
  totalCents: number;
};

/**
 * Separa el IVA de un precio que lo incluye: la base es el total ÷ 1,15
 * redondeado al centavo y el IVA, la diferencia. Es el desglose que se envía a
 * Payphone y que va en la factura.
 */
export function splitIva(totalCents: number): PriceBreakdown {
  const baseCents = Math.round((totalCents * 10_000) / (10_000 + IVA_BPS));
  return { baseCents, taxCents: totalCents - baseCents, totalCents };
}

/**
 * Lo que de verdad queda de un paquete, en micro-dólares: la base sin IVA menos
 * la comisión de la pasarela sobre el total.
 */
export function netRevenueMicroUsd(pkg: CreditPackage): number {
  const { baseCents } = splitIva(pkg.totalCents);
  const fee = Math.ceil((pkg.totalCents * 10_000 * PAYMENT_FEE_BPS) / 10_000);
  return baseCents * 10_000 - fee;
}

/** Precio por crédito que ve el cliente, en micro-dólares, IVA incluido. */
export function pricePerCreditMicroUsd(pkg: CreditPackage): number {
  return (pkg.totalCents * 10_000) / pkg.credits;
}

/** Créditos que se pagan (sin el regalo), a US$0,01 cada uno. */
export function paidCredits(pkg: CreditPackage): number {
  return (pkg.totalCents * 10_000) / CREDIT_VALUE_MICRO_USD;
}

/**
 * Cuánto se ahorra, en porcentaje entero (hacia abajo), frente a pagar cada
 * crédito a US$0,01: el regalo de los paquetes grandes.
 */
export function savingsPercent(pkg: CreditPackage): number {
  const listPrice = pkg.credits * CREDIT_VALUE_MICRO_USD;
  const paid = pkg.totalCents * 10_000;
  return Math.floor(((listPrice - paid) * 100) / listPrice);
}
