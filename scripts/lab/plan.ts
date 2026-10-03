import type {
  AspectRatio,
  GenerationRequest,
} from "@/lib/providers/generation-provider";
import { HIGGSFIELD_PROVIDER_ID } from "@/lib/providers/higgsfield";
import {
  adTemplates,
  buildPrompt,
  MAX_PROMPT_LENGTH,
  modelForTemplate,
  type TemplateId,
} from "@/lib/templates";
import messages from "@/messages/es.json";

// Plan del laboratorio de prompts (scripts/higgsfield-lab.ts): qué se genera
// con Higgsfield real para calibrar las plantillas antes de vender. Compara el
// prompt de producción ("actual", que pide el texto dentro del anuncio) con uno
// experimental ("limpio": sin texto y con espacio libre para la capa de texto,
// precio y logo que pondremos nosotros). Ver docs/higgsfield.md.

export type PromptVariant = "actual" | "limpio";

export type LabCase = {
  id: string;
  templateId: TemplateId;
  aspectRatio: AspectRatio;
  variant: PromptVariant;
  withPhoto: boolean;
};

/** Producto de ejemplo para los casos sin foto. */
export const sampleProduct = {
  business: "Panadería La Esquina",
  productName: "Pan de yuca",
  description:
    "Recién horneado en Quito, crocante por fuera y suave por dentro.",
  offer: "2x1",
};

// En orden de prioridad: si el saldo no alcanza para todos, corren los
// primeros. Primero las imágenes (baratas), después los videos de 10 s y al
// final la promo de 15 s.
export const labCases: readonly LabCase[] = [
  {
    id: "oferta-actual",
    templateId: "dailyOffer",
    aspectRatio: "1:1",
    variant: "actual",
    withPhoto: false,
  },
  {
    id: "oferta-limpio",
    templateId: "dailyOffer",
    aspectRatio: "1:1",
    variant: "limpio",
    withPhoto: false,
  },
  {
    id: "oferta-foto-limpio",
    templateId: "dailyOffer",
    aspectRatio: "1:1",
    variant: "limpio",
    withPhoto: true,
  },
  {
    id: "whatsapp-actual",
    templateId: "whatsappStatus",
    aspectRatio: "9:16",
    variant: "actual",
    withPhoto: false,
  },
  {
    id: "whatsapp-limpio",
    templateId: "whatsappStatus",
    aspectRatio: "9:16",
    variant: "limpio",
    withPhoto: false,
  },
  {
    id: "whatsapp-foto-limpio",
    templateId: "whatsappStatus",
    aspectRatio: "9:16",
    variant: "limpio",
    withPhoto: true,
  },
  {
    id: "promo-limpio",
    templateId: "promoInstagram",
    aspectRatio: "9:16",
    variant: "limpio",
    withPhoto: false,
  },
];

/** Casos que se pueden correr: los de foto solo si hay foto. */
export function selectCases(options: {
  hasPhoto: boolean;
  only?: readonly string[];
}): LabCase[] {
  return labCases.filter(
    (labCase) =>
      (options.hasPhoto || !labCase.withPhoto) &&
      (!options.only?.length || options.only.includes(labCase.id)),
  );
}

// Estilos sin texto: el anuncio es la imagen; el texto lo ponemos nosotros.
const cleanStyles: Record<TemplateId, string> = {
  promoInstagram:
    "Cinematic 15-second vertical product commercial. The product is the hero: slow dolly-in and a gentle orbit, soft natural light, shallow depth of field, premium and authentic look.",
  whatsappStatus:
    "Warm 10-second vertical clip: close-up of the product in a real, everyday setting, natural light, friendly and authentic mood.",
  dailyOffer:
    "Clean promotional product photo: the product as the hero on a simple, bold-colored backdrop, studio lighting, high contrast, modern editorial look.",
};

