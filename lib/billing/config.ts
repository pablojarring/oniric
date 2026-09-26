// Parámetros de precios y créditos (CLAUDE.md §5). Los márgenes por modelo y
// segmento viven en la tabla `model_pricing`; estos son los valores por defecto
// y los límites. Nunca se hardcodean en la UI.

import type { Segment } from "@/db/schema";

/** Decisión de producto: 1 crédito Oniric = US$0,01. */
export const CREDIT_VALUE_MICRO_USD = 10_000;

/**
 * Recargos sobre el costo del proveedor antes del margen, en puntos básicos.
 * Los pagos a Higgsfield salen de Ecuador y pagan ISD (5 % en 2026).
 */
export const PROVIDER_SURCHARGES_BPS = {
  isd: 500,
  // TODO(producto): comisión bancaria real de los pagos al exterior.
  bankFees: 0,
} as const;

/**
 * Decisión de producto: margen del 25 % sobre el costo con recargos
 * (precio = costo × 1,25), por defecto y como mínimo para cualquier modelo.
 */
export const DEFAULT_MARGIN_BPS = 2_500;
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
