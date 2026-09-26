import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import type { Database } from "./types";

// En desarrollo, el recargado en caliente reevalúa este módulo; reutilizamos el
// cliente para no abrir un pool nuevo en cada cambio.
const globalForDb = globalThis as unknown as { db?: Database };

/**
 * Cliente de Drizzle de la aplicación. Se crea en el primer uso para que el
 * build no necesite `DATABASE_URL`.
 */
export function getDb(): Database {
  if (globalForDb.db) return globalForDb.db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida. Revisa .env.example.");
  }

  // `prepare: false` es necesario con el pooler de Supabase en modo transacción
  // (puerto 6543), que no soporta prepared statements.
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle({ client, schema, casing: "snake_case" });

  globalForDb.db = db;
  return db;
}
