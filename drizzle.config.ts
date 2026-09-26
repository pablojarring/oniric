import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Carga .env / .env.local con las mismas reglas que Next.js.
loadEnvConfig(process.cwd());

// Las migraciones necesitan una conexión directa o el pooler en modo sesión;
// si no se define, se usa la misma URL de la aplicación.
const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  casing: "snake_case",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
