# Despliegue

Hoy Oniric corre como entorno de prueba en planes gratuitos: Vercel Hobby y
Supabase Free, con el MockProvider (sin `HIGGSFIELD_API_KEY`) y créditos que
acredita un admin desde `/admin`.

## Orden

1. **Vercel:** la URL de producción la asigna Vercel (Settings → Domains, un
   `*.vercel.app`). No uses las URLs con letras al azar: son de un solo
   despliegue.
2. **Supabase:** URL Configuration, migraciones y buckets (abajo).
3. **Vercel:** variables de entorno y **Redeploy**. Las `NEXT_PUBLIC_*` se
   fijan en el build, así que cualquier cambio necesita un despliegue nuevo.
4. **Admin:** registrarse en la app y darse acceso con `pnpm admin:grant`.

## Supabase

- **Authentication → URL Configuration:** Site URL `https://<url>` (sin barra
  final) y Redirect URL `https://<url>/**`.
- **Authentication → Sign In / Providers → Email:** contraseña mínima de 8.
- **Migraciones** y **buckets:** ver [base-de-datos.md](./base-de-datos.md).
  Se corren desde una computadora, con las conexiones en un archivo local
  ignorado por git (p. ej. `.env.prod`) que se carga en el mismo comando y
  nunca se imprime:

  ```bash
  set -a; source .env.prod; set +a
  pnpm exec supabase db push --dry-run --db-url "$DATABASE_URL_DIRECT"
  ```

- **Correos:** ver [auth.md](./auth.md#sin-smtp-propio).

Nunca uses contra producción `supabase db reset --linked` ni
`supabase config push`.

## Variables en Vercel

Settings → Environment Variables, solo en el entorno **Production** (así los
despliegues de prueba de otras ramas no tocan la base real). Las secretas,
marcadas como sensibles.

| Variable                               | Valor                                                    |
| -------------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | La URL de producción, sin barra final.                   |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase → Connect → Project URL.                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API Keys (`sb_publishable_…`).     |
| `SUPABASE_SECRET_KEY`                  | Supabase → Settings → API Keys (`sb_secret_…`). Secreta. |
| `DATABASE_URL`                         | Supabase → Connect → Transaction pooler (6543). Secreta. |
| `CRON_SECRET`                          | `openssl rand -hex 32`. Secreta.                         |
| `AUTH_GOOGLE_ENABLED`                  | `false` hasta configurar Google.                         |
| `PAYPHONE_TOKEN`                       | Payphone Developer → Credenciales. Secreta.              |
| `PAYPHONE_STORE_ID`                    | Payphone Developer → Solicitud de compañía.              |
| `HIGGSFIELD_API_KEY`                   | Solo al empezar a gastar saldo real. Secreta.            |
| `HIGGSFIELD_WEBHOOK_SECRET`            | `openssl rand -hex 32`, junto con la anterior. Secreta.  |

`HIGGSFIELD_API_KEY` activa el proveedor real: cada anuncio gasta saldo de
Higgsfield. Cárgala solo cuando el dueño lo decida (ver
[higgsfield.md](./higgsfield.md)). No van en Vercel: `PAYMENT_GATEWAY`,
`DATABASE_URL_DIRECT` ni `MAILPIT_URL`. Ver [pagos.md](./pagos.md).

Despliega siempre desde Git (push a `main` o Deployments → Redeploy), no con la
CLI de Vercel desde una carpeta local: podría subir archivos `.env` locales.

## Tarea programada

`vercel.json` programa `GET /api/cron/generation` una vez al día a las 05:00 UTC
(medianoche en Ecuador). Vercel envía `Authorization: Bearer <CRON_SECRET>` si
la variable existe; sin ella, la tarea responde 401 y no hace nada. Ver
[creditos.md](./creditos.md).

## Límites de los planes gratuitos

- **Vercel Hobby** es solo para uso no comercial: hay que pasar a Pro antes de
  cobrar el primer pago real. Las tareas programadas corren como máximo una vez
  al día.
- **Supabase Free** limita cada archivo subido a 50 MB (de ahí el límite de
  `ad-outputs`) y su SMTP incluido solo envía a los miembros del equipo.

## Pendientes

- TODO(fase 3): facturación electrónica automática.
- TODO(producto): cuándo pasar a Vercel Pro y Supabase Pro.
