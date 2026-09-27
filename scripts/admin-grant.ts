// Da o quita el acceso al panel de admin a un usuario ya registrado.
//
//   pnpm admin:grant <email>            da acceso
//   pnpm admin:grant <email> --revoke   lo quita
//
// Usa DATABASE_URL_DIRECT (o DATABASE_URL). Contra producción, corre con la
// conexión de producción a propósito; el script muestra a qué base se conecta.

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

loadEnvConfig(process.cwd());

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("--"));
  const revoke = args.includes("--revoke");
  if (!email) throw new Error("Uso: pnpm admin:grant <email> [--revoke]");

  const url = new URL(
    process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || "",
  );
  console.log(`Base de datos: ${url.hostname}:${url.port}`);

  const client = postgres(url.toString(), { max: 1, prepare: false });
  const db = drizzle({ client, schema, casing: "snake_case" });
  try {
    const [user] = await db
      .update(schema.users)
      .set({ isPlatformAdmin: !revoke })
      .where(eq(schema.users.email, email.toLowerCase()))
      .returning({ email: schema.users.email });
    if (!user) {
      throw new Error(
        `${email} no existe. Debe registrarse e iniciar sesión antes.`,
      );
    }
    console.log(
      revoke
        ? `Listo: ${user.email} ya no es admin.`
        : `Listo: ${user.email} es admin de la plataforma.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
