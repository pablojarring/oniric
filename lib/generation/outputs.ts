import type { FileStorage } from "@/lib/storage";
import type { OutputFile } from "@/lib/providers/generation-provider";

import type { StoredOutput } from "./types";

// Copia de los resultados del proveedor a nuestro almacenamiento antes de
// cobrar (CLAUDE.md §3.2, paso 6).

/** Tamaño máximo de un resultado; el bucket `ad-outputs` tiene el mismo límite. */
export const MAX_OUTPUT_BYTES = 100 * 1024 * 1024;

const DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000;

/** Tipos aceptados y su extensión. SVG solo lo produce el MockProvider. */
export const outputTypes: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export class OutputStorageError extends Error {}

/**
 * Descarga cada resultado y lo sube al almacenamiento propio, en una ruta fija
 * por job. Si dos sincronizaciones lo hacen a la vez, la segunda reemplaza el
 * mismo archivo con el mismo contenido.
 */
export async function storeOutputs(
  storage: FileStorage,
  job: { id: string; organizationId: string },
  outputs: OutputFile[],
  fetchFile: typeof fetch = fetch,
): Promise<StoredOutput[]> {
  const stored: StoredOutput[] = [];
  for (const [index, { url, ...output }] of outputs.entries()) {
    const extension = outputTypes[output.mimeType];
    if (!extension) {
      throw new OutputStorageError(`Tipo no soportado: ${output.mimeType}`);
    }

    const response = await fetchFile(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new OutputStorageError(
        `El proveedor respondió ${response.status} al descargar un resultado.`,
      );
    }
    if (
      Number(response.headers.get("content-length") ?? 0) > MAX_OUTPUT_BYTES
    ) {
      throw new OutputStorageError("El resultado supera el tamaño máximo.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_OUTPUT_BYTES) {
      throw new OutputStorageError("El resultado supera el tamaño máximo.");
    }

    const path = `${job.organizationId}/${job.id}/${index}.${extension}`;
    await storage.upload(path, bytes, output.mimeType, { upsert: true });
    stored.push({ ...output, path, size: bytes.length });
  }
  return stored;
}
