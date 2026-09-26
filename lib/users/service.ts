import { eq, sql } from "drizzle-orm";

import { users, type User } from "@/db/schema";
import type { Database } from "@/db/types";
import type { Locale } from "@/i18n/config";

/**
 * Crea el perfil del usuario la primera vez que entra, o sincroniza su correo.
 * El idioma solo se usa al crear el perfil; después se cambia con
 * `updateUserLocale`.
 */
export async function ensureUser(
  db: Database,
  input: { id: string; email: string; locale: Locale },
): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.id,
      set: { email: sql`excluded.email` },
    })
    .returning();

  if (!user) throw new Error("No se pudo crear el perfil del usuario.");
  return user;
}

export async function updateUserLocale(
  db: Database,
  userId: string,
  locale: Locale,
): Promise<void> {
  await db.update(users).set({ locale }).where(eq(users.id, userId));
}
