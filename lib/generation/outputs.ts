import type { FileStorage } from "@/lib/storage";
import type { OutputFile } from "@/lib/providers/generation-provider";

import type { StoredOutput } from "./types";

// Copia de los resultados del proveedor a nuestro almacenamiento antes de
// cobrar (CLAUDE.md §3.2, paso 6).

/**
 * Tamaño máximo de un resultado; el bucket `ad-outputs` tiene el mismo límite.
 * Es el máximo de subida del plan Free de Supabase (50 MB).
 *
 * TODO(producto): subir a 100 MiB si se pasa a Supabase Pro (también en
 * supabase/config.toml y en el bucket remoto).
 */
export const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;

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
 * El resultado nunca se va a poder guardar (tipo no soportado o demasiado
 * grande): reintentar no sirve, así que la generación se da por fallida.
 */
export class OutputRejectedError extends OutputStorageError {
  constructor(readonly reason: "unsupported_output" | "output_too_large") {
    super(
      reason === "output_too_large"
        ? "El resultado supera el tamaño máximo."
        : "Tipo de resultado no soportado.",
    );
  }
}

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
  for (const [index, { url, ...declared }] of outputs.entries()) {
    // Un tipo declarado no soportado se rechaza sin descargar nada.
    if (!outputTypes[declared.mimeType]) {
      throw new OutputRejectedError("unsupported_output");
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
      throw new OutputRejectedError("output_too_large");
    }
    // El tipo que declara la descarga manda si es uno soportado del mismo
    // medio (Higgsfield no informa el tipo en la consulta de estado).
    const output = {
      ...declared,
      mimeType: servedType(response, declared.mediaType) ?? declared.mimeType,
    };
    const extension = outputTypes[output.mimeType];
    if (!extension) throw new OutputRejectedError("unsupported_output");

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_OUTPUT_BYTES) {
      throw new OutputRejectedError("output_too_large");
    }

    const path = `${job.organizationId}/${job.id}/${index}.${extension}`;
    await storage.upload(path, bytes, output.mimeType, { upsert: true });
    stored.push({ ...output, path, size: bytes.length });
  }
  return stored;
}

function servedType(response: Response, mediaType: string): string | null {
  const type = response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  return type && outputTypes[type] && type.startsWith(`${mediaType}/`)
    ? type
    : null;
}