// Zonas libres donde irá la capa de texto (y donde Instagram y TikTok ponen
// sus botones en los formatos verticales).
const safeAreas: Record<AspectRatio, string> = {
  "9:16":
    "Keep the top quarter and the bottom third of the frame calm and simple, with no important details, because text and buttons will be placed there later. Keep the product in the center of the frame.",
  "1:1":
    "Leave the upper third of the frame as clean, simple background for a headline added later. Keep the product in the lower two thirds.",
  "16:9":
    "Leave the left third of the frame as clean, simple background for text added later. Keep the product on the right side.",
};

const NO_TEXT =
  "Do not render any text, letters, numbers, prices, logos, signs or watermarks anywhere.";
const SLOW_CAMERA = "Smooth, slow camera movement and no fast cuts.";

/** Prompt experimental "limpio": sin texto y con espacio para la capa propia. */
export function buildCleanPrompt(
  templateId: TemplateId,
  aspectRatio: AspectRatio,
  input: {
    productName: string;
    description?: string;
    hasProductPhoto: boolean;
    seasonScene?: string;
  },
): string {
  const template = adTemplates[templateId];
  const parts = [
    cleanStyles[templateId],
    input.seasonScene ?? null,
    `Product or service: ${input.productName}.`,
    input.description
      ? `Details from the business owner: ${input.description}`
      : null,
    input.hasProductPhoto
      ? "Show the product exactly as it appears in the reference photo."
      : null,
    safeAreas[aspectRatio],
    template.mediaType === "video" ? SLOW_CAMERA : null,
    NO_TEXT,
  ];
  return parts.filter(Boolean).join(" ").slice(0, MAX_PROMPT_LENGTH);
}

/** Copy sugerido de la plantilla en español, como lo arma el asistente. */
export function sampleCopy(templateId: TemplateId): string {
  return messages.Templates.items[templateId].copy
    .replace("{product}", sampleProduct.productName)
    .replace("{business}", sampleProduct.business)
    .replace("{offer}", sampleProduct.offer);
}

/** Solicitud a Higgsfield para un caso, con los parámetros de la plantilla. */
export function buildLabRequest(
  labCase: LabCase,
  photoUrl?: string,
): GenerationRequest {
  const template = adTemplates[labCase.templateId];
  const hasProductPhoto = labCase.withPhoto && photoUrl !== undefined;
  const prompt =
    labCase.variant === "actual"
      ? buildPrompt(template, {
          productName: sampleProduct.productName,
          description: sampleProduct.description,
          offer: template.requiresOffer ? sampleProduct.offer : undefined,
          adCopy: sampleCopy(labCase.templateId),
          hasProductPhoto,
        })
      : buildCleanPrompt(labCase.templateId, labCase.aspectRatio, {
          productName: sampleProduct.productName,
          description: sampleProduct.description,
          hasProductPhoto,
        });
  return {
    modelId: modelForTemplate(template, HIGGSFIELD_PROVIDER_ID),
    prompt,
    aspectRatio: labCase.aspectRatio,
    durationSeconds: template.durationSeconds,
    inputImageUrl: hasProductPhoto ? photoUrl : undefined,
  };
}

export type PlannedCase = { labCase: LabCase; costUsd: number };

/**
 * Qué casos entran en el presupuesto, en orden de prioridad. Un caso que no
 * entra se salta y se sigue con los siguientes (pueden ser más baratos).
 */
export function planRuns(
  estimates: readonly PlannedCase[],
  budgetUsd: number,
): { run: PlannedCase[]; skipped: PlannedCase[]; totalUsd: number } {
  const run: PlannedCase[] = [];
  const skipped: PlannedCase[] = [];
  let totalUsd = 0;
  for (const estimate of estimates) {
    // Tolerancia mínima por el redondeo de los decimales.
    if (totalUsd + estimate.costUsd <= budgetUsd + 1e-9) {
      run.push(estimate);
      totalUsd += estimate.costUsd;
    } else {
      skipped.push(estimate);
    }
  }
  return { run, skipped, totalUsd };
}
