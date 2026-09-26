import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Carga .env / .env.local con las mismas reglas que Next.js.
loadEnvConfig(process.cwd());

// drizzle-kit solo la usa para `db:studio` y comandos de introspección. Las
// migraciones las aplica la CLI de Supabase (ver docs/base-de-datos.md).
const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  // Formato de migraciones de la CLI de Supabase (`<timestamp>_<nombre>.sql`).
  out: "./supabase/migrations",
  migrations: { prefix: "supabase" },
  // El esquema `auth` y los demás internos los gestiona Supabase.
  schemaFilter: ["public"],
  casing: "snake_case",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
