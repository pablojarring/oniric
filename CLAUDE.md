# Oniric — Plataforma de video y anuncios con IA para empresas de LatAm

> Este archivo es el contexto permanente del proyecto para Claude Code.
> Léelo completo antes de cada tarea. Si algo aquí contradice una instrucción puntual, pregunta.

## 1. Qué es el producto

SaaS en español (y portugués más adelante) que permite a empresas latinoamericanas crear
videos e imágenes publicitarias con IA. Por detrás usa la **Higgsfield API** (consola
"Open Higgsfield", `cloud.higgsfield.ai`) y cobra un margen sobre el costo de cada generación.

Dos segmentos con la **misma plataforma y distinto UI**:

| | Pyme | Empresa |
|---|---|---|
| Usuario típico | Dueño/a del negocio, sin equipo de marketing | Equipo de marketing o agencia |
| Objetivo | "Quiero un anuncio para Instagram de mi producto" | Producción en volumen, consistencia de marca, control |
| UI | Asistente guiado de 3 pasos, plantillas, cero jerga técnica | Workspace completo, parámetros avanzados, lotes, aprobaciones |
| Modelos | Elegidos automáticamente por la plantilla | Selector de modelo y parámetros |
| Cobro | Paquetes pequeños de créditos prepagados | Paquetes grandes, facturación mensual, multiusuario |

### Regla de negocio crítica (términos de Higgsfield)
Los términos de Higgsfield prohíben revender el acceso a la API o actuar como simple
"pass-through" sin valor propio. Por eso el producto **nunca** expone la API 1:1.
Todo pasa por valor agregado propio: plantillas por industria, asistente guiado,
kit de marca, flujos de aprobación, lotes, biblioteca de assets, copy en español.
No construir un "playground" genérico de modelos.

## 2. Stack

- **Frontend + backend:** Next.js (App Router) + TypeScript estricto
- **UI:** Tailwind CSS + shadcn/ui (preset `base-nova`, sobre Base UI)
- **Base de datos:** PostgreSQL (Supabase) con Drizzle ORM. Migraciones generadas por drizzle-kit en
  `supabase/migrations` y aplicadas con la CLI de Supabase; RLS sin políticas en todas las tablas.
  Ver `docs/base-de-datos.md`.
- **Auth:** Supabase Auth (email + Google)
- **Almacenamiento de outputs:** Supabase Storage o Cloudflare R2
  (Higgsfield borra los archivos después de ~7 días; siempre descargar a almacenamiento propio)
- **Jobs asíncronos:** webhooks de Higgsfield + tabla de jobs con polling de respaldo
- **Pagos:** interfaz `PaymentProvider` desacoplada (ver §5). No asumir Stripe.
- **Tests:** Vitest (unit) + Playwright (e2e de flujos principales)
- **i18n:** next-intl. Todo texto visible en `messages/*.json`. El usuario elige el idioma
  (`es` por defecto, `pt` activo; lenguas originarias previstas). Ver `docs/idiomas.md`.

## 3. Arquitectura

```
/app
  /[locale]
    /(pyme)/...      rutas y layouts del modo guiado
    /(empresa)/...   rutas y layouts del workspace avanzado
  /api/webhooks/higgsfield
  /api/webhooks/payments
/lib
  /providers
    generation-provider.ts   interfaz GenerationProvider
    higgsfield.ts            implementación real
    mock.ts                  implementación falsa para dev y tests (por defecto)
  /billing
    pricing.ts               costo proveedor -> precio al cliente (margen por modelo)
    wallet.ts                reservar, liquidar y reembolsar créditos
  /payments
    payment-provider.ts      interfaz PaymentProvider
  /templates                 plantillas de anuncios por industria
  /segment                   lógica de segmento y feature flags
/db
  schema.ts
```

### 3.1 GenerationProvider (desacoplado del proveedor)
```ts
interface GenerationProvider {
  listModels(): Promise<ModelInfo[]>;
  estimate(req: GenerationRequest): Promise<{ costUsd: number }>;
  submit(req: GenerationRequest): Promise<{ providerJobId: string }>;
  getStatus(providerJobId: string): Promise<JobStatus>;
  fetchOutput(providerJobId: string): Promise<OutputFile[]>;
}
```
- `MockProvider` es el default cuando no existe `HIGGSFIELD_API_KEY`.
- Debe ser posible agregar otro proveedor (Fal, Replicate, etc.) sin tocar UI ni billing.
- Verificar los endpoints reales en la documentación oficial de Higgsfield antes de implementar
  `higgsfield.ts`. No inventar endpoints: si falta información, dejar TODO y avisar.

### 3.2 Flujo de una generación
1. Usuario elige plantilla (pyme) o configura modelo y parámetros (empresa).
2. `estimate()` → `pricing.ts` calcula el precio en créditos Oniric.
3. `wallet.reserve()` bloquea los créditos. Si no alcanza, se ofrece recargar.
4. `submit()` → se guarda el job como `pending`.
5. Webhook o polling → `succeeded` / `failed`.
6. Si `succeeded`: descargar el output a almacenamiento propio y `wallet.settle()`.
7. Si `failed`: `wallet.refund()` completo, en la misma transacción que marca el job.

