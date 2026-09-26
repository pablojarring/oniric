# Oniric

Plataforma SaaS para que empresas de Latinoamérica creen videos e imágenes
publicitarias con IA. El contexto completo del producto, la arquitectura y el
roadmap está en [CLAUDE.md](./CLAUDE.md).

> Estado: Fase 1, paso 1 — scaffold del proyecto. Todavía no hay
> funcionalidades de producto.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript estricto
- [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com)
- PostgreSQL en [Supabase](https://supabase.com) con [Drizzle ORM](https://orm.drizzle.team)
- [next-intl](https://next-intl.dev) para textos (`es` por defecto, `pt` preparado)
- [Vitest](https://vitest.dev) (unit) + [Playwright](https://playwright.dev) (e2e)
- ESLint + Prettier, CI en GitHub Actions

## Requisitos

- Node.js 22.12 o superior (ver `.nvmrc`)
- pnpm 10 (`corepack enable` usa la versión fijada en `package.json`)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completa los valores (ver comentarios)
pnpm dev                     # http://localhost:3000
```

La aplicación arranca sin base de datos mientras ninguna ruta use `db/`.

## Scripts

| Script              | Qué hace                                                      |
| ------------------- | ------------------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo                                        |
| `pnpm build`        | Build de producción                                           |
| `pnpm start`        | Sirve el build de producción                                  |
| `pnpm lint`         | ESLint (falla con cualquier warning)                          |
| `pnpm typecheck`    | Genera los tipos de rutas de Next.js y corre `tsc --noEmit`   |
| `pnpm format`       | Formatea el código con Prettier                               |
| `pnpm format:check` | Verifica el formato sin modificar archivos                    |
| `pnpm test`         | Tests unitarios con Vitest                                    |
| `pnpm test:watch`   | Vitest en modo watch                                          |
| `pnpm test:e2e`     | Tests e2e con Playwright (levanta `pnpm dev` automáticamente) |
| `pnpm db:generate`  | Genera migraciones SQL a partir de `db/schema.ts`             |
| `pnpm db:migrate`   | Aplica las migraciones pendientes                             |
| `pnpm db:studio`    | Abre Drizzle Studio                                           |

La primera vez que corras los tests e2e instala el navegador:
`pnpm exec playwright install chromium`.

## Estructura

```
app/                 rutas (App Router)
components/ui/       componentes de shadcn/ui
db/
  index.ts           cliente de Drizzle (solo servidor)
  schema.ts          esquema de la base de datos
  migrations/        migraciones generadas por drizzle-kit
e2e/                 tests de Playwright
i18n/                configuración de next-intl
messages/            textos por idioma (es.json, pt.json)
lib/                 utilidades compartidas
```

## Convenciones

- **Textos:** todo texto visible va en `messages/*.json`; nada de strings en los
  componentes. `es.json` es la fuente de verdad del tipado y un test verifica que
  `pt.json` tenga las mismas claves.
- **Tests:** los archivos `*.test.ts` corren en Node y los `*.test.tsx` en jsdom
  con Testing Library.
- **Base de datos:** las propiedades del esquema van en camelCase y Drizzle las
  mapea a columnas en snake_case.
- **Componentes de shadcn/ui:** se agregan con `pnpm dlx shadcn@latest add <nombre>`
  y luego `pnpm format`.

## CI

`.github/workflows/ci.yml` corre en cada PR y en cada push a `main`:

1. `lint`, `format:check`, `typecheck` y `test`
2. `build` y tests e2e con Playwright sobre el build de producción
