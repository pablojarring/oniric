import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { PRODUCT_PHOTOS_BUCKET, type PhotoStorage } from "./storage";

/** Fotos de producto en el bucket privado de Supabase Storage. */
export function getProductPhotoStorage(): PhotoStorage {
  const bucket = () => getSupabaseAdmin().storage.from(PRODUCT_PHOTOS_BUCKET);

  return {
    async upload(path, bytes, mimeType) {
      const { error } = await bucket().upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (error) throw new Error(`No se pudo subir ${path}`, { cause: error });
    },
    async remove(path) {
      const { error } = await bucket().remove([path]);
      if (error) throw new Error(`No se pudo borrar ${path}`, { cause: error });
    },
    async createSignedUrl(path, expiresInSeconds) {
      const { data, error } = await bucket().createSignedUrl(
        path,
        expiresInSeconds,
      );
      if (error) {
        throw new Error(`No se pudo firmar ${path}`, { cause: error });
      }
      return data.signedUrl;
    },
  };
}
