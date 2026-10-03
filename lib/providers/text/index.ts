import { MockTextProvider } from "./mock";
import { OpenAITextProvider } from "./openai";
import type { TextProvider } from "./text-provider";

export type {
  TextMessage,
  TextPart,
  TextProvider,
  TextRequest,
  TextResult,
  TextUsage,
} from "./text-provider";

type Env = Record<string, string | undefined>;

let mockProvider: MockTextProvider | undefined;
let openaiProvider: OpenAITextProvider | undefined;

/**
 * Configuración de OpenAI según el entorno, o null sin `OPENAI_API_KEY`.
 * `OPENAI_TEXT_MODEL` cambia el modelo (por defecto, GPT-6 Luna).
 */
export function openaiTextConfig(env: Env) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, model: env.OPENAI_TEXT_MODEL?.trim() || undefined };
}

/**
 * Proveedor de texto: OpenAI con `OPENAI_API_KEY`; sin ella, el simulador
 * (CLAUDE.md §8). Con la clave, cada pedido gasta saldo real de OpenAI.
 */
export function getTextProvider(): TextProvider {
  const config = openaiTextConfig(process.env);
  if (!config) {
    mockProvider ??= new MockTextProvider();
    return mockProvider;
  }
  openaiProvider ??= new OpenAITextProvider(config);
  return openaiProvider;
}
