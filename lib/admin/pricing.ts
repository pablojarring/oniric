import { and, eq } from "drizzle-orm";

import { modelPricing, segmentEnum, type Segment } from "@/db/schema";
import type { Database } from "@/db/types";
import {
  DEFAULT_MARGIN_BPS,
  DEFAULT_MIN_PRICE_CREDITS,
  MIN_MARGIN_BPS,
} from "@/lib/billing/config";
import { quotePrice, usdToMicroUsd } from "@/lib/billing/pricing";
import type {
  GenerationProvider,
  MediaType,
} from "@/lib/providers/generation-provider";

// Márgenes por modelo y segmento (CLAUDE.md §5), editables desde el panel de
// admin. Sin fila en `model_pricing` rigen los valores por defecto.

/**
 * Tope del margen que acepta el panel (90 %), para frenar errores de tipeo: con
 * 99 % el precio sería 100 veces el costo.
 */
export const MAX_MARGIN_BPS = 9_000;
export const MAX_MIN_PRICE_CREDITS = 100_000;

export const segments = segmentEnum.enumValues;

export type PricingRow = {
  provider: string;
  modelId: string;
  modelName: string;
  mediaType: MediaType;
  segment: Segment;
  marginBps: number;
  minPriceCredits: number;
  /** Sin fila propia: rigen los valores por defecto. */
  isDefault: boolean;
  /** Precio de una generación de referencia (duración más corta), para comparar. */
  example: { durationSeconds?: number; priceCredits: number };
};

/** Margen y mínimo vigentes de cada modelo de cada proveedor, por segmento. */
export async function listEffectivePricing(
  db: Database,
  providers: GenerationProvider[],
): Promise<PricingRow[]> {
  const stored = await db.select().from(modelPricing);
  const key = (provider: string, modelId: string, segment: Segment) =>
    `${provider}|${modelId}|${segment}`;
  const byKey = new Map(
    stored.map((row) => [key(row.provider, row.modelId, row.segment), row]),
  );

  const rows: PricingRow[] = [];
  for (const provider of providers) {
    for (const model of await provider.listModels()) {
      const durationSeconds = model.durationsSeconds?.[0];
      const { costUsd } = await provider.estimate({
        modelId: model.id,
        prompt: "",
        aspectRatio: model.aspectRatios[0] ?? "1:1",
        durationSeconds,
      });
      for (const segment of segments) {
        const row = byKey.get(key(provider.id, model.id, segment));
        const marginBps = row?.marginBps ?? DEFAULT_MARGIN_BPS;
        const minPriceCredits =
          row?.minPriceCredits ?? DEFAULT_MIN_PRICE_CREDITS;
        rows.push({
          provider: provider.id,
          modelId: model.id,
          modelName: model.name,
          mediaType: model.mediaType,
          segment,
          marginBps,
          minPriceCredits,
          isDefault: !row,
          example: {
            durationSeconds,
            priceCredits: quotePrice({
              costMicroUsd: usdToMicroUsd(costUsd),
              marginBps,
              minPriceCredits,
            }).priceCredits,
          },
        });
      }
    }
  }
  return rows;
}

export class InvalidPricingError extends Error {
  constructor(readonly field: "model" | "marginBps" | "minPriceCredits") {
    super(`Precio inválido: ${field}`);
  }
}

type PricingKey = { provider: string; modelId: string; segment: Segment };

async function assertKnownModel(
  providers: GenerationProvider[],
  key: PricingKey,
) {
  const provider = providers.find((candidate) => candidate.id === key.provider);
  const models = provider ? await provider.listModels() : [];
  if (
    !models.some((model) => model.id === key.modelId) ||
    !segments.includes(key.segment)
  ) {
    throw new InvalidPricingError("model");
  }
}

/**
 * Guarda el margen y el mínimo de un modelo y segmento. Solo afecta a las
 * generaciones nuevas: cada job guarda el precio con el que se creó.
 */
export async function setModelPricing(
  db: Database,
  providers: GenerationProvider[],
  input: PricingKey & {
    marginBps: number;
    minPriceCredits: number;
    actorUserId: string;
  },
): Promise<void> {
  await assertKnownModel(providers, input);
  if (
    !Number.isInteger(input.marginBps) ||
    input.marginBps < MIN_MARGIN_BPS ||
    input.marginBps > MAX_MARGIN_BPS
  ) {
    throw new InvalidPricingError("marginBps");
  }
  if (
    !Number.isInteger(input.minPriceCredits) ||
    input.minPriceCredits < 1 ||
    input.minPriceCredits > MAX_MIN_PRICE_CREDITS
  ) {
    throw new InvalidPricingError("minPriceCredits");
  }

  const values = {
    marginBps: input.marginBps,
    minPriceCredits: input.minPriceCredits,
    updatedBy: input.actorUserId,
    updatedAt: new Date(),
  };
  await db
    .insert(modelPricing)
    .values({
      provider: input.provider,
      modelId: input.modelId,
      segment: input.segment,
      ...values,
    })
    .onConflictDoUpdate({
      target: [
        modelPricing.provider,
        modelPricing.modelId,
        modelPricing.segment,
      ],
      set: values,
    });
}

/** Vuelve a los valores por defecto (borra la fila propia). */
export async function resetModelPricing(
  db: Database,
  key: PricingKey,
): Promise<void> {
  await db
    .delete(modelPricing)
    .where(
      and(
        eq(modelPricing.provider, key.provider),
        eq(modelPricing.modelId, key.modelId),
        eq(modelPricing.segment, key.segment),
      ),
    );
}

/** "27,5" o "27.5" → 2750 puntos básicos; null si no es un número. */
export function parsePercentToBps(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
