// Almacenamiento de archivos propio (CLAUDE.md §2). La interfaz permite probar
// los flujos sin Supabase y cambiar a otro almacenamiento (p. ej. Cloudflare
// R2) sin tocar el resto de la app.

export interface FileStorage {
  /** Con `upsert`, reemplaza el archivo si ya existe. */
  upload(
    path: string,
    bytes: Uint8Array,
    mimeType: string,
    options?: { upsert?: boolean },
  ): Promise<void>;
  remove(path: string): Promise<void>;
  /**
   * URL temporal de lectura. Con `download`, el navegador descarga el archivo
   * con ese nombre en vez de mostrarlo.
   */
  createSignedUrl(
    path: string,
    expiresInSeconds: number,
    options?: { download?: string },
  ): Promise<string>;
}

/** Buckets privados de Supabase Storage (ver supabase/config.toml). */
export const buckets = {
  /** Fotos de producto que sube el cliente en el asistente. */
  productPhotos: "product-photos",
  /** Resultados de las generaciones, copiados desde el proveedor. */
  adOutputs: "ad-outputs",
} as const;

export type Bucket = (typeof buckets)[keyof typeof buckets];

/**
 * Vigencia de la URL firmada que recibe el proveedor para la foto del producto.
 *
 * TODO(fase 3): confirmar en la documentación de Higgsfield cuándo descarga la
 * imagen de entrada; si la encola, puede hacer falta más tiempo.
 */
export const INPUT_IMAGE_URL_TTL_SECONDS = 60 * 60;

/** Vigencia de las URLs firmadas para ver o descargar un resultado. */
export const OUTPUT_URL_TTL_SECONDS = 60 * 60;
