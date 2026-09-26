import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está definida. Revisa .env.example.");
}

// En desarrollo, el recargado en caliente reevalúa este módulo; reutilizamos el
// cliente para no abrir un pool nuevo en cada cambio.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

// `prepare: false` es necesario con el pooler de Supabase en modo transacción
// (puerto 6543), que no soporta prepared statements.
const client =
  globalForDb.pgClient ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle({ client, schema, casing: "snake_case" });
