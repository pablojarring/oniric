# Oniric

Plataforma SaaS para que empresas de Latinoamérica creen videos e imágenes
publicitarias con IA. El contexto completo del producto, la arquitectura y el
roadmap está en [CLAUDE.md](./CLAUDE.md).

> Estado: Fase 1, paso 4 — plantillas pyme y asistente de 3 pasos.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript estricto
- [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com): PostgreSQL, Auth (email + Google) y Storage
- [Drizzle ORM](https://orm.drizzle.team) para el acceso a datos
- [next-intl](https://next-intl.dev) para textos (`es` por defecto, `pt` activo)
- [Vitest](https://vitest.dev) + PGlite (unit) y [Playwright](https://playwright.dev) (e2e)
- ESLint + Prettier, CI en GitHub Actions

## Requisitos

- Node.js 22.12 o superior (ver `.nvmrc`)
- pnpm 10 (`corepack enable` usa la versión fijada en `package.json`)
- Docker, para correr Supabase en local

## Puesta en marcha

```bash
pnpm install
pnpm supabase:start          # Postgres, Auth, Storage y Mailpit en Docker; aplica las migraciones
cp .env.example .env.local   # los valores por defecto sirven para el Supabase local
pnpm dev                     # http://localhost:3000
```

`pnpm supabase:start` imprime las URLs y claves locales. Copia `SECRET_KEY` en
`SUPABASE_SECRET_KEY` de `.env.local`: la app la usa para las fotos de producto
y los tests e2e para crear usuarios. Los correos de confirmación y de
recuperación de contraseña llegan a Mailpit (http://127.0.0.1:54324) y Supabase
Studio queda en http://127.0.0.1:54323.

Una organización nueva empieza sin créditos. Para probar el asistente:
`pnpm credits:grant tu-correo@ejemplo.com 500` (ver [docs/asistente.md](./docs/asistente.md)).

## Scripts

| Script                  | Qué hace                                                    |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm dev`              | Servidor de desarrollo                                      |
| `pnpm build`            | Build de producción                                         |
| `pnpm start`            | Sirve el build de producción                                |
| `pnpm lint`             | ESLint (falla con cualquier warning)                        |
| `pnpm typecheck`        | Genera los tipos de rutas de Next.js y corre `tsc --noEmit` |
| `pnpm format`           | Formatea el código con Prettier                             |
| `pnpm format:check`     | Verifica el formato sin modificar archivos                  |
| `pnpm test`             | Tests unitarios con Vitest (no necesitan Supabase)          |
| `pnpm test:watch`       | Vitest en modo watch                                        |
| `pnpm test:integration` | Tests contra el Postgres de Supabase local (concurrencia)   |
| `pnpm test:e2e`         | Tests e2e con Playwright (necesitan `pnpm supabase:start`)  |
| `pnpm supabase:start`   | Levanta Supabase en Docker y crea los buckets de Storage    |
| `pnpm supabase:stop`    | Detiene Supabase                                            |
| `pnpm db:generate`      | Genera una migración a partir de `db/schema.ts`             |
| `pnpm db:migrate`       | Aplica las migraciones pendientes al Supabase local         |
| `pnpm db:reset`         | Recrea la base local desde cero con todas las migraciones   |
| `pnpm db:studio`        | Abre Drizzle Studio                                         |
| `pnpm credits:grant`    | Acredita créditos de prueba (solo Supabase local)           |

La primera vez que corras los tests e2e instala el navegador:
`pnpm exec playwright install chromium`.

## Estructura

```
app/
  [locale]/
    (auth)/          login, registro y recuperación de contraseña
    (pyme)/          modo guiado: inicio (/home), asistente (/create) y anuncios (/ads/[id])
    (empresa)/       workspace avanzado (inicio en /workspace)
    onboarding/      preguntas iniciales y asignación de segmento
    settings/        configuración ("Modo avanzado")
  api/auth/          vuelta de los enlaces de correo y del login con Google
  api/cron/          tareas programadas (polling de jobs, vencimiento de créditos)
components/          componentes propios
  ui/                componentes de shadcn/ui
db/
  index.ts           cliente de Drizzle (solo servidor)
  schema.ts          esquema de la base de datos
docs/                documentación de decisiones
e2e/                 tests de Playwright
i18n/                idiomas, routing y carga de textos (next-intl)
lib/
  ads/               asistente pyme: validación, creación del anuncio y acciones
  auth/              sesión, acciones de auth y redirecciones seguras
  billing/           precios en créditos y billetera (reservar, cobrar, reembolsar)
  generation/        jobs de generación, polling y límite por organización
  moderation/        moderación básica de textos
  onboarding/        opciones y validación del onboarding
  organizations/     organizaciones y membresías
  providers/         GenerationProvider y MockProvider
  segment/           regla de segmento y feature flags
  supabase/          clientes de Supabase (sesión y clave secreta)
  templates/         plantillas de anuncios y armado del prompt
  uploads/           validación y almacenamiento de fotos de producto
  users/             perfiles e idioma preferido
messages/            textos por idioma (es.json, pt.json)
proxy.ts             idioma y refresco de la sesión en cada petición
scripts/             scripts de desarrollo (acreditar créditos de prueba)
supabase/
  config.toml        Supabase local (auth, correos, buckets de Storage)
  migrations/        migraciones SQL generadas por drizzle-kit
  templates/         correos de confirmación y recuperación (es/pt)
test/                utilidades de tests (Postgres en memoria)
```

## Convenciones

- **Textos:** todo texto visible va en `messages/*.json`; nada de strings en los
  componentes. `es.json` es la fuente de verdad del tipado y un test verifica que
  `pt.json` tenga las mismas claves.
- **Idiomas:** el usuario elige el idioma; español en `/` y el resto con prefijo
  (`/pt`). Usa `Link`, `redirect`, `useRouter` y `usePathname` de
  `@/i18n/navigation` para conservar el idioma. Ver [docs/idiomas.md](./docs/idiomas.md).
- **Segmento:** las diferencias entre pyme y empresa se consultan en
  `lib/segment` (`segmentConfig`, `hasFeature`), nunca con `if` sobre el
  segmento en los componentes.
- **Páginas con sesión:** usa `requireUser`, `requireOrganization` o
  `requireSegmentArea` de `lib/auth/session.ts`. Ver [docs/auth.md](./docs/auth.md).
- **Créditos:** precios, billetera y jobs según [docs/creditos.md](./docs/creditos.md).
  El margen nunca se hardcodea en la UI y todo movimiento queda en el ledger.
- **Asistente pyme:** plantillas, moderación, fotos y límites según
  [docs/asistente.md](./docs/asistente.md).
- **Base de datos:** los servicios reciben la base por parámetro (`Database`)
  para poder probarlos con PGlite. Las tablas tienen RLS sin políticas y solo se
  acceden desde el servidor. Ver [docs/base-de-datos.md](./docs/base-de-datos.md).
- **Tests:** los archivos `*.test.ts` corren en Node y los `*.test.tsx` en jsdom
  con Testing Library.
- **Componentes de shadcn/ui:** se agregan con `pnpm dlx shadcn@latest add <nombre>`
  y luego `pnpm format`.

## CI

`.github/workflows/ci.yml` corre en cada PR y en cada push a `main`:

1. `lint`, `format:check`, `typecheck`, migraciones al día con el esquema y
   tests unitarios
2. Supabase local (con los buckets de Storage), tests de integración, `build` y
   tests e2e con Playwright sobre el build de producción
