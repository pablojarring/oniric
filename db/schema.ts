// Esquema de Drizzle. Las propiedades en camelCase se guardan como columnas en
// snake_case (opción `casing` en db/index.ts y drizzle.config.ts).
//
// Todas las tablas tienen RLS activado y sin políticas: la API pública de
// Supabase (PostgREST) no puede leerlas ni escribirlas. La aplicación accede
// solo desde el servidor, con Drizzle y la conexión directa a Postgres.
//
// Este archivo no usa el alias `@/` porque drizzle-kit lo carga por su cuenta.

import { sql } from "drizzle-orm";
import {
  char,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

import type { Locale } from "../i18n/config";
import type {
  Country,
  Industry,
  TeamSize,
  TeamType,
  VideoPurpose,
} from "../lib/onboarding/options";

export const segmentEnum = pgEnum("segment", ["pyme", "empresa"]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "admin",
  "editor",
  "revisor",
]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Perfil de la aplicación para cada usuario de Supabase Auth. */
export const users = pgTable("users", {
  id: uuid()
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text().notNull(),
  /** Idioma preferido de la interfaz (ver i18n/config.ts). */
  locale: text().$type<Locale>().notNull().default("es"),
  ...timestamps,
}).enableRLS();

export const organizations = pgTable("organizations", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  segment: segmentEnum().notNull(),
  country: char({ length: 2 }).$type<Country>().notNull(),
  industry: text().$type<Industry>().notNull(),
  teamSize: text().$type<TeamSize>().notNull(),
  teamType: text().$type<TeamType>().notNull(),
  videoPurposes: text()
    .array()
    .$type<VideoPurpose[]>()
    .notNull()
    .default(sql`'{}'::text[]`),
  ...timestamps,
}).enableRLS();

export const memberships = pgTable(
  "memberships",
  {
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum().notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index().on(table.userId),
  ],
).enableRLS();

export type Segment = (typeof segmentEnum.enumValues)[number];
export type MembershipRole = (typeof membershipRoleEnum.enumValues)[number];
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
