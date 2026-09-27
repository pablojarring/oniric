import type { FileStorage } from "@/lib/storage";

/** Almacenamiento en memoria para tests: guarda los archivos en un Map. */
export function createMemoryStorage() {
  const files = new Map<string, { bytes: Uint8Array; mimeType: string }>();
  const storage: FileStorage = {
    async upload(path, bytes, mimeType, options) {
      if (files.has(path) && !options?.upsert) {
        throw new Error(`${path} ya existe`);
      }
      files.set(path, { bytes, mimeType });
    },
    async remove(path) {
      files.delete(path);
    },
    async createSignedUrl(path, expiresInSeconds, options) {
      const download = options?.download ? `&download=${options.download}` : "";
      return `https://storage.test/${path}?ttl=${expiresInSeconds}${download}`;
    },
  };
  return { storage, files };
}
