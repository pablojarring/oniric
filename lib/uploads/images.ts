// Validación de las fotos de producto que sube el cliente. El tipo se detecta
// por los primeros bytes del archivo, no por la extensión ni por el tipo que
// declara el navegador. El bucket `product-photos` de supabase/config.toml
// tiene el mismo límite y los mismos tipos.

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const imageTypes = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type ImageMimeType = keyof typeof imageTypes;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** Tipo de imagen según su firma de bytes, o null si no es PNG, JPEG ni WebP. */
export function sniffImageType(bytes: Uint8Array): ImageMimeType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // RIFF....WEBP
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

export type ImageValidation =
  | { ok: true; bytes: Uint8Array; mimeType: ImageMimeType; extension: string }
  | { ok: false; error: "tooLarge" | "unsupportedType" };

export async function validateImage(file: Blob): Promise<ImageValidation> {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "tooLarge" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return { ok: false, error: "unsupportedType" };
  return { ok: true, bytes, mimeType, extension: imageTypes[mimeType] };
}
