import { randomUUID } from "node:crypto";

import type {
  AspectRatio,
  GenerationProvider,
  GenerationRequest,
  JobStatus,
  ModelInfo,
  OutputFile,
} from "./generation-provider";

// Proveedor falso para desarrollo y tests (CLAUDE.md §8: no gastar saldo real).
//
// No guarda estado: el resultado de cada job va codificado en su id, así
// funciona igual con varias instancias del servidor o después de reiniciarlo.

/** Un prompt con este texto hace que el job falle (útil en desarrollo y tests). */
export const MOCK_FAILURE_MARKER = "[mock:falla]";

const models: ModelInfo[] = [
  {
    id: "mock-video-standard",
    name: "Video estándar (mock)",
    mediaType: "video",
    aspectRatios: ["9:16", "1:1", "16:9"],
    durationsSeconds: [5, 10, 15],
  },
  {
    id: "mock-video-pro",
    name: "Video pro (mock)",
    mediaType: "video",
    aspectRatios: ["9:16", "16:9"],
    durationsSeconds: [5, 10],
  },
  {
    id: "mock-image",
    name: "Imagen (mock)",
    mediaType: "image",
    aspectRatios: ["9:16", "1:1", "16:9"],
  },
];

/** Costo simulado del proveedor, en USD. */
const costs: Record<string, { perSecond?: number; perOutput?: number }> = {
  "mock-video-standard": { perSecond: 0.05 },
  "mock-video-pro": { perSecond: 0.12 },
  "mock-image": { perOutput: 0.02 },
};

const dimensions: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

type EncodedJob = {
  submittedAt: number;
  outcome: "ok" | "fail";
  modelId: string;
  aspectRatio: AspectRatio;
  durationSeconds?: number;
};

function encode(job: EncodedJob): string {
  const payload = Buffer.from(JSON.stringify(job)).toString("base64url");
  return `mock_${payload}_${randomUUID()}`;
}

function decode(providerJobId: string): EncodedJob {
  const [prefix, payload] = providerJobId.split("_");
  if (prefix !== "mock" || !payload) {
    throw new Error(`Id de job desconocido para el mock: ${providerJobId}`);
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString()) as EncodedJob;
}

function findModel(modelId: string): ModelInfo {
  const model = models.find((candidate) => candidate.id === modelId);
  if (!model) throw new Error(`Modelo desconocido: ${modelId}`);
  return model;
}

export class MockProvider implements GenerationProvider {
  readonly id = "mock";

  constructor(
    private readonly options: {
      /** Tiempo que el job pasa "procesando" antes de terminar. */
      latencyMs?: number;
      now?: () => number;
    } = {},
  ) {}

  private now() {
    return this.options.now?.() ?? Date.now();
  }

  async listModels(): Promise<ModelInfo[]> {
    return models;
  }

  async estimate(req: GenerationRequest): Promise<{ costUsd: number }> {
    const cost = costs[findModel(req.modelId).id] ?? {};
    if (cost.perSecond !== undefined) {
      return { costUsd: cost.perSecond * (req.durationSeconds ?? 0) };
    }
    return { costUsd: cost.perOutput ?? 0 };
  }

  async submit(req: GenerationRequest): Promise<{ providerJobId: string }> {
    findModel(req.modelId);
    return {
      providerJobId: encode({
        submittedAt: this.now(),
        outcome: req.prompt.includes(MOCK_FAILURE_MARKER) ? "fail" : "ok",
        modelId: req.modelId,
        aspectRatio: req.aspectRatio,
        durationSeconds: req.durationSeconds,
      }),
    };
  }

  async getStatus(providerJobId: string): Promise<JobStatus> {
    const job = decode(providerJobId);
    if (this.now() - job.submittedAt < (this.options.latencyMs ?? 0)) {
      return { state: "running" };
    }
    return job.outcome === "ok"
      ? { state: "succeeded" }
      : { state: "failed", error: "mock_failure" };
  }

  async fetchOutput(providerJobId: string): Promise<OutputFile[]> {
    const job = decode(providerJobId);
    const model = findModel(job.modelId);
    const ratio = job.aspectRatio.replace(":", "x");

    // Imagen de muestra en public/mock/. TODO(paso 5): un video de muestra real.
    return [
      {
        url: `/mock/preview-${ratio}.svg`,
        mediaType: model.mediaType,
        mimeType: "image/svg+xml",
        ...dimensions[job.aspectRatio],
        ...(model.mediaType === "video"
          ? { durationSeconds: job.durationSeconds }
          : {}),
      },
    ];
  }
}
