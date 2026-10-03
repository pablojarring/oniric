import {
  DEFAULT_TRANSCRIPTION_MODEL,
  transcriptionPricesPerMinute,
} from "./openai";
import {
  transcriptionCostMicroUsd,
  type TranscriptionProvider,
  type TranscriptionRequest,
  type TranscriptionResult,
} from "./transcription-provider";

// Transcripción falsa para desarrollo y tests (CLAUDE.md §8). Devuelve la
// respuesta de prueba del pedido o una frase fija, y cobra la duración medida
// con la tarifa del modelo real.

export const MOCK_TRANSCRIPT = "Quiero que más gente conozca mi negocio";

export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly id = "mock";
  readonly model = `${DEFAULT_TRANSCRIPTION_MODEL} (mock)`;

  async transcribe(
    request: TranscriptionRequest,
  ): Promise<TranscriptionResult> {
    const price =
      transcriptionPricesPerMinute[DEFAULT_TRANSCRIPTION_MODEL] ?? 0;
    return {
      text: request.mock ?? MOCK_TRANSCRIPT,
      model: this.model,
      seconds: request.durationSeconds,
      costMicroUsd: transcriptionCostMicroUsd(price, request.durationSeconds),
    };
  }
}
