# Créditos, precios y generaciones

## Decisiones vigentes

| Parámetro                         | Valor                                      | Dónde                                     |
| --------------------------------- | ------------------------------------------ | ----------------------------------------- |
| Valor del crédito para el cliente | 1 crédito = US$0,01 con IVA incluido       | `lib/billing/config.ts`                   |
| Paquetes                          | US$5, 15, 30 y 50 (ver abajo)              | `lib/billing/packages.ts`                 |
| IVA                               | 15 %, incluido en el precio                | `lib/billing/config.ts`                   |
| Comisión de la pasarela           | 5,75 % del total (Payphone 5 % + IVA)      | `lib/billing/config.ts`                   |
| Valor neto del crédito            | US$0,00812 (sin IVA ni comisión)           | `lib/billing/config.ts` (calculado)       |
| ISD sobre pagos al proveedor      | 5 %                                        | `lib/billing/config.ts`                   |
| Comisión bancaria al exterior     | 2 % (estimada) — TODO(producto): confirmar | `lib/billing/config.ts`                   |
| Margen por defecto                | 35 % del ingreso neto                      | `lib/billing/config.ts`                   |
| Margen mínimo (piso)              | 25 % del ingreso neto                      | `lib/billing/config.ts`                   |
| Margen por modelo y segmento      | Opcional; sin fila se usa el 35 %          | `model_pricing`, desde `/admin/pricing`   |
| Precio mínimo por generación      | 1 crédito (o el del modelo)                | `lib/billing/config.ts` y `model_pricing` |
| Vencimiento de créditos pyme      | 12 meses                                   | `lib/billing/config.ts`                   |
| Vencimiento de créditos empresa   | No vencen — TODO(producto)                 | `lib/billing/config.ts`                   |

## Precio de una generación

```
créditos = costo del proveedor × (1 + ISD + comisiones) ÷ (1 − margen) ÷ valor neto del crédito
```

- **Valor neto del crédito:** de cada crédito que el cliente paga a US$0,01 con
  IVA, quedan US$0,00812: US$0,008695 sin el IVA (÷ 1,15) menos US$0,000575 de
  comisión de Payphone (5 % + IVA sobre el total).
- **Margen:** la ganancia bruta sobre ese ingreso neto, después de pagar al
  proveedor con ISD y comisiones bancarias. Cubre los costos fijos (hosting,
  dominio, correo), el impuesto a la renta y los créditos de regalo de los
  paquetes grandes.
- El resultado se redondea **hacia arriba** a créditos enteros y nunca es menor
  que el precio mínimo por generación. El margen debe ser menor al 100 % y nunca
  baja del piso.
- Todo se calcula en enteros: micro-dólares, puntos básicos y créditos.

Ejemplo: un estado de WhatsApp (video de 10 s) con un costo estimado de US$0,80:
0,80 × 1,07 ÷ 0,65 = US$1,317 netos ÷ 0,00812 = 162,2 → **163 créditos**
(US$1,63 para el cliente).

El precio se fija al crear el job: se reserva y se cobra exactamente esa
cantidad, aunque el costo real del proveedor varíe. El job guarda el costo, los
recargos, el margen y el precio aplicados.

## Paquetes

| Paquete     | Precio (IVA incl.) | Base + IVA   | Créditos | Regalo | Margen con todo gastado |
| ----------- | ------------------ | ------------ | -------- | ------ | ----------------------- |
| Inicial     | US$5               | 4,35 + 0,65  | 500      | —      | 35,0 %                  |
| Emprendedor | US$15              | 13,04 + 1,96 | 1.575    | +5 %   | 31,7 %                  |
| Negocio     | US$30              | 26,09 + 3,91 | 3.300    | +10 %  | 28,5 %                  |
| Pro         | US$50              | 43,48 + 6,52 | 5.750    | +15 %  | 25,3 %                  |

Por qué así:

- **Entrada baja:** US$5 es un gasto que una pyme de la región prueba sin pensarlo
  mucho. 500 créditos por US$5 es la regla "1 crédito = 1 centavo".
- **Regalo en créditos, no descuento en el precio:** premia las recargas grandes
  (sube el ticket promedio) sin tocar el precio de cada anuncio. Aun con el regalo
  más grande, el margen queda sobre el piso del 25 % (lo prueba
  `packages.test.ts`).
- **Todos hasta US$50:** es el máximo que se puede facturar a consumidor final;
  arriba de eso la factura necesita los datos del comprador.
- **Precios redondos cuyo IVA cuadra al centavo** con la factura (base × 15 %
  redondeado = IVA). Por eso no hay un paquete de US$10: con IVA incluido, su
  desglose no cuadra.

### Cuánto rinde cada paquete

Con los costos estimados de Higgsfield en 2026 (un video tipo Kling a 720p ronda
US$0,08 por segundo con recargas de créditos; una imagen, hasta US$0,08), que son
también los del `MockProvider`:

| Plantilla                 | Costo estimado | Precio       |
| ------------------------- | -------------- | ------------ |
| Estado de WhatsApp (10 s) | US$0,80        | 163 créditos |
| Promo 15s para Instagram  | US$1,20        | 244 créditos |
| Oferta del día (imagen)   | US$0,08        | 17 créditos  |

El paquete Inicial alcanza para 3 estados de WhatsApp, 2 promos o 29 imágenes.
La página de recarga lo calcula en vivo con los precios reales de las plantillas.

### Números del paquete de US$5

