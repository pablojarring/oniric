import { existsSync } from "node:fs";

// Los tests de integración usan la base de .env.local (Supabase local). Con
// NODE_ENV=test, @next/env no carga .env.local, así que se lee directamente.
// En CI las variables ya vienen del entorno.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
