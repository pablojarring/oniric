// Interfaz de los proveedores de generación (CLAUDE.md §3.1). La UI y el
// billing solo dependen de esta interfaz; agregar otro proveedor (Higgsfield,
// Fal, Replicate...) no debe tocar ninguno de los dos.

export type MediaType = "video" | "image";

/** Formatos por red social (CLAUDE.md §4). */
export const aspectRatios = ["9:16", "1:1", "16:9"] as const;
export type AspectRatio = (typeof aspectRatios)[number];

export interface ModelInfo {
  id: string;
  name: string;
  mediaType: MediaType;
  aspectRatios: readonly AspectRatio[];
  /** Duraciones permitidas en segundos (solo video). */
  durationsSeconds?: readonly number[];
}

export interface GenerationRequest {
  modelId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  /** Obligatoria para video, ignorada en imágenes. */
  durationSeconds?: number;
  /** Foto del producto, si la hay. */
  inputImageUrl?: string;
}

export type JobStatus =
  | { state: "pending" | "running" }
  | { state: "succeeded" }
  | { state: "failed"; error: string };

export interface OutputFile {
  url: string;
  mediaType: MediaType;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface GenerationProvider {
  /** Identificador que se guarda en cada job (`generation_jobs.provider`). */
  readonly id: string;
  listModels(): Promise<ModelInfo[]>;
  estimate(req: GenerationRequest): Promise<{ costUsd: number }>;
  submit(req: GenerationRequest): Promise<{ providerJobId: string }>;
  getStatus(providerJobId: string): Promise<JobStatus>;
  fetchOutput(providerJobId: string): Promise<OutputFile[]>;
}
