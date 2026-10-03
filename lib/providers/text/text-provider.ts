// Interfaz de los proveedores de texto: el "director creativo" del flujo
// creativo (conversación, brief, ideas, guion y prompts). Igual que con
// GenerationProvider, el resto de la app solo depende de esta interfaz; cambiar
// de modelo o de proveedor no debe tocar nada más. Ver docs/proveedor-de-texto.md.

import type { z } from "zod";

export type TextPart =
  | { type: "text"; text: string }
  /** Imagen por URL pública o firmada (solo en mensajes del usuario). */
  | { type: "image"; url: string };

export interface TextMessage {
  role: "user" | "assistant";
  content: string | TextPart[];
}

export interface TextRequest<T> {
  /**
   * Nombre de la tarea (`conversation_question`, `creative_ideas`...): nombra el
   * esquema de salida ante el proveedor y aparece en los registros de uso.
   * Letras, números, `_` y `-`, hasta 64 caracteres.
   */
  task: string;
  /** Instrucciones de sistema: el rol y las reglas de la tarea. */
  instructions: string;
  messages: TextMessage[];
  /**
   * Esquema de la respuesta. Se envía como JSON Schema estricto y además se
   * valida al recibirla. Todos los campos son obligatorios: lo opcional se
   * declara con `.nullable()`.
   */
  schema: z.ZodType<T>;
  /** Tope de tokens de salida (incluye el razonamiento del modelo). */
  maxOutputTokens?: number;
  /**
   * Respuesta del simulador para esta tarea (desarrollo y tests). El proveedor
   * real la ignora.
   */
  mock?: (request: TextRequest<T>) => T;
}

export interface TextUsage {
  inputTokens: number;
  /** Parte de la entrada que el proveedor cobró como caché. */
  cachedInputTokens: number;
  outputTokens: number;
  /** Costo del proveedor en micro-dólares, redondeado hacia arriba. */
  costMicroUsd: number;
}

export interface TextResult<T> {
  output: T;
  model: string;
  usage: TextUsage;
}

export interface TextProvider {
  /** Identificador que se guarda con cada uso (`openai`, `mock`). */
  readonly id: string;
  /** Modelo que usa el proveedor (`gpt-6-luna`). */
  readonly model: string;
  generate<T>(request: TextRequest<T>): Promise<TextResult<T>>;
}

/** Precio por millón de tokens, en USD. */
export interface TextModelPrice {
  input: number;
  cachedInput: number;
  output: number;
}

/** Costo en micro-dólares: tokens × US$ por millón de tokens = micro-dólares. */
export function textCostMicroUsd(
  price: TextModelPrice,
  usage: Omit<TextUsage, "costMicroUsd">,
): number {
  const uncached = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);
  return Math.ceil(
    uncached * price.input +
      usage.cachedInputTokens * price.cachedInput +
      usage.outputTokens * price.output,
  );
}

const TASK_NAME = /^[A-Za-z0-9_-]{1,64}$/;

export function assertTaskName(task: string): void {
  if (!TASK_NAME.test(task)) {
    throw new Error(
      `Nombre de tarea inválido: "${task}". Usa letras, números, _ o -, hasta 64 caracteres.`,
    );
  }
}
