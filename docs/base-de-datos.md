# Base de datos

PostgreSQL de Supabase, con [Drizzle ORM](https://orm.drizzle.team) para el
acceso desde la aplicación.

## Esquema y migraciones

- El esquema vive en `db/schema.ts`. Las propiedades en camelCase se guardan
  como columnas en snake_case.
- drizzle-kit genera las migraciones SQL en `supabase/migrations/` con el
  formato de la CLI de Supabase (`<timestamp>_<nombre>.sql`).
- La CLI de Supabase las aplica. Así hay un solo historial de migraciones, y
  `supabase start` y `supabase db reset` dejan la base lista.

Para cambiar el esquema:

1. Edita `db/schema.ts`.
2. `pnpm db:generate` crea la migración. Revisa el SQL antes de subirlo.
3. `pnpm db:migrate` la aplica al Supabase local (o `pnpm db:reset` para
   recrear la base desde cero).

CI falla si `db/schema.ts` cambió y la migración no se generó.

Para aplicar las migraciones a un proyecto remoto:

```bash
pnpm exec supabase db push --db-url "$DATABASE_URL_DIRECT"
```

TODO(fase 3): automatizar las migraciones de producción en el despliegue.

## Seguridad: RLS sin políticas

Supabase expone el esquema `public` por su API REST (PostgREST) a cualquiera
que tenga la clave publicable, que es pública. Por eso todas las tablas tienen
Row Level Security activado **y ninguna política**:

- Desde la API pública, las lecturas devuelven vacío y las escrituras fallan.
- La aplicación accede desde el servidor con Drizzle y la conexión directa a
  Postgres (rol dueño de las tablas), que no pasa por RLS.

Toda tabla nueva debe llevar `.enableRLS()` en `db/schema.ts`. Si algún día el
cliente necesita leer datos directamente desde Supabase, se agregan políticas
explícitas en ese momento.

## Tablas

| Tabla           | Qué guarda                                                               |
| --------------- | ------------------------------------------------------------------------ |
| `users`         | Perfil de cada usuario de Supabase Auth (mismo `id`) e idioma preferido. |
| `organizations` | Negocio del onboarding: segmento, país, industria, equipo y usos.        |
| `memberships`   | Usuario ↔ organización con rol (`admin`, `editor`, `revisor`).           |

Borrar un usuario en Supabase Auth borra su perfil y sus membresías (cascada).

## Tests

Los servicios (`lib/*/service.ts`) reciben la base por parámetro (tipo
`Database` de `db/types.ts`). Los tests unitarios usan `test/db.ts`, que levanta
un Postgres en memoria con [PGlite](https://pglite.dev) y aplica las
migraciones reales. No necesitan Docker ni Supabase.
