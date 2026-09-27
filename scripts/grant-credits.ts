// Acredita créditos de prueba a la organización de un usuario, solo contra el
// Supabase local. Queda registrado en el ledger como cualquier acreditación.
//
//   pnpm credits:grant <email> <créditos>
//
// Para acreditar pagos reales está el panel de admin (/admin, ver
// docs/admin.md); este script queda para desarrollo y tests.

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { getBalance, grantCredits } from "@/lib/billing/wallet";

loadEnvConfig(process.cwd());

async function main() {
  const [email, amount] = process.argv.slice(2);
  const credits = Number(amount);
  if (!email || !Number.isInteger(credits) || credits <= 0) {
    throw new Error("Uso: pnpm credits:grant <email> <créditos>");
  }

  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("Este script solo corre contra el Supabase local.");
  }

  const client = postgres(url.toString(), { max: 1 });
  const db = drizzle({ client, schema, casing: "snake_case" });
  try {
    const [row] = await db
      .select({ organizationId: schema.memberships.organizationId })
      .from(schema.users)
      .innerJoin(
        schema.memberships,
        eq(schema.memberships.userId, schema.users.id),
      )
      .where(eq(schema.users.email, email.toLowerCase()));
    if (!row) {
      throw new Error(`${email} no existe o no completó el onboarding.`);
    }

    await grantCredits(db, {
      organizationId: row.organizationId,
      credits,
      note: "Acreditación de desarrollo (scripts/grant-credits.ts)",
    });
    const balance = await getBalance(db, row.organizationId);
    console.log(`Listo: ${email} tiene ${balance.available} créditos.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
