import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type {
  AspectRatio,
  GenerationProvider,
  GenerationRequest,
  JobStatus,
  MediaType,
  ModelInfo,
  OutputFile,
  SubmitOptions,
} from "./generation-provider";

// Proveedor real: Higgsfield API (cloud.higgsfield.ai). Endpoints, cuerpos y
// estados verificados en la documentación oficial (docs.higgsfield.ai,
// septiembre de 2026). Ver docs/higgsfield.md.
//
// - Autenticación: `Authorization: Key <key_id>:<key_secret>`.
// - Envío: `POST /<endpoint del modelo>` → `{ request_id, status, ... }`.
// - Estado: `GET /requests/<request_id>/status`.
// - Estimación: `POST /estimate/<endpoint del modelo>` → `{ credits, usd }`.
// - Webhook: `?hf_webhook=<url>` al enviar; no viene firmado, así que nunca
//   se confía en su contenido (ver app/api/webhooks/higgsfield).

export const HIGGSFIELD_PROVIDER_ID = "higgsfield";
export const HIGGSFIELD_API_URL = "https://api.higgsfield.ai";

/** Ruta de nuestro webhook; Higgsfield la llama al terminar cada solicitud. */
export const HIGGSFIELD_WEBHOOK_PATH = "/api/webhooks/higgsfield";

const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_ESTIMATE_TTL_MS = 60 * 60 * 1000;
/** Reintentos del envío ante un corte de red o un 5xx, con la misma clave. */
const DEFAULT_RETRY_DELAYS_MS = [1_000, 3_000];

/** Prompt de relleno para estimar: el costo depende de los parámetros, no del texto. */
const ESTIMATE_PROMPT = "Product advertisement";

type ModelSpec = ModelInfo & {
  /** Endpoint sin foto y con foto del producto (ids de la documentación). */
  endpoints: { text: string; image: string };
  body(request: GenerationRequest): Record<string, unknown>;
};

const socialAspectRatios: readonly AspectRatio[] = ["9:16", "1:1", "16:9"];

// TODO(producto): validar calidad y costo de estos modelos con pruebas reales
// (con permiso para gastar saldo) antes de vender. Ver docs/higgsfield.md.
const catalog: readonly ModelSpec[] = [
  {
    id: "kling-3.0-std",
    name: "Kling 3.0 Standard",
    mediaType: "video",
    aspectRatios: socialAspectRatios,
    // La documentación acepta de 3 a 15 segundos.
    durationsSeconds: Array.from({ length: 13 }, (_, index) => index + 3),
    endpoints: {
      text: "kling-video/v3.0/std/text-to-video",
      image: "kling-video/v3.0/std/image-to-video",
    },
    // Con foto, el video toma el encuadre de la foto: por eso la foto llega ya
    // encuadrada en el formato elegido (lib/uploads/frame.ts).
    // TODO(producto): sonido generado (`sound: "on"`, el valor por defecto de
    // Kling). Por ahora va sin sonido.
    body: (request) => ({
      prompt: request.prompt,
      duration: request.durationSeconds,
      sound: "off",
      ...(request.inputImageUrl
        ? { image_url: request.inputImageUrl }
        : { aspect_ratio: request.aspectRatio }),
    }),
  },
  {
    id: "marketing-studio-image",
    name: "Marketing Studio Image",
    mediaType: "image",
    aspectRatios: socialAspectRatios,
    endpoints: {
      text: "marketing-studio/image",
      image: "marketing-studio/image",
    },
    // 1k alcanza para redes (1080 px). Con foto, la edita como referencia.
    body: (request) => ({
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      resolution: "1k",
      quality: "high",
      ...(request.inputImageUrl && { image_urls: [request.inputImageUrl] }),
    }),
  },
];

/** Error de la API de Higgsfield. Nunca incluye las credenciales. */
export class HiggsfieldApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly correlationId: string | null,
  ) {
    super(
      `Higgsfield respondió ${status}: ${detail}` +
        (correlationId ? ` (correlación ${correlationId})` : ""),
    );
  }

  /** 403: el saldo prepagado de Higgsfield no alcanza. */
  get insufficientCredits(): boolean {
    return this.status === 403;
  }
}

