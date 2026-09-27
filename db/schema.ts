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
  bigint,
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

import type { Locale } from "../i18n/config";
import type { AdBrief } from "../lib/ads/types";
import type { StoredOutput } from "../lib/generation/types";
import type {
  Country,
  Industry,
  TeamSize,
  TeamType,
  VideoPurpose,
} from "../lib/onboarding/options";
import type { GenerationRequest } from "../lib/providers/generation-provider";

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

// --- Créditos y generaciones (CLAUDE.md §3.2 y §5) ------------------------
//
// Montos en enteros: créditos, micro-dólares (1 USD = 1.000.000) y puntos
// básicos (10.000 = 100 %). Ver docs/creditos.md.

export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "grant",
  "reserve",
  "settle",
  "refund",
  "expire",
]);

/** Billetera de créditos de cada organización; su fila serializa los movimientos. */
export const creditWallets = pgTable("credit_wallets", {
  organizationId: uuid()
    .primaryKey()
    .references(() => organizations.id, { onDelete: "restrict" }),
  createdAt: timestamps.createdAt,
}).enableRLS();

/**
 * Cada acreditación es un lote con su propio vencimiento. Se consume primero
 * lo que vence antes.
 */
export const creditLots = pgTable(
  "credit_lots",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => creditWallets.organizationId, { onDelete: "restrict" }),
    grantedCredits: integer().notNull(),
    remainingCredits: integer().notNull(),
    /** `null`: no vence. */
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    check("credit_lots_granted_positive", sql`${table.grantedCredits} > 0`),
    check(
      "credit_lots_remaining_in_range",
      sql`${table.remainingCredits} between 0 and ${table.grantedCredits}`,
    ),
    index().on(table.organizationId, table.expiresAt),
  ],
).enableRLS();

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
    status: generationStatusEnum().notNull().default("pending"),
    /** Proveedor que procesa el job (`GenerationProvider.id`). */
    provider: text().notNull(),
    /** Se completa al enviar el job al proveedor. */
    providerJobId: text(),
    modelId: text().notNull(),
    request: jsonb().$type<GenerationRequest>().notNull(),
    /** Costo estimado del proveedor, sin recargos. */
    costMicroUsd: bigint({ mode: "number" }).notNull(),
    /** ISD y comisiones aplicados al costo. */
    surchargeBps: integer().notNull(),
    marginBps: integer().notNull(),
    /** Precio reservado y cobrado al cliente; no cambia después del envío. */
    priceCredits: integer().notNull(),
    /** Resultados copiados al bucket `ad-outputs`. */
    outputs: jsonb().$type<StoredOutput[]>(),
    error: text(),
    completedAt: timestamp({ withTimezone: true }),
    /** Plantilla del asistente pyme (`lib/templates`); null en el workspace. */
    templateId: text(),
    /** Lo que el cliente completó en el asistente. */
    brief: jsonb().$type<AdBrief>(),
    /** Foto del producto en el bucket `product-photos` de Supabase Storage. */
    inputImagePath: text(),
    /**
     * Token del enlace público (`/s/<token>`). Null si el anuncio no se
     * comparte; al desactivar el enlace se borra y el anterior deja de servir.
     */
    shareToken: text(),
    sharedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check("generation_jobs_price_positive", sql`${table.priceCredits} > 0`),
    uniqueIndex().on(table.shareToken),
    uniqueIndex().on(table.provider, table.providerJobId),
    index().on(table.status, table.createdAt),
    index().on(table.organizationId, table.createdAt),
  ],
).enableRLS();

/**
 * Ledger inmutable de créditos (CLAUDE.md §5). Un trigger impide modificar o
 * borrar filas. El saldo disponible es la suma de `availableDelta` y el
 * reservado la de `heldDelta`.
 */
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => creditWallets.organizationId, { onDelete: "restrict" }),
    type: creditTransactionTypeEnum().notNull(),
    availableDelta: integer().notNull(),
    heldDelta: integer().notNull(),
    jobId: uuid().references(() => generationJobs.id, { onDelete: "restrict" }),
    lotId: uuid().references(() => creditLots.id, { onDelete: "restrict" }),
    /** Motivo legible, p. ej. de una acreditación manual. */
    note: text(),
    /** Persona que hizo el movimiento. Sin FK: el ledger nunca se actualiza. */
    actorUserId: uuid(),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    // Cada job se reserva una vez y se cierra (cobro o reembolso) una vez.
    uniqueIndex("credit_transactions_one_reserve_per_job")
      .on(table.jobId)
      .where(sql`${table.type} = 'reserve'`),
    uniqueIndex("credit_transactions_one_close_per_job")
      .on(table.jobId)
      .where(sql`${table.type} in ('settle', 'refund')`),
    check(
      "credit_transactions_reference",
      sql`(${table.type} in ('grant', 'expire') and ${table.lotId} is not null)
        or (${table.type} in ('reserve', 'settle', 'refund') and ${table.jobId} is not null)`,
    ),
    index().on(table.organizationId, table.createdAt),
  ],
).enableRLS();

/** De qué lotes salieron los créditos reservados para cada job. */
export const creditAllocations = pgTable(
  "credit_allocations",
  {
    jobId: uuid()
      .notNull()
      .references(() => generationJobs.id, { onDelete: "restrict" }),
    lotId: uuid()
      .notNull()
      .references(() => creditLots.id, { onDelete: "restrict" }),
    credits: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.jobId, table.lotId] }),
    check("credit_allocations_credits_positive", sql`${table.credits} > 0`),
  ],
).enableRLS();

/**
 * Margen por modelo y segmento (CLAUDE.md §5). Sin fila se usan los valores
 * por defecto de lib/billing/config.ts. Se edita desde el panel de admin
 * (paso 6), nunca desde la UI de cliente.
 */
export const modelPricing = pgTable(
  "model_pricing",
  {
    provider: text().notNull(),
    modelId: text().notNull(),
    segment: segmentEnum().notNull(),
    /** Margen sobre el precio de venta, en puntos básicos (2500 = 25 %). */
    marginBps: integer().notNull(),
    minPriceCredits: integer().notNull(),
    updatedAt: timestamps.updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.modelId, table.segment] }),
    // Menor al 100 %: el precio es costo ÷ (1 − margen).
    check(
      "model_pricing_margin_range",
      sql`${table.marginBps} between 0 and 9999`,
    ),
    check(
      "model_pricing_min_price_positive",
      sql`${table.minPriceCredits} >= 1`,
    ),
  ],
).enableRLS();

export type Segment = (typeof segmentEnum.enumValues)[number];
export type MembershipRole = (typeof membershipRoleEnum.enumValues)[number];
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type GenerationStatus = (typeof generationStatusEnum.enumValues)[number];
export type GenerationJob = typeof generationJobs.$inferSelect;
export type CreditLot = typeof creditLots.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type ModelPricing = typeof modelPricing.$inferSelect;
