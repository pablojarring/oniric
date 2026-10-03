import { z } from "zod";

// Esquemas de lo que produce el director creativo (GPT-6 Luna o el simulador).
// Se envían como salidas estrictas al proveedor de texto y se guardan en
// `creative_sessions`. En una salida estricta todos los campos son
// obligatorios: lo opcional es `.nullable()`.

/** Niveles de calidad que elige el cliente (docs/fase-a/experiencia-y-marca.md). */
export const qualityTiers = ["rapido", "pro", "cine"] as const;
export type QualityTier = (typeof qualityTiers)[number];

/** De qué trata cada pregunta de la conversación guiada. */
export const turnTopics = [
  "objective",
  "product",
  "differentiator",
  "audience",
  "offer",
  "brand_element",
  "other",
] as const;
export type TurnTopic = (typeof turnTopics)[number];

export const turnOptionSchema = z.object({
  /** Respuesta de un toque, pensada para este negocio. */
  label: z.string().min(1).max(90),
  /** Aclaración breve debajo de la respuesta. */
  hint: z.string().max(60).nullable(),
});
export type TurnOption = z.infer<typeof turnOptionSchema>;

export const brandElementKinds = [
  "character",
  "pet",
  "slogan",
  "jingle",
  "person",
  "other",
] as const;

export const brandElementSchema = z.object({
  name: z.string(),
  kind: z.enum(brandElementKinds),
  description: z.string(),
  /** El dueño quiere guardarlo en Mi marca. */
  saveToBrand: z.boolean(),
});
export type BrandElement = z.infer<typeof brandElementSchema>;

/** Lo que el director creativo entendió del anuncio: solo hechos del dueño. */
export const creativeBriefSchema = z.object({
  objective: z.string(),
  product: z.string(),
  audience: z.string().nullable(),
  differentiator: z.string().nullable(),
  offer: z.string().nullable(),
  tone: z.string().nullable(),
  brandElements: z.array(brandElementSchema).max(5),
  mustInclude: z.array(z.string()).max(8),
  avoid: z.array(z.string()).max(8),
});
export type CreativeBrief = z.infer<typeof creativeBriefSchema>;

/** Respuesta del director creativo a cada paso de la conversación. */
export const conversationTurnSchema = z.object({
  status: z.enum(["ask", "ready"]),
  topic: z.enum(turnTopics),
  /** Vacía cuando `status` es `ready`. */
  question: z.string().max(200),
  options: z.array(turnOptionSchema).max(5),
  /** Solo cuando `status` es `ready`. */
  brief: creativeBriefSchema.nullable(),
});
export type ConversationTurnOutput = z.infer<typeof conversationTurnSchema>;

export const ideaAngles = [
  "humor",
  "emotional",
  "demonstration",
  "aspirational",
  "other",
] as const;

const score = z.number().int().min(1).max(5);

export const creativeIdeaSchema = z.object({
  angle: z.enum(ideaAngles),
  title: z.string().max(60),
  /** La idea en una frase. */
  logline: z.string().max(240),
  /** Frase de cierre del anuncio. */
  closingLine: z.string().max(120),
  /** Cómo se vería, para el cliente. */
  visualSummary: z.string().max(400),
  /** Autoevaluación con la rúbrica (docs/fase-a/rubrica.md). */
  scores: z.object({ hook: score, relevance: score, originality: score }),
});
export type CreativeIdea = z.infer<typeof creativeIdeaSchema>;

export const creativeIdeasSchema = z.object({
  /** Una verdad sobre quien compra, para confirmar con un toque. */
  insight: z.string().max(240),
  ideas: z.array(creativeIdeaSchema).length(3),
});
export type CreativeIdeasOutput = z.infer<typeof creativeIdeasSchema>;

export const scriptShotSchema = z.object({
  startSecond: z.number().int().min(0),
  endSecond: z.number().int().min(1),
  label: z.string().max(40),
  action: z.string().max(300),
  camera: z.string().max(120),
  sound: z.string().max(120),
  /** Texto de la capa de edición en esta toma (nunca dentro del video). */
  onScreenText: z.string().max(120).nullable(),
});
export type ScriptShot = z.infer<typeof scriptShotSchema>;

/** Las partes del prompt detallado (docs/fase-a/manual-creativo.md). */
export const promptPartsSchema = z.object({
  subject: z.string(),
  action: z.string(),
  environment: z.string(),
  camera: z.string(),
  lighting: z.string(),
  style: z.string(),
  sound: z.string(),
  constraints: z.string(),
});
export type PromptParts = z.infer<typeof promptPartsSchema>;

export const creativeScriptSchema = z.object({
  title: z.string().max(60),
  shots: z.array(scriptShotSchema).min(1).max(6),
  callToAction: z.string().max(120),
  promptParts: promptPartsSchema,
  /** Prompt del video, en inglés, con las tomas y sus tiempos. */
  videoPrompt: z.string().max(2500),
  /** Prompt del primer cuadro (la imagen de prueba), en inglés. */
  keyframePrompt: z.string().max(1200),
});
export type CreativeScriptOutput = z.infer<typeof creativeScriptSchema>;
