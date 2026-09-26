import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

/**
 * Cualquier cliente de Drizzle con este esquema: el de la aplicación
 * (postgres.js) o el de los tests (PGlite). Los servicios lo reciben por
 * parámetro para poder probarlos sin Supabase.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
