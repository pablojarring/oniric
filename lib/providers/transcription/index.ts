import { openaiTextConfig } from "../text";
import { MockTranscriptionProvider } from "./mock";
import { OpenAITranscriptionProvider } from "./openai";
import type { TranscriptionProvider } from "./transcription-provider";

export type {
  TranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResult,
} from "./transcription-provider";

type Env = Record<string, string | undefined>;

let mockProvider: MockTranscriptionProvider | undefined;
let openaiProvider: OpenAITranscriptionProvider | undefined;

/**
 * Configuración de la transcripción, o null sin `OPENAI_API_KEY`.
 * `OPENAI_TRANSCRIPTION_MODEL` cambia el modelo (por defecto, gpt-transcribe).
 */
export function openaiTranscriptionConfig(env: Env) {
  const text = openaiTextConfig(env);
  if (!text) return null;
  return {
    apiKey: text.apiKey,
    model: env.OPENAI_TRANSCRIPTION_MODEL?.trim() || undefined,
  };
}

/**
 * Transcripción: OpenAI con `OPENAI_API_KEY`; sin ella, el simulador. Con la
 * clave, cada nota de voz gasta saldo real de OpenAI.
 */
export function getTranscriptionProvider(): TranscriptionProvider {
  const config = openaiTranscriptionConfig(process.env);
  if (!config) {
    mockProvider ??= new MockTranscriptionProvider();
    return mockProvider;
  }
  openaiProvider ??= new OpenAITranscriptionProvider(config);
  return openaiProvider;
}
