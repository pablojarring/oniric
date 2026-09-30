// Parámetros de precios y créditos (CLAUDE.md §5). Los márgenes por modelo y
// segmento viven en la tabla `model_pricing`; estos son los valores por defecto
// y los límites. Nunca se hardcodean en la UI. El cálculo completo está en
// docs/creditos.md.

import type { Segment } from "@/db/schema";

/**
 * Decisión de producto: 1 crédito Oniric = US$0,01 con IVA incluido (el paquete
 * de US$5 trae 500 créditos). Es el valor que ve el cliente.
 */
export const CREDIT_VALUE_MICRO_USD = 10_000;

/** IVA de Ecuador en 2026 (15 %), incluido en el precio de los paquetes. */
export const IVA_BPS = 1_500;

/**
 * Comisión de la pasarela sobre el total cobrado: Payphone cobra 5 % + IVA
 * sobre esa comisión (5,75 %). Se toma completa como costo, aunque el IVA de la
 * comisión puede servir de crédito tributario.
 */
export const PAYMENT_FEE_BPS = 575;

/**
 * Lo que de verdad queda de cada crédito vendido, en micro-dólares: el valor
 * del crédito sin IVA y sin la comisión de la pasarela. Los precios de las
 * generaciones se calculan sobre este valor para que el margen sea real.
 *
 *   10.000 ÷ 1,15 = 8.695 (sin IVA, redondeado hacia abajo)
 *   − 10.000 × 5,75 % = 575 (comisión)
 *   = 8.120 micro-dólares (US$0,00812)
 */
export const NET_CREDIT_VALUE_MICRO_USD =
  Math.floor((CREDIT_VALUE_MICRO_USD * 10_000) / (10_000 + IVA_BPS)) -
  Math.ceil((CREDIT_VALUE_MICRO_USD * PAYMENT_FEE_BPS) / 10_000);

/**
 * Recargos sobre el costo del proveedor antes del margen, en puntos básicos.
 * Los pagos a Higgsfield salen de Ecuador y pagan ISD (5 % en 2026).
 */
export const PROVIDER_SURCHARGES_BPS = {
  isd: 500,
  // Estimación conservadora de las comisiones de la tarjeta o el banco por
  // pagos al exterior. TODO(producto): confirmar con el banco.
  bankFees: 200,
} as const;

/**
 * Margen bruto sobre el ingreso neto de cada crédito (sin IVA ni comisión de la
 * pasarela), después de pagar al proveedor con sus recargos. Decisión de
 * producto: 35 % por defecto y nunca menos del 25 %. El margen cubre los costos
 * fijos (hosting, dominio, correo), el impuesto a la renta y los créditos de
 * regalo de los paquetes grandes.
 */
export const DEFAULT_MARGIN_BPS = 3_500;
export const MIN_MARGIN_BPS = 2_500;

/** Precio mínimo por generación cuando el modelo no tiene uno propio. */
export const DEFAULT_MIN_PRICE_CREDITS = 1;

/**
 * Vencimiento de los créditos acreditados, según el segmento de la
 * organización al acreditarlos. `null`: no vencen.
 */
export const CREDIT_EXPIRATION_MONTHS: Record<Segment, number | null> = {
  // Decisión de producto: los créditos pyme vencen a los 12 meses.
  pyme: 12,
  // TODO(producto): definir el vencimiento de los créditos empresa.
  empresa: null,
};
