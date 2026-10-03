import {
  errorDetail,
  OPENAI_API_URL,
  OPENAI_TEXT_PROVIDER_ID,
  OpenAIApiError,
} from "../text/openai";
import {
  transcriptionCostMicroUsd,
  type TranscriptionProvider,
  type TranscriptionRequest,
  type TranscriptionResult,
} from "./transcription-provider";

// Transcripción real con la API de OpenAI (octubre de 2026):
// `POST /v1/audio/transcriptions` en multipart con `file`, `model` y `prompt`
// (contexto en texto libre). Responde `{ text, languages?, usage? }`, donde
// `usage` puede ser `{ type: "duration", seconds }`. Formatos: mp3, mp4, mpeg,
// mpga, m4a, wav y webm, hasta 25 MB.
//
// TODO: probar `languages` (pistas de idioma ISO 639-1) y `keywords` (nombre
// del negocio) cuando se confirme cómo se mandan los arreglos en multipart.

export const DEFAULT_TRANSCRIPTION_MODEL = "gpt-transcribe";

/** Tarifas por minuto de audio (US$, octubre de 2026). */
export const transcriptionPricesPerMinute: Record<string, number> = {
  [DEFAULT_TRANSCRIPTION_MODEL]: 0.0045,
};

const REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_DELAYS_MS = [1_000];

export type OpenAITranscriptionOptions = {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  retryDelaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
};

type TranscriptionBody = {
  text?: unknown;
  usage?: { type?: string; seconds?: number };
};

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  readonly id = OPENAI_TEXT_PROVIDER_ID;
  readonly model: string;
  private readonly pricePerMinute: number;
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: OpenAITranscriptionOptions) {
    this.model = options.model ?? DEFAULT_TRANSCRIPTION_MODEL;
    const price = transcriptionPricesPerMinute[this.model];
    if (price === undefined) {
      throw new Error(
        `Sin precio para el modelo de transcripción "${this.model}": agrégalo en transcriptionPricesPerMinute.`,
      );
    }
    this.pricePerMinute = price;
    this.fetchFn = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? OPENAI_API_URL;
  }

  async transcribe(
    request: TranscriptionRequest,
  ): Promise<TranscriptionResult> {
    const data = await this.postWithRetries(request);
    if (typeof data.text !== "string") {
      throw new Error("OpenAI devolvió una transcripción sin texto.");
    }
    const seconds =
      data.usage?.type === "duration" && typeof data.usage.seconds === "number"
        ? data.usage.seconds
        : request.durationSeconds;
    return {
      text: data.text.trim(),
      model: this.model,
      seconds,
      costMicroUsd: transcriptionCostMicroUsd(this.pricePerMinute, seconds),
    };
  }

  private async postWithRetries(
    request: TranscriptionRequest,
  ): Promise<TranscriptionBody> {
    const delays = this.options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    const sleep =
      this.options.sleep ??
      ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.post(request);
      } catch (error) {
        const retryable =
          error instanceof OpenAIApiError
            ? error.retryable
            : error instanceof TypeError ||
              (error instanceof DOMException && error.name === "TimeoutError");
        const delay = delays[attempt];
        if (!retryable || delay === undefined) throw error;
        await sleep(delay);
      }
    }
  }

  private async post(
    request: TranscriptionRequest,
  ): Promise<TranscriptionBody> {
    const form = new FormData();
    form.append("file", request.audio, request.filename);
    form.append("model", this.model);
    if (request.context) form.append("prompt", request.context);
    const response = await this.fetchFn(
      `${this.baseUrl}/audio/transcriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          Accept: "application/json",
        },
        body: form,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      const { code, message } = await errorDetail(response);
      throw new OpenAIApiError(
        response.status,
        code,
        message,
        response.headers.get("x-request-id"),
      );
    }
    return (await response.json()) as TranscriptionBody;
  }
}
