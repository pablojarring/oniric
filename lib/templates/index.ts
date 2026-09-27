import type {
  AspectRatio,
  MediaType,
} from "@/lib/providers/generation-provider";

// Plantillas de anuncios del modo pyme (CLAUDE.md §4). El usuario pyme no elige
// modelo ni parámetros: los define la plantilla. Los nombres, descripciones y
// el copy sugerido están en messages/*.json (namespace "Templates").
//
// TODO(producto): validar las tres plantillas y su estilo. Hoy viven en código;
// si hace falta editarlas sin deploy, pasarlas a la tabla `templates`.

export const templateIds = [
  "promoInstagram",
  "whatsappStatus",
  "dailyOffer",
] as const;

export type TemplateId = (typeof templateIds)[number];

export type AdTemplate = {
  id: TemplateId;
  mediaType: MediaType;
  /** Duración del video en segundos. */
  durationSeconds?: number;
  aspectRatios: readonly AspectRatio[];
  defaultAspectRatio: AspectRatio;
  /** Modelo que usa la plantilla en cada proveedor (`GenerationProvider.id`). */
  models: Readonly<Record<string, string>>;
  /** La oferta ("2x1", "20 % de descuento") es obligatoria en esta plantilla. */
  requiresOffer: boolean;
  /** Instrucciones de estilo para el modelo, en inglés. */
  style: string;
};

// TODO(fase 3): modelos de Higgsfield para cada plantilla, verificados en su
// documentación oficial.
export const adTemplates: Record<TemplateId, AdTemplate> = {
  promoInstagram: {
    id: "promoInstagram",
    mediaType: "video",
    durationSeconds: 15,
    aspectRatios: ["9:16", "1:1", "16:9"],
    defaultAspectRatio: "9:16",
    models: { mock: "mock-video-standard" },
    requiresOffer: false,
    style:
      "Energetic 15-second social media promo video with dynamic cuts, bright natural lighting and a clear call to action at the end.",
  },
  whatsappStatus: {
    id: "whatsappStatus",
    mediaType: "video",
    durationSeconds: 10,
    aspectRatios: ["9:16"],
    defaultAspectRatio: "9:16",
    models: { mock: "mock-video-standard" },
    requiresOffer: false,
    style:
      "Short, friendly vertical video for a WhatsApp status, close-up shots, warm tones and large readable text.",
  },
  dailyOffer: {
    id: "dailyOffer",
    mediaType: "image",
    aspectRatios: ["1:1", "9:16", "16:9"],
    defaultAspectRatio: "1:1",
    models: { mock: "mock-image" },
    requiresOffer: true,
    style:
      "Bold promotional graphic announcing a limited-time offer, high contrast colors, the offer as the main headline.",
  },
};

export function isTemplateId(value: unknown): value is TemplateId {
  return templateIds.includes(value as TemplateId);
}

/** Modelo de la plantilla para el proveedor activo. */
export function modelForTemplate(
  template: AdTemplate,
  providerId: string,
): string {
  const modelId = template.models[providerId];
  if (!modelId) {
    throw new Error(
      `La plantilla ${template.id} no tiene modelo para el proveedor ${providerId}.`,
    );
  }
  return modelId;
}

export const MAX_PROMPT_LENGTH = 2_000;

/**
 * Prompt para el proveedor: estilo de la plantilla + datos del producto + copy.
 * El copy va entre comillas para que el modelo lo muestre tal cual, en el
 * idioma del cliente.
 */
export function buildPrompt(
  template: AdTemplate,
  input: {
    productName: string;
    description?: string;
    offer?: string;
    adCopy: string;
    hasProductPhoto: boolean;
  },
): string {
  const parts = [
    template.style,
    `Product or service: ${input.productName}.`,
    input.description
      ? `Details from the business owner: ${input.description}`
      : null,
    input.offer ? `Offer to highlight: ${input.offer}.` : null,
    input.hasProductPhoto
      ? "Show the product exactly as it appears in the reference photo."
      : null,
    `On-screen text, keep it in its original language: "${input.adCopy}"`,
  ];
  return parts.filter(Boolean).join(" ").slice(0, MAX_PROMPT_LENGTH);
}
