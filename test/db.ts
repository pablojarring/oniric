import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "@/db/schema";
import type { Database } from "@/db/types";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

/**
 * Postgres en memoria (PGlite) con las migraciones reales aplicadas, para
 * probar servicios sin levantar Supabase.
 */
export async function createTestDatabase() {
  const client = new PGlite();

  // Stub mínimo del esquema `auth` que en producción gestiona Supabase.
  await client.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text);
  `);

  const migrations = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    await client.exec(readFileSync(path.join(migrationsDir, file), "utf8"));
  }

  const db: Database = drizzle({ client, schema, casing: "snake_case" });

  return {
    db,
    close: () => client.close(),
    /** Vacía las tablas entre tests (más rápido que crear otra base). */
    async reset() {
      await client.exec(`
        truncate
          auth.users,
          public.users,
          public.organizations,
          public.memberships,
          public.credit_wallets,
          public.credit_lots,
          public.credit_transactions,
          public.credit_allocations,
          public.generation_jobs,
          public.model_pricing
        cascade;
      `);
    },
    /** Simula un usuario registrado en Supabase Auth. */
    async createAuthUser(email = `${randomUUID()}@test.local`) {
      const id = randomUUID();
      await client.query("insert into auth.users (id, email) values ($1, $2)", [
        id,
        email,
      ]);
      return { id, email };
    },
  };
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;
