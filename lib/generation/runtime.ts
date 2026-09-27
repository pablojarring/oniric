import "server-only";

import { getProviderById } from "@/lib/providers";
import { buckets } from "@/lib/storage";
import { getStorage } from "@/lib/storage/supabase";

import type { SyncDeps } from "./service";

/** Dependencias reales de la sincronización de jobs. */
export function getSyncDeps(): SyncDeps {
  return {
    resolveProvider: getProviderById,
    outputs: getStorage(buckets.adOutputs),
  };
}