| Concepto                                   | US$   |
| ------------------------------------------ | ----- |
| Paga el cliente                            | 5,00  |
| IVA (al SRI)                               | −0,65 |
| Comisión de Payphone (5 % + IVA)           | −0,29 |
| **Ingreso neto**                           | 4,06  |
| 3 estados de WhatsApp: costo + ISD + banco | −2,57 |
| **Ganancia bruta**                         | 1,49  |

Con unos US$50 al mes de costos fijos al lanzar (Vercel Pro, Supabase Pro,
dominio), el punto de equilibrio está cerca de 34 paquetes de US$5 al mes (o su
equivalente en paquetes más grandes). El impuesto a la renta se paga sobre la
utilidad después de esos costos.

Pendientes:

- TODO(producto): confirmar con el contador el tratamiento del IVA de la
  comisión de Payphone y de los servicios digitales del exterior (hoy se toman
  como costo, que es lo conservador).
- TODO(producto): confirmar con el banco la comisión real de los pagos al
  exterior (hoy 2 %).
- Con Higgsfield, el costo de cada plantilla sale de su endpoint de estimación
  (ver [higgsfield.md](./higgsfield.md)): el precio en créditos se ajusta solo
  y el margen no cambia. TODO(producto): revisar los precios resultantes con la
  cuenta real antes de vender.

La compra de paquetes con Payphone está en [pagos.md](./pagos.md). Un admin
también puede acreditar pagos a mano desde `/admin` (ver [admin.md](./admin.md)).

## Billetera

- Cada acreditación crea un **lote** (`credit_lots`) con su vencimiento, según el
  segmento de la organización en ese momento.
- **Reservar** toma créditos de los lotes que vencen antes y guarda de cuáles
  salieron (`credit_allocations`).
- **Liquidar** (job exitoso) cobra lo reservado.
- **Reembolsar** (job fallido) devuelve todo a los mismos lotes. Si un lote venció
  mientras tanto, esos créditos vuelven vencidos.
- **Vencer:** los lotes vencidos dejan de contar en el saldo apenas llega su fecha.
  El cron registra el vencimiento en el ledger.
- Cada operación bloquea la fila de la billetera de la organización. Así, dos
  generaciones simultáneas nunca gastan el mismo crédito. Un test de integración
  lo prueba contra Postgres real con 10 reservas simultáneas.

### Ledger inmutable

`credit_transactions` registra cada movimiento:

| Tipo      | Disponible | Reservado |
| --------- | ---------- | --------- |
| `grant`   | +N         |           |
| `reserve` | −N         | +N        |
| `settle`  |            | −N        |
| `refund`  | +N         | −N        |
| `expire`  | −N         |           |

Reglas:

- Un trigger impide editar o borrar filas; las correcciones son movimientos
  nuevos.
- Índices únicos garantizan que cada job se reserva una sola vez y se cierra
  (cobro o reembolso) una sola vez.
- La suma de "disponible" del ledger siempre coincide con lo que queda en los
  lotes.
- Las organizaciones con movimientos no se pueden borrar (`on delete restrict`).

## Jobs de generación

Flujo (CLAUDE.md §3.2), en `lib/generation/service.ts`:

1. `startGeneration` valida la solicitud contra los modelos del proveedor.
2. Estima el costo y calcula el precio. Si el cliente confirmó otro precio
   (`expectedPriceCredits`), lanza `PriceChangedError` y no crea nada.
3. En una transacción, crea el job y reserva los créditos. Sin saldo suficiente
   lanza `InsufficientCreditsError` y no crea nada. Con la billetera ya
   bloqueada, cuenta las generaciones de la última hora de la organización: si
   supera el límite (20, TODO(producto)), lanza `RateLimitExceededError` y
   deshace todo.
4. Envía el job al proveedor. El job queda `pending`; si el envío falla, queda
   `failed` con los créditos devueltos.
5. `syncJob` consulta al proveedor:
   - `running`: actualiza el estado.
   - `succeeded`: copia los resultados al bucket privado `ad-outputs` y
     después, en una transacción, los guarda y cobra. Si la copia falla, no
     cobra y el job sigue en curso para reintentar. Si un resultado nunca se va
     a poder guardar (más de 50 MB o un tipo no soportado), el job falla y se
     reembolsa. Sin resultados, también reembolsa.
   - `failed`: marca el error y reembolsa, en la misma transacción.

   Es idempotente, así que el polling, un webhook y la UI pueden llamarlo sin
   cobrar dos veces.

6. Un job que nunca llegó al proveedor (el proceso murió entre la reserva y el
   envío) se da por fallido y se reembolsa a los 10 minutos.

La tarea programada `GET /api/cron/generation` (con
`Authorization: Bearer <CRON_SECRET>`) hace el polling de respaldo de los jobs
en curso y vence los créditos. En Vercel corre una vez al día a las 05:00 UTC
(`vercel.json`), el máximo del plan Hobby. Mientras el cliente tiene abierta la
página del anuncio, la UI sincroniza su job sin esperar al cron.

Pendientes:

- TODO(producto): la frecuencia del cron cuando se pase a Vercel Pro.
- TODO(fase 3): dar el job por fallido si la copia de los resultados sigue
  fallando cuando los archivos del proveedor están por vencer.

## Proveedores

`lib/providers` define la interfaz `GenerationProvider`. Sin
`HIGGSFIELD_API_KEY` se usa `MockProvider`:

- No guarda estado: el resultado va codificado en el id del job.
- Tarda `MOCK_PROVIDER_LATENCY_MS` en terminar.
- Falla a propósito si el prompt incluye `[mock:falla]`.
- Sus outputs son imágenes de muestra en `public/mock/`.

Con `HIGGSFIELD_API_KEY` se usa el proveedor real, que gasta saldo de
Higgsfield. Ver [higgsfield.md](./higgsfield.md).
