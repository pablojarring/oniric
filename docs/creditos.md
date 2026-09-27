# Créditos, precios y generaciones

## Decisiones vigentes

| Parámetro                       | Valor                             | Dónde                                     |
| ------------------------------- | --------------------------------- | ----------------------------------------- |
| Valor del crédito               | 1 crédito = US$0,01               | `lib/billing/config.ts`                   |
| Margen por defecto              | 25 % sobre el precio de venta     | `lib/billing/config.ts`                   |
| Margen mínimo (piso)            | 25 %                              | `lib/billing/config.ts`                   |
| Margen por modelo y segmento    | Opcional; sin fila se usa el 25 % | tabla `model_pricing` (admin, paso 6)     |
| Precio mínimo por generación    | 1 crédito (o el del modelo)       | `lib/billing/config.ts` y `model_pricing` |
| ISD sobre pagos al proveedor    | 5 %                               | `lib/billing/config.ts`                   |
| Comisión bancaria               | 0 % — TODO(producto)              | `lib/billing/config.ts`                   |
| Vencimiento de créditos pyme    | 12 meses                          | `lib/billing/config.ts`                   |
| Vencimiento de créditos empresa | No vencen — TODO(producto)        | `lib/billing/config.ts`                   |

## Precio de una generación

```
precio = costo del proveedor × (1 + ISD + comisiones) ÷ (1 − margen)
```

- El resultado se redondea **hacia arriba** a créditos enteros y nunca es menor
  que el precio mínimo por generación.
- "Margen" es la ganancia bruta sobre el precio de venta: con 25 %, de cada
  crédito que paga el cliente quedan 0,25 después de pagar al proveedor y el
  ISD. Con el ISD del 5 %, el precio es el costo × 1,4.
- El margen debe ser menor al 100 % (la base de datos lo exige).
- Todo se calcula en enteros: micro-dólares, puntos básicos y créditos. Así no se
  pierden fracciones de centavo.

Ejemplo: un video de 10 s del modelo `mock-video-standard` cuesta US$0,50.
0,50 × 1,05 ÷ 0,75 = US$0,70, que se cobra como 70 créditos. De esos US$0,70,
US$0,525 van al proveedor (con ISD) y US$0,175 (25 %) quedan de ganancia bruta.

El precio se fija al crear el job: se reserva y se cobra exactamente esa
cantidad, aunque el costo real del proveedor varíe. El job guarda el costo, los
recargos, el margen y el precio aplicados.

El IVA de Ecuador no entra aquí: se aplica al vender paquetes de créditos (pagos,
paso 6 y fase 3).

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
   - `succeeded`: guarda los outputs y cobra, en la misma transacción.
   - `failed`: marca el error y reembolsa, en la misma transacción.

   Es idempotente, así que el polling, un webhook y la UI pueden llamarlo sin
   cobrar dos veces.

6. Un job que nunca llegó al proveedor (el proceso murió entre la reserva y el
   envío) se da por fallido y se reembolsa a los 10 minutos.

La tarea programada `GET /api/cron/generation` (con
`Authorization: Bearer <CRON_SECRET>`) hace el polling de respaldo de los jobs
en curso y vence los créditos.

Pendientes:

- TODO(producto): la frecuencia del cron.
- TODO(fase 3): webhooks de Higgsfield y descarga de los outputs a
  almacenamiento propio antes de cobrar.

## Proveedores

`lib/providers` define la interfaz `GenerationProvider`. Sin
`HIGGSFIELD_API_KEY` se usa `MockProvider`:

- No guarda estado: el resultado va codificado en el id del job.
- Tarda `MOCK_PROVIDER_LATENCY_MS` en terminar.
- Falla a propósito si el prompt incluye `[mock:falla]`.
- Sus outputs son imágenes de muestra en `public/mock/`.

El proveedor real de Higgsfield llega en la fase 3, después de verificar los
endpoints en su documentación oficial. Mientras tanto, definir la clave hace
fallar las generaciones a propósito, para no usar el mock en silencio.
