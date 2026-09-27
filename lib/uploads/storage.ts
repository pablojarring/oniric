// Almacenamiento de las fotos de producto. La interfaz permite probar el flujo
// sin Supabase y cambiar a otro almacenamiento (p. ej. Cloudflare R2) sin tocar
// el resto de la app.

export interface PhotoStorage {
  upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  remove(path: string): Promise<void>;
  /** URL temporal para que el proveedor descargue la foto. */
  createSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
}

/** Bucket privado de Supabase Storage (ver supabase/config.toml). */
export const PRODUCT_PHOTOS_BUCKET = "product-photos";

/**
 * Vigencia de la URL firmada que recibe el proveedor.
 *
 * TODO(fase 3): confirmar en la documentación de Higgsfield cuándo descarga la
 * imagen de entrada; si la encola, puede hacer falta más tiempo.
 */
export const INPUT_IMAGE_URL_TTL_SECONDS = 60 * 60;
