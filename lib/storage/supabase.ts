import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { Bucket, FileStorage } from ".";

/**
 * Bucket privado de Supabase Storage. La app sube y firma con la clave
 * secreta, siempre desde el servidor y después de autorizar al usuario.
 */
export function getStorage(bucket: Bucket): FileStorage {
  const from = () => getSupabaseAdmin().storage.from(bucket);

  return {
    async upload(path, bytes, mimeType, options) {
      const { error } = await from().upload(path, bytes, {
        contentType: mimeType,
        upsert: options?.upsert ?? false,
      });
      if (error) throw new Error(`No se pudo subir ${path}`, { cause: error });
    },
    async remove(path) {
      const { error } = await from().remove([path]);
      if (error) throw new Error(`No se pudo borrar ${path}`, { cause: error });
    },
    async createSignedUrl(path, expiresInSeconds, options) {
      const { data, error } = await from().createSignedUrl(
        path,
        expiresInSeconds,
        options?.download ? { download: options.download } : undefined,
      );
      if (error) {
        throw new Error(`No se pudo firmar ${path}`, { cause: error });
      }
      return data.signedUrl;
    },
  };
}
