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

Para aplicar las migraciones a un proyecto remoto, primero revisa qué se va a
aplicar y después aplícalo:

```bash
pnpm exec supabase db push --dry-run --db-url "$DATABASE_URL_DIRECT"
pnpm exec supabase db push --db-url "$DATABASE_URL_DIRECT"
pnpm exec supabase migration list --db-url "$DATABASE_URL_DIRECT"
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

| Tabla           | Qué guarda                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `users`         | Perfil de cada usuario de Supabase Auth (mismo `id`), idioma preferido y si es admin de la plataforma. |
| `organizations` | Negocio del onboarding: segmento, país, industria, equipo y usos.                                      |
| `memberships`   | Usuario ↔ organización con rol (`admin`, `editor`, `revisor`).                                         |

Créditos y generaciones (detalle en [creditos.md](./creditos.md)):

| Tabla                 | Qué guarda                                                                           |
| --------------------- | ------------------------------------------------------------------------------------ |
| `credit_wallets`      | Billetera de cada organización (su fila serializa movimientos).                      |
| `credit_lots`         | Cada acreditación, con lo que queda y su vencimiento.                                |
| `credit_transactions` | Ledger inmutable de todos los movimientos.                                           |
| `credit_allocations`  | De qué lotes salieron los créditos reservados de cada job.                           |
| `model_pricing`       | Margen y precio mínimo por proveedor, modelo y segmento, con el admin que lo cambió. |
| `generation_jobs`     | Cada generación: estado, proveedor, costo, precio, outputs, error.                   |

Los anuncios del asistente pyme guardan además en `generation_jobs` la
plantilla (`template_id`), lo que completó el cliente (`brief`) y la ruta de la
foto del producto (`input_image_path`). Ver [asistente.md](./asistente.md).

## Storage

Dos buckets privados de Supabase Storage, definidos en `supabase/config.toml`:

| Bucket           | Qué guarda                                              | Límite |
| ---------------- | ------------------------------------------------------- | ------ |
| `product-photos` | Fotos de producto del asistente (PNG, JPEG, WebP).      | 8 MB   |
| `ad-outputs`     | Resultados de las generaciones, copiados del proveedor. | 50 MB  |

Sin políticas: solo la app accede, desde el servidor y con la clave secreta
(`lib/storage`), y entrega URLs firmadas de corta duración. `pnpm
supabase:start` y `pnpm db:reset` crean los buckets en local.

En un proyecto remoto se crean con la CLI enlazada al proyecto:

```bash
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase seed buckets --linked
```

El límite de `ad-outputs` (50 MB) es el máximo de subida del plan Free de
Supabase; con un valor mayor, `seed buckets` falla con `413 EntityTooLarge`.

TODO(producto): subir `ad-outputs` a 100 MB si se pasa a Supabase Pro.

Borrar un usuario en Supabase Auth borra su perfil y sus membresías (cascada).
Las organizaciones con movimientos de créditos no se pueden borrar: el ledger es
inmutable y es registro contable.

## Tests

Los servicios (`lib/*/service.ts`) reciben la base por parámetro (tipo
`Database` de `db/types.ts`). Los tests unitarios usan `test/db.ts`, que levanta
un Postgres en memoria con [PGlite](https://pglite.dev) y aplica las
migraciones reales. No necesitan Docker ni Supabase.
