// Proveedor de transcripción de notas de voz, desacoplado de OpenAI como el de
// texto (docs/proveedor-de-texto.md). Lo usa el director creativo para que el
// dueño responda o pida cambios hablando.

export type TranscriptionRequest = {
  audio: Blob;
  /** Nombre con la extensión del formato (la API lo usa para reconocerlo). */
  filename: string;
  /** Duración que midió el navegador, por si la API no la informa. */
  durationSeconds: number;
  /** Contexto en texto libre que ayuda a reconocer nombres y términos. */
  context: string;
  /** Respuesta del simulador. */
  mock?: string;
};

export type TranscriptionResult = {
  text: string;
  model: string;
  /** Segundos de audio cobrados. */
  seconds: number;
  /** Costo al proveedor en millonésimas de dólar (redondeado hacia arriba). */
  costMicroUsd: number;
};

export interface TranscriptionProvider {
  readonly id: string;
  readonly model: string;
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
}

/** Costo de una transcripción cobrada por minuto de audio. */
export function transcriptionCostMicroUsd(
  pricePerMinuteUsd: number,
  seconds: number,
): number {
  return Math.ceil((seconds / 60) * pricePerMinuteUsd * 1_000_000);
}
