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

Créditos y generaciones (detalle en [creditos.md](./creditos.md)):

| Tabla                 | Qué guarda                                                         |
| --------------------- | ------------------------------------------------------------------ |
| `credit_wallets`      | Billetera de cada organización (su fila serializa movimientos).    |
| `credit_lots`         | Cada acreditación, con lo que queda y su vencimiento.              |
| `credit_transactions` | Ledger inmutable de todos los movimientos.                         |
| `credit_allocations`  | De qué lotes salieron los créditos reservados de cada job.         |
| `model_pricing`       | Margen y precio mínimo por proveedor, modelo y segmento.           |
| `generation_jobs`     | Cada generación: estado, proveedor, costo, precio, outputs, error. |

Los anuncios del asistente pyme guardan además en `generation_jobs` la
plantilla (`template_id`), lo que completó el cliente (`brief`) y la ruta de la
foto del producto (`input_image_path`). Ver [asistente.md](./asistente.md).

## Storage

Las fotos de producto van al bucket privado `product-photos` de Supabase
Storage (definido en `supabase/config.toml`, con el mismo límite de 8 MB y los
mismos tipos que valida la app). Sin políticas: solo la app accede, desde el
servidor y con la clave secreta. `pnpm supabase:start` y `pnpm db:reset` crean
los buckets en local.

TODO(fase 3): crear el bucket en el proyecto remoto como parte del despliegue.

Borrar un usuario en Supabase Auth borra su perfil y sus membresías (cascada).
Las organizaciones con movimientos de créditos no se pueden borrar: el ledger es
inmutable y es registro contable.

## Tests

Los servicios (`lib/*/service.ts`) reciben la base por parámetro (tipo
`Database` de `db/types.ts`). Los tests unitarios usan `test/db.ts`, que levanta
un Postgres en memoria con [PGlite](https://pglite.dev) y aplica las
migraciones reales. No necesitan Docker ni Supabase.