## 4. Segmentación y UI adaptable

- En el onboarding se pregunta: nombre del negocio, país, industria, tamaño del equipo
  y para qué quiere los videos.
- Con eso se asigna `organization.segment = 'pyme' | 'empresa'`. El usuario puede cambiar
  de modo en configuración ("Modo avanzado").
- Regla (decisión de producto): **empresa** si el equipo tiene más de 10 personas o se identifica
  como agencia o equipo de marketing; **pyme** en cualquier otro caso. Implementada en
  `lib/segment` (`assignSegment`). Ver `docs/auth.md`.
- Las capacidades se controlan con feature flags por segmento en `/lib/segment`,
  **nunca** con `if` dispersos en componentes.

**Modo pyme (MVP):**
- Asistente de 3 pasos: (1) sube foto del producto o describe el servicio,
  (2) elige plantilla (ej. "Promo 15s Instagram", "Estado de WhatsApp", "Oferta del día"),
  (3) revisa y genera.
- Formatos por red: 9:16, 1:1, 16:9.
- Copy sugerido en español neutro, editable.
- Galería de sus videos, descarga y compartir.

**Modo empresa (fase 2):**
- Organizaciones multiusuario con roles (admin, editor, revisor).
- Kit de marca: logos, colores, tipografías y tono de voz aplicados a las plantillas.
- Generación por lotes desde CSV.
- Flujo de aprobación antes de descargar o publicar.
- Selector de modelo, parámetros avanzados y comparación lado a lado.
- Analítica de consumo por usuario y proyecto, con exportación CSV.

## 5. Pagos y créditos

- Entidad legal: el producto opera bajo **ONIRIASOLUTIONS S.A.S. (Ecuador)**. Diseñar pagos,
  facturación e impuestos para una empresa ecuatoriana.
- Los pagos a Higgsfield salen desde Ecuador y pagan ISD (5% en 2026).
  `pricing.ts` debe incluir un factor configurable de costos adicionales del proveedor
  (ISD y comisiones bancarias) antes de aplicar el margen.
- Precios al cliente: IVA de Ecuador configurable y separado del precio base.
  La factura electrónica SRI es parte de la fase 3 (dejar la interfaz `InvoiceProvider` preparada).
- Moneda base USD (Ecuador está dolarizado). Mostrar precios en USD.
- Créditos prepagados en paquetes. Los créditos de pyme no vencen o vencen a 12 meses (configurable).
- `pricing.ts`: `precioCliente = costoProveedor * margenModelo`, con margen configurable
  por modelo y segmento en la base de datos, más un mínimo por generación.
  Nunca hardcodear el margen en la UI.
- `PaymentProvider` con una implementación inicial pendiente de decidir
  (candidatos para una SAS ecuatoriana: Payphone, Kushki).
  Hasta decidir, usar un `ManualPaymentProvider` que acredita desde el panel de admin.
- Registrar cada movimiento en un ledger inmutable (`credit_transactions`), no solo el saldo.

## 6. Modelo de datos mínimo

`users`, `organizations` (con `segment`, `country`, `industry`), `memberships` (rol),
`credit_wallets`, `credit_transactions`, `model_pricing`, `templates`,
`generation_jobs` (estado, proveedor, costo, precio, ids, error), `assets`
y `brand_kits` (fase 2).

## 7. Seguridad y cumplimiento

- La API key de Higgsfield solo se usa en el servidor, nunca en el cliente.
- Verificar la firma de los webhooks.
- Rate limit por organización.
- Moderación básica de prompts, y bloqueo de uso de rostros de terceros sin consentimiento.
- Todo en `.env`, con `.env.example` documentado y sin secretos en el repo.

## 8. Reglas de trabajo para Claude Code

- Trabaja por fases. No empieces la fase 2 sin que la fase 1 esté mergeada.
- Cada tarea termina con: tests pasando, `pnpm lint` y `pnpm typecheck` sin errores,
  y un PR con una descripción clara.
- Usa `MockProvider` en todo el desarrollo y los tests. No gastes saldo real de Higgsfield.
- Si falta una decisión de producto, déjala como TODO y menciónala en el PR. No la inventes.
- Commits pequeños y descriptivos, en inglés.

## 9. Roadmap

**Fase 1 — MVP pyme**
1. Scaffold Next.js + Tailwind + shadcn + Drizzle + Supabase, con lint, typecheck y tests en CI.
2. Auth y onboarding con asignación de segmento.
3. `GenerationProvider` + `MockProvider` + tabla de jobs + wallet con reserva, liquidación y reembolso.
4. Tres plantillas pyme y el asistente de 3 pasos.
5. Galería y descarga.
6. Panel de admin: márgenes por modelo y acreditación manual de créditos.

**Fase 2 — Empresa**
Organizaciones y roles, kit de marca, lotes, aprobaciones y analítica.

**Fase 3 — Producción**
`HiggsfieldProvider` real, `PaymentProvider` real, webhooks, almacenamiento propio,
monitoreo y factura electrónica.
