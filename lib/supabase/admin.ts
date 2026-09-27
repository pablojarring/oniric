import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv, getSupabaseSecretKey } from "@/lib/env";

let adminClient: SupabaseClient | undefined;

/**
 * Cliente de Supabase con la clave secreta, sin sesión de usuario. Solo para el
 * servidor y para operaciones que la app ya autorizó (p. ej. Storage).
 */
export function getSupabaseAdmin(): SupabaseClient {
  adminClient ??= createClient(getSupabaseEnv().url, getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}
