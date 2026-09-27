import { and, eq } from "drizzle-orm";

import { modelPricing, type Segment } from "@/db/schema";
import type { Database } from "@/db/types";

import {
  CREDIT_VALUE_MICRO_USD,
  DEFAULT_MARGIN_BPS,
  DEFAULT_MIN_PRICE_CREDITS,
  MIN_MARGIN_BPS,
  PROVIDER_SURCHARGES_BPS,
} from "./config";

const BPS = BigInt(10_000);

export type PriceQuote = {
  costMicroUsd: number;
  surchargeBps: number;
  marginBps: number;
  priceCredits: number;
};

/** Convierte dólares del proveedor a micro-dólares enteros. */
export function usdToMicroUsd(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) {
    throw new Error(`Costo inválido del proveedor: ${usd}`);
  }
  return Math.round(usd * 1_000_000);
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - BigInt(1)) / denominator;
}

/**
 * precio = costo × (1 + ISD + comisiones) ÷ (1 − margen)
 *
 * El margen es la ganancia sobre el precio de venta: con 25 %, de cada crédito
 * que paga el cliente quedan 0,25 después de pagar al proveedor. El resultado
 * se redondea hacia arriba a créditos enteros y nunca es menor que el mínimo
 * por generación. El margen nunca baja de MIN_MARGIN_BPS. Todo en enteros para
 * no perder fracciones de centavo.
 */
export function quotePrice(input: {
  costMicroUsd: number;
  marginBps: number;
  minPriceCredits: number;
  surchargeBps?: number;
}): PriceQuote {
  const surchargeBps =
    input.surchargeBps ??
    PROVIDER_SURCHARGES_BPS.isd + PROVIDER_SURCHARGES_BPS.bankFees;
  const marginBps = Math.max(input.marginBps, MIN_MARGIN_BPS);
  if (marginBps >= Number(BPS)) {
    throw new Error(`El margen debe ser menor al 100 %: ${marginBps} bps`);
  }

  // costo × (BPS + recargo) / BPS          → costo con recargos
  // ... × BPS / (BPS − margen)             → precio de venta
  // ... / valor del crédito                → créditos
  const credits = ceilDiv(
    BigInt(input.costMicroUsd) * (BPS + BigInt(surchargeBps)),
    (BPS - BigInt(marginBps)) * BigInt(CREDIT_VALUE_MICRO_USD),
  );

  return {
    costMicroUsd: input.costMicroUsd,
    surchargeBps,
    marginBps,
    priceCredits: Math.max(Number(credits), input.minPriceCredits),
  };
}

/** Margen y mínimo configurados para el modelo y segmento, o los valores por defecto. */
export async function getModelPricing(
  db: Database,
  key: { provider: string; modelId: string; segment: Segment },
): Promise<{ marginBps: number; minPriceCredits: number }> {
  const [row] = await db
    .select({
      marginBps: modelPricing.marginBps,
      minPriceCredits: modelPricing.minPriceCredits,
    })
    .from(modelPricing)
    .where(
      and(
        eq(modelPricing.provider, key.provider),
        eq(modelPricing.modelId, key.modelId),
        eq(modelPricing.segment, key.segment),
      ),
    );

  return (
    row ?? {
      marginBps: DEFAULT_MARGIN_BPS,
      minPriceCredits: DEFAULT_MIN_PRICE_CREDITS,
    }
  );
}

/** Precio en créditos de una generación según el costo que estima el proveedor. */
export async function priceGeneration(
  db: Database,
  input: {
    provider: string;
    modelId: string;
    segment: Segment;
    costUsd: number;
  },
): Promise<PriceQuote> {
  const pricing = await getModelPricing(db, input);
  return quotePrice({ costMicroUsd: usdToMicroUsd(input.costUsd), ...pricing });
}
