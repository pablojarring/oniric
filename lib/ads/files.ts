import type { GenerationJob } from "@/db/schema";
import { outputTypes } from "@/lib/generation/outputs";
import type { StoredOutput } from "@/lib/generation/types";
import { OUTPUT_URL_TTL_SECONDS, type FileStorage } from "@/lib/storage";

/** Texto apto para un nombre de archivo: sin tildes, en minúsculas y con guiones. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Nombre del archivo descargado: `oniric-pan-de-yuca-9x16.webm`. */
export function adFileName(
  job: Pick<GenerationJob, "brief" | "templateId" | "request">,
  output: Pick<StoredOutput, "mimeType">,
  index: number,
  total: number,
): string {
  const name =
    slugify(job.brief?.productName ?? job.templateId ?? "") || "anuncio";
  const ratio = job.request.aspectRatio.replace(":", "x");
  const suffix = total > 1 ? `-${index + 1}` : "";
  const extension = outputTypes[output.mimeType] ?? "bin";
  return `oniric-${name}-${ratio}${suffix}.${extension}`;
}

export type SignedOutput = StoredOutput & {
  /** Para mostrarlo en la página. */
  url: string;
  /** Descarga el archivo con un nombre legible. */
  downloadUrl: string;
};

/** URLs firmadas de los resultados de un job, para verlos y descargarlos. */
export async function signOutputs(
  storage: FileStorage,
  job: Pick<GenerationJob, "brief" | "templateId" | "request" | "outputs">,
): Promise<SignedOutput[]> {
  const outputs = job.outputs ?? [];
  return Promise.all(
    outputs.map(async (output, index) => ({
      ...output,
      url: await storage.createSignedUrl(output.path, OUTPUT_URL_TTL_SECONDS),
      downloadUrl: await storage.createSignedUrl(
        output.path,
        OUTPUT_URL_TTL_SECONDS,
        { download: adFileName(job, output, index, outputs.length) },
      ),
    })),
  );
}

/** URL firmada del primer resultado de cada anuncio terminado, para la galería. */
export async function signThumbnails(
  storage: FileStorage,
  jobs: Pick<GenerationJob, "id" | "status" | "outputs">[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    jobs.map(async (job) => {
      const first = job.status === "succeeded" ? job.outputs?.[0] : undefined;
      if (!first) return null;
      const url = await storage.createSignedUrl(
        first.path,
        OUTPUT_URL_TTL_SECONDS,
      );
      return [job.id, url] as const;
    }),
  );
  return new Map(entries.filter((entry) => entry !== null));
}
