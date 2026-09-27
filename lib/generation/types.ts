import type { OutputFile } from "../providers/generation-provider";

/**
 * Resultado de una generación ya copiado a nuestro almacenamiento (bucket
 * `ad-outputs`). Se guarda en `generation_jobs.outputs`; la URL del proveedor
 * no se guarda porque vence (Higgsfield borra los archivos a los ~7 días).
 */
export type StoredOutput = Omit<OutputFile, "url"> & {
  /** Ruta dentro del bucket: `<organización>/<job>/<n>.<ext>`. */
  path: string;
  /** Tamaño en bytes. */
  size: number;
};
