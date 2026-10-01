# Estado del proyecto

Resumen para retomar el trabajo sin el historial de conversaciones. **Actualízalo
al terminar cada tarea.** Última actualización: 1 de octubre de 2026 (PR #14).

## Dónde estamos

- **Fase 1 (MVP pyme): completa** y en `main` (PR #1 a #8).
- Después de la fase 1, y por decisión del dueño del producto, se adelantó parte
  de la **fase 3** para lanzar el modo pyme antes del modo empresa (fase 2):
  portada de venta, despliegue en planes gratuitos y pagos con Payphone.
- **Modo empresa (fase 2): no empezado.** El workspace empresa es un marcador.

## Historial de PRs (pablojarring/oniric)

| PR    | Qué hizo                                                                                |
| ----- | --------------------------------------------------------------------------------------- |
| #1    | Scaffold: Next.js, Tailwind, shadcn, Drizzle, Supabase, lint, typecheck y tests en CI.  |
| #2    | Auth (email y Google), onboarding y asignación de segmento.                             |
| #3    | `GenerationProvider`, `MockProvider`, jobs y billetera (reserva, cobro, reembolso).     |
| #4    | Plantillas pyme y asistente de 3 pasos.                                                 |
| #5    | Encabezado móvil (selector de idioma legible).                                          |
| #6–#7 | Galería, descargas, copia de resultados a un bucket privado y enlaces públicos.         |
| #8    | Panel de admin: márgenes por modelo y acreditación manual.                              |
| #9    | Portada de venta en español y portugués.                                                |
| #10   | Entorno de prueba en planes gratis: límite de 50 MB, cron diario, `docs/despliegue.md`. |
| #11   | Paquetes de créditos con IVA incluido, nueva fórmula de precios y pagos con Payphone.   |
| #12   | Mensajes de pago no aprobado o cancelado y motivo de Payphone en el admin.              |
| #13   | Nueva interfaz del modo pyme: menú y saldo, inicio, asistente, galería y recarga.       |
| #14   | Proveedor real de Higgsfield, webhook firmado y foto encuadrada en el formato elegido.  |

## Entornos

### Local

- Supabase en Docker: `pnpm supabase:start` (aplica migraciones y crea buckets).
- `.env.local` a partir de `.env.example` (incluye `PAYMENT_GATEWAY=mock`).
- `pnpm dev`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`.
- Créditos de prueba: `pnpm credits:grant <correo> <créditos>`. Admin:
  `pnpm admin:grant <correo>`.

### Producción de prueba (planes gratuitos)

Ver [despliegue.md](./despliegue.md) para el procedimiento completo.

- **Vercel** (plan Hobby): proyecto `oniric`, despliega `main` automáticamente.
  Dominio: **`https://oniric.oniriasolutions.com`** (DNS en Cloudflare, CNAME
  sin proxy; la landing de la empresa sigue en `oniriasolutions.com`). Ya está
  en `NEXT_PUBLIC_SITE_URL`, en la URL Configuration de Supabase y en la
  aplicación de Payphone. `oniric-jade.vercel.app` sigue respondiendo.
- **Supabase** `oniric-prod` (plan Free, región São Paulo): migraciones y
  buckets aplicados. `ad-outputs` con 50 MB (máximo del plan Free).
- **Correo:** SMTP de Google Workspace de `oniriasolutions.com`
  (`smtp.gmail.com:587`, contraseña de aplicación), remitente
  `no-reply@oniriasolutions.com`. Plantillas de `supabase/templates/` pegadas a
  mano en Supabase.
- **Generación:** `MockProvider` (no hay `HIGGSFIELD_API_KEY` a propósito). El
  proveedor real está listo ([higgsfield.md](./higgsfield.md)) pero no se
  activa hasta que el dueño dé permiso para gastar saldo real.
- **Pagos:** Payphone con la aplicación "Oniric" aprobada. Token y StoreId
  cargados en Vercel. La primera prueba falló porque la aplicación estaba en
  ambiente Producción (tarjetas ficticias rechazadas, `Canceled`). Después de
  ajustar el ambiente, el dueño confirmó el 30 de septiembre de 2026 que la
  compra de créditos funciona de punta a punta. TODO: registrar qué aplicación
  y ambiente quedaron cargados en Vercel, y volver a credenciales de Producción
  antes de vender. Ver [pagos.md](./pagos.md).
- **Tarea programada:** diaria, 05:00 UTC (`vercel.json`), con `CRON_SECRET`.

## Decisiones de producto vigentes

- Segmento: empresa si el equipo tiene más de 10 personas o es agencia o equipo
  de marketing; pyme en otro caso.
- 1 crédito = US$0,01 con IVA incluido. Paquetes de US$5 (500), 15 (1.575), 30
  (3.300) y 50 (5.750 créditos). Ver [creditos.md](./creditos.md).
- Precio de cada generación sobre el ingreso neto del crédito (sin IVA 15 % ni
  comisión de Payphone 5,75 %), con ISD 5 % y comisión bancaria 2 %, margen del
  35 % por defecto y 25 % mínimo.
- Créditos pyme vencen a los 12 meses.
- Resultados copiados a un bucket privado; enlaces públicos para compartir.
- Pasarela: Payphone (botón por redirección). Facturación: manual en el
  Facturador SRI por ahora, con los datos de `/admin/purchases`.
- Idiomas: español (por defecto) y portugués.

## Pendientes, en orden sugerido

1. **Higgsfield:** el proveedor ya está (PR #14, ver
   [higgsfield.md](./higgsfield.md)). Falta:
   - una prueba pagada de cada plantilla, con permiso del dueño y un tope de
     gasto, para validar calidad y costos (TODO(producto) de higgsfield.md);
   - el panel del saldo del proveedor con alerta y el reporte mensual para el
     contador (siguiente PR). El dinero va Payphone → Produbanco → tarjeta
     empresarial → saldo prepagado de Higgsfield (ISD 5 % en el pago al
     exterior). Higgsfield no documenta recarga automática ni un endpoint de
     saldo: TODO confirmarlo en su consola.
2. Redirigir `oniric-jade.vercel.app` al dominio propio (opcional).
3. **Con el contador:** ISD, IVA de servicios digitales importados y retención
   en pagos al exterior; si algo no se recupera, subir el factor de costos del
   proveedor en `lib/billing/config.ts`.
4. **Antes de cobrar de verdad:** Payphone a producción, regenerar credenciales
   (token de Payphone y contraseña de la base de datos), Vercel Pro (uso
   comercial), revisar límites de Supabase Free.
5. **Factura electrónica automática** (`InvoiceProvider`, firma `.p12`, SRI).
6. Páginas legales (términos y privacidad), imagen Open Graph, monitoreo de
   errores, login con Google.
7. Fase 2 (modo empresa).

Los `TODO(producto)` y `TODO(fase 3)` del código y de `docs/` detallan cada
punto.

## Reglas para tocar producción

- Nunca pedir ni mostrar secretos en el chat. Viven en Vercel y en archivos
  locales ignorados (`.env.local`, `.env.prod`), y se cargan sin imprimirlos.
- Prohibido `supabase db reset --linked` y `supabase config push` contra
  producción.
- Migraciones nuevas: `db push --dry-run`, confirmación del dueño, `db push`,
  `migration list`.
- Desplegar solo desde Git (merge a `main`), no con la CLI de Vercel desde una
  carpeta local.
- Nunca gastar saldo real de Higgsfield sin permiso explícito.
