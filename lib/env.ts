// Acceso tipado a las variables de entorno. Ver .env.example.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} no está definida. Revisa .env.example.`);
  }
  return value;
}

export function getSupabaseEnv() {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

/** URL pública de la aplicación, sin barra final. */
export function getSiteUrl(): string {
  return required(
    "NEXT_PUBLIC_SITE_URL",
    process.env.NEXT_PUBLIC_SITE_URL,
  ).replace(/\/+$/, "");
}

/** El botón de Google solo se muestra cuando el proveedor está configurado en Supabase. */
export function isGoogleAuthEnabled(): boolean {
  return process.env.AUTH_GOOGLE_ENABLED === "true";
}

/**
 * Clave secreta de Supabase (sb_secret_...). Solo en el servidor: da acceso
 * total al proyecto, sin RLS. Se usa para Storage.
 */
export function getSupabaseSecretKey(): string {
  return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
}