type RequestStatus = {
  status:
    "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";
  request_id: string;
  error?: string | null;
  images?: { url: string }[];
  video?: { url: string };
};

export type HiggsfieldOptions = {
  /** `<key_id>:<key_secret>` de la consola de Higgsfield. */
  credentials: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  /** Sin webhook (p. ej. en local, sin HTTPS público) solo hay polling. */
  webhook?: { siteUrl: string; secret: string };
  estimateTtlMs?: number;
  retryDelaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export class HiggsfieldProvider implements GenerationProvider {
  readonly id = HIGGSFIELD_PROVIDER_ID;
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly estimates = new Map<
    string,
    { costUsd: number; expiresAt: number }
  >();

  constructor(private readonly options: HiggsfieldOptions) {
    this.fetchFn = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? HIGGSFIELD_API_URL;
  }

  async listModels(): Promise<ModelInfo[]> {
    return catalog.map((spec) => ({
      id: spec.id,
      name: spec.name,
      mediaType: spec.mediaType,
      aspectRatios: spec.aspectRatios,
      durationsSeconds: spec.durationsSeconds,
    }));
  }

  /**
   * Costo en USD según Higgsfield. Se cachea por parámetros (no por prompt):
   * las páginas cotizan todas las plantillas en cada visita.
   *
   * Siempre se estima con el endpoint sin foto, porque la estimación con foto
   * necesitaría una foto real. TODO(producto): confirmar con la cuenta real
   * que con foto cuesta lo mismo.
   */
  async estimate(request: GenerationRequest): Promise<{ costUsd: number }> {
    const spec = this.spec(request.modelId);
    const body = spec.body({
      ...request,
      prompt: ESTIMATE_PROMPT,
      inputImageUrl: undefined,
    });
    const key = `${spec.endpoints.text} ${JSON.stringify(body)}`;
    const now = (this.options.now ?? Date.now)();
    const cached = this.estimates.get(key);
    if (cached && cached.expiresAt > now) return { costUsd: cached.costUsd };

    const data = await this.request<{ usd?: unknown }>(
      "POST",
      `/estimate/${spec.endpoints.text}`,
      body,
    );
    const costUsd = Number(data.usd);
    if (!Number.isFinite(costUsd) || costUsd < 0) {
      throw new Error("Higgsfield devolvió una estimación inválida.");
    }
    this.estimates.set(key, {
      costUsd,
      expiresAt: now + (this.options.estimateTtlMs ?? DEFAULT_ESTIMATE_TTL_MS),
    });
    return { costUsd };
  }

  /**
   * Envía la generación. La clave de idempotencia es nuestro id de job: si se
   * corta la red o Higgsfield responde 5xx, se reintenta con la misma clave y
   * no se crea (ni se cobra) otra generación.
   */
  async submit(
    request: GenerationRequest,
    options: SubmitOptions = {},
  ): Promise<{ providerJobId: string }> {
    const spec = this.spec(request.modelId);
    const endpoint = request.inputImageUrl
      ? spec.endpoints.image
      : spec.endpoints.text;
    const webhookUrl = this.webhookUrl(options.reference);
    const path = webhookUrl
      ? `/${endpoint}?hf_webhook=${encodeURIComponent(webhookUrl)}`
      : `/${endpoint}`;
    const idempotencyKey = options.reference ?? randomUUID();
    const delays = this.options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    const sleep =
      this.options.sleep ??
      ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

    for (let attempt = 0; ; attempt += 1) {
      try {
        const data = await this.request<{ request_id?: unknown }>(
          "POST",
          path,
          spec.body(request),
          { "Idempotency-Key": idempotencyKey },
        );
        if (typeof data.request_id !== "string" || data.request_id === "") {
          throw new Error("Higgsfield no devolvió el id de la solicitud.");
        }
        return { providerJobId: data.request_id };
      } catch (error) {
        const retryable =
          !(error instanceof HiggsfieldApiError) || error.status >= 500;
        if (!retryable || attempt >= delays.length) throw error;
        await sleep(delays[attempt] ?? 0);
      }
    }
  }

  async getStatus(providerJobId: string): Promise<JobStatus> {
    const data = await this.fetchStatus(providerJobId);
    switch (data.status) {
      case "queued":
        return { state: "pending" };
      case "in_progress":
        return { state: "running" };
      case "completed":
        return { state: "succeeded" };
      case "nsfw":
        return { state: "failed", error: "nsfw" };
      case "canceled":
        return { state: "failed", error: "canceled" };
      case "failed":
        return {
          state: "failed",
          error: data.error ? `provider: ${data.error}` : "provider_failed",
        };
      default:
        throw new Error(
          `Estado desconocido de Higgsfield: ${String(data.status)}`,
        );
    }
  }

  async fetchOutput(providerJobId: string): Promise<OutputFile[]> {
    const data = await this.fetchStatus(providerJobId);
    if (data.status !== "completed") {
      throw new Error(`La solicitud ${providerJobId} todavía no terminó.`);
    }
    const files: OutputFile[] = [];
    if (data.video?.url) files.push(outputFile(data.video.url, "video"));
    for (const image of data.images ?? []) {
      if (image.url) files.push(outputFile(image.url, "image"));
    }
    return files;
  }

  private spec(modelId: string): ModelSpec {
    const spec = catalog.find((candidate) => candidate.id === modelId);
    if (!spec)
      throw new Error(`Modelo desconocido para Higgsfield: ${modelId}`);
    return spec;
  }

  private webhookUrl(reference: string | undefined): string | null {
    const webhook = this.options.webhook;
    if (!webhook || !reference) return null;
    const url = new URL(HIGGSFIELD_WEBHOOK_PATH, webhook.siteUrl);
    url.searchParams.set("job", reference);
    url.searchParams.set(
      "sig",
      signWebhookReference(webhook.secret, reference),
    );
    return url.toString();
  }

  private fetchStatus(providerJobId: string): Promise<RequestStatus> {
    return this.request<RequestStatus>(
      "GET",
      `/requests/${encodeURIComponent(providerJobId)}/status`,
    );
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    // Sin credenciales (p. ej. el catálogo del panel de márgenes) no se llama.
    if (!this.options.credentials) {
      throw new Error("Higgsfield no está configurado (HIGGSFIELD_API_KEY).");
    }
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Key ${this.options.credentials}`,
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new HiggsfieldApiError(
        response.status,
        await errorDetail(response),
        response.headers.get("x-correlation-id"),
      );
    }
    return (await response.json()) as T;
  }
}

/** Firma de la URL del webhook de un job (HMAC-SHA256 en hex). */
export function signWebhookReference(
  secret: string,
  reference: string,
): string {
  return createHmac("sha256", secret).update(reference).digest("hex");
}

export function verifyWebhookSignature(
  secret: string,
  reference: string,
  signature: string,
): boolean {
  const expected = Buffer.from(signWebhookReference(secret, reference), "hex");
  const received = Buffer.from(signature, "hex");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

async function errorDetail(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    return JSON.stringify(data.detail ?? data).slice(0, 500);
  } catch {
    return response.statusText || "sin detalle";
  }
}

const extensionTypes: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/**
 * Resultado con el tipo que sugiere la extensión. La API no informa el tipo en
 * la consulta de estado; al copiarlo se usa el que declara la descarga
 * (lib/generation/outputs.ts).
 */
function outputFile(url: string, mediaType: MediaType): OutputFile {
  const extension = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  const guessed = extensionTypes[extension];
  return {
    url,
    mediaType,
    mimeType:
      guessed?.startsWith(`${mediaType}/`) === true
        ? guessed
        : mediaType === "video"
          ? "video/mp4"
          : "image/png",
  };
}
