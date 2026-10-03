import { toStrictJsonSchema } from "./json-schema";
import {
  assertTaskName,
  textCostMicroUsd,
  type TextMessage,
  type TextModelPrice,
  type TextProvider,
  type TextRequest,
  type TextResult,
} from "./text-provider";

// Proveedor real de texto: API de OpenAI (Responses API) con salidas
// estructuradas estrictas. Modelo por defecto: GPT-6 Luna (`gpt-6-luna`), con
// imágenes y JSON Schema estricto (decisión del dueño, octubre de 2026). Ver
// docs/proveedor-de-texto.md.
//
// - Autenticación: `Authorization: Bearer <OPENAI_API_KEY>`.
// - Pedido: `POST /v1/responses` con `instructions`, `input` y
//   `text.format = { type: "json_schema", strict: true, ... }`.
// - Respuesta: `output[]` con mensajes cuyo contenido es `output_text` o
//   `refusal`, y `usage` con los tokens de entrada (y caché) y de salida.
// - `store: false`: OpenAI no guarda las conversaciones de los clientes.

export const OPENAI_TEXT_PROVIDER_ID = "openai";
export const OPENAI_API_URL = "https://api.openai.com/v1";
export const DEFAULT_TEXT_MODEL = "gpt-6-luna";

/** Tarifa estándar de GPT-6 Luna por millón de tokens (US$, octubre de 2026). */
const gpt6LunaPrice: TextModelPrice = {
  input: 0.1,
  cachedInput: 0.01,
  output: 0.5,
};

/**
 * Precios por modelo. Un modelo sin precio aquí no se puede usar: sin su costo
 * no se puede cobrar (docs/fase-b/precios.md, sección 2).
 */
export const textModelPrices: Record<string, TextModelPrice> = {
  [DEFAULT_TEXT_MODEL]: gpt6LunaPrice,
};

/** Tarifa del modelo por defecto (la usa también el simulador). */
export const defaultTextModelPrice = gpt6LunaPrice;

const REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 4_000;
/** Reintentos ante un corte de red, un 5xx o un 429 que no sea falta de saldo. */
const DEFAULT_RETRY_DELAYS_MS = [1_000, 3_000];

/** Error de la API de OpenAI. Nunca incluye la clave. */
export class OpenAIApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    readonly detail: string,
    readonly requestId: string | null,
  ) {
    super(
      `OpenAI respondió ${status}${code ? ` (${code})` : ""}: ${detail}` +
        (requestId ? ` (solicitud ${requestId})` : ""),
    );
  }

  /** Sin saldo o al tope de gasto del proyecto en OpenAI. */
  get quotaExceeded(): boolean {
    return this.code === "insufficient_quota";
  }

  get retryable(): boolean {
    return this.status >= 500 || (this.status === 429 && !this.quotaExceeded);
  }
}

/** El modelo se negó a responder (por ejemplo, por seguridad). */
export class TextRefusalError extends Error {
  constructor(readonly refusal: string) {
    super(`El modelo se negó a responder: ${refusal}`);
  }
}

export type OpenAITextOptions = {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  retryDelaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
};

type ResponseContent =
  | { type: "output_text"; text: string }
  | { type: "refusal"; refusal: string }
  | { type: string };

type ResponseBody = {
  model?: string;
  status?: string;
  incomplete_details?: { reason?: string } | null;
  error?: { message?: string } | null;
  output?: { type: string; content?: ResponseContent[] }[];
  usage?: {
    input_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens?: number;
  };
};

export class OpenAITextProvider implements TextProvider {
  readonly id = OPENAI_TEXT_PROVIDER_ID;
  readonly model: string;
  private readonly price: TextModelPrice;
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: OpenAITextOptions) {
    this.model = options.model ?? DEFAULT_TEXT_MODEL;
    const price = textModelPrices[this.model];
    if (!price) {
      throw new Error(
        `Sin precio para el modelo de texto "${this.model}": agrégalo en textModelPrices.`,
      );
    }
    this.price = price;
    this.fetchFn = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? OPENAI_API_URL;
  }

  async generate<T>(request: TextRequest<T>): Promise<TextResult<T>> {
    assertTaskName(request.task);
    const body = {
      model: this.model,
      instructions: request.instructions,
      input: request.messages.map(toInputMessage),
      text: {
        format: {
          type: "json_schema",
          name: request.task,
          schema: toStrictJsonSchema(request.schema),
          strict: true,
        },
      },
      max_output_tokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      store: false,
    };

    const data = await this.postWithRetries(body);

    if (data.status !== "completed") {
      const reason =
        data.incomplete_details?.reason ?? data.error?.message ?? data.status;
      throw new Error(`OpenAI no completó la respuesta: ${reason}.`);
    }

    const contents = (data.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? []);
    const refusal = contents.find(
      (part): part is { type: "refusal"; refusal: string } =>
        part.type === "refusal",
    );
    if (refusal) throw new TextRefusalError(refusal.refusal);
    const text = contents
      .filter(
        (part): part is { type: "output_text"; text: string } =>
          part.type === "output_text",
      )
      .map((part) => part.text)
      .join("");
    if (!text) throw new Error("OpenAI devolvió una respuesta vacía.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("OpenAI devolvió un JSON inválido.");
    }
    const output = request.schema.parse(parsed);

    const inputTokens = data.usage?.input_tokens ?? 0;
    const cachedInputTokens =
      data.usage?.input_tokens_details?.cached_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;
    return {
      output,
      model: data.model ?? this.model,
      usage: {
        inputTokens,
        cachedInputTokens,
        outputTokens,
        costMicroUsd: textCostMicroUsd(this.price, {
          inputTokens,
          cachedInputTokens,
          outputTokens,
        }),
      },
    };
  }

  private async postWithRetries(body: unknown): Promise<ResponseBody> {
    const delays = this.options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    const sleep =
      this.options.sleep ??
      ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.post(body);
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

  private async post(body: unknown): Promise<ResponseBody> {
    const response = await this.fetchFn(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const { code, message } = await errorDetail(response);
      throw new OpenAIApiError(
        response.status,
        code,
        message,
        response.headers.get("x-request-id"),
      );
    }
    return (await response.json()) as ResponseBody;
  }
}

function toInputMessage(message: TextMessage) {
  if (typeof message.content === "string") {
    return { role: message.role, content: message.content };
  }
  if (message.role !== "user") {
    throw new Error("Solo los mensajes del usuario pueden llevar imágenes.");
  }
  return {
    role: message.role,
    content: message.content.map((part) =>
      part.type === "text"
        ? { type: "input_text", text: part.text }
        : { type: "input_image", image_url: part.url },
    ),
  };
}

async function errorDetail(
  response: Response,
): Promise<{ code: string | null; message: string }> {
  try {
    const data = (await response.json()) as {
      error?: { code?: unknown; message?: unknown };
    };
    return {
      code: typeof data.error?.code === "string" ? data.error.code : null,
      message:
        typeof data.error?.message === "string"
          ? data.error.message.slice(0, 500)
          : response.statusText || "sin detalle",
    };
  } catch {
    return { code: null, message: response.statusText || "sin detalle" };
  }
}
