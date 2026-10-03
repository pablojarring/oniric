import type { QualityTier } from "./schemas";

// Qué cambia cada nivel de calidad en el guion. El modelo y el precio de cada
// nivel se definen con la imagen de prueba y el video (fase C, tramo 1, paso 3).
//
// TODO(fase C): mientras solo esté integrado Kling 3.0 (de 3 a 15 s), Cine usa
// 15 s; con Cinema Studio o Seedance llega a 30 s (docs/fase-b/precios.md).

export type TierSettings = {
  durationSeconds: number;
  maxShots: number;
  /** Cómo se lo describe al director creativo. */
  brief: string;
};

export const tierSettings: Record<QualityTier, TierSettings> = {
  rapido: {
    durationSeconds: 10,
    maxShots: 2,
    brief:
      "Quick everyday social content: one location, one or two shots, simple and punchy.",
  },
  pro: {
    durationSeconds: 10,
    maxShots: 4,
    brief:
      "Paid social ad: up to four shots, crafted lighting and camera moves, strong hook.",
  },
  cine: {
    durationSeconds: 15,
    maxShots: 6,
    brief:
      "Brand campaign with cinematic direction: several shots, premium look, memorable story.",
  },
};
