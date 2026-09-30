# Panel de admin

Herramientas internas del equipo de Oniric (CLAUDE.md §9, Fase 1 paso 6), en
`/admin`: márgenes por modelo, acreditación manual de créditos y compras con la
pasarela (`/admin/purchases`, para facturar; ver [pagos.md](./pagos.md)).

## Quién entra

- Solo los usuarios con `users.is_platform_admin = true`. No tiene que ver con
  el rol dentro de una organización (admin, editor, revisor).
- A cualquier otro usuario, `/admin` le responde **404**, para no anunciar que
  el panel existe. Cada página y cada acción del servidor verifica el rol por su
  cuenta (`requirePlatformAdmin`).
- Los admins ven un enlace "Admin" en el encabezado.

Para dar o quitar el acceso (el usuario debe haberse registrado antes):

```bash
pnpm admin:grant persona@oniric.app            # da acceso
pnpm admin:grant persona@oniric.app --revoke   # lo quita
```

El script usa `DATABASE_URL_DIRECT` (o `DATABASE_URL`) y muestra a qué base se
conecta. Para producción, se corre con la conexión de producción.

TODO(producto): quiénes son los admins iniciales y si hace falta más de un
nivel (p. ej. soporte que solo consulta y finanzas que acredita).

## Organizaciones y acreditación manual

`/admin/organizations`: búsqueda por nombre del negocio o por correo de un
miembro. El detalle muestra miembros, saldo disponible y reservado, lotes con
saldo (y su vencimiento) y los últimos 20 movimientos del ledger, con el admin
que hizo cada acreditación.

**Acreditar créditos** usa `ManualPaymentProvider` (`lib/payments`), el
`PaymentProvider` provisorio hasta elegir la pasarela (CLAUDE.md §5):

- Para pagos por transferencia o efectivo, o créditos de cortesía.
- Pide la cantidad (entero entre 1 y 1.000.000, es decir, hasta US$10.000) y la
  **referencia** del pago o el motivo, obligatoria.
- Queda en el ledger como `grant`, con la nota `[manual] <referencia>` y el
  admin que la hizo. Los créditos vencen según el segmento de la organización
  (pyme: 12 meses).
- Después de acreditar, el formulario se vacía para no repetirlo sin querer.

TODO(producto): corregir una acreditación equivocada (hoy no hay débito
manual; el ledger es inmutable y la corrección sería un movimiento nuevo).

TODO(fase 3): registrar el pago (monto, IVA, medio) y emitir la factura
electrónica; la pasarela real acreditará sola con `PaymentProvider.fulfill`.

## Márgenes

`/admin/pricing`: una fila por proveedor, modelo y segmento con el margen y el
precio mínimo vigentes, si son los valores por defecto o propios, y el precio
de una generación de referencia (la duración más corta).

- El margen es sobre el precio de venta (ver [creditos.md](./creditos.md)).
  Acepta de 25 % (el mínimo decidido) a 90 %, con hasta 2 decimales. El tope
  del 90 % frena errores de tipeo.
- El precio mínimo es un entero de 1 a 100.000 créditos.
- **Guardar** crea o actualiza la fila en `model_pricing`, con el admin y la
  fecha. **Restablecer** la borra y vuelven los valores por defecto.
- Solo afecta a las generaciones nuevas: cada job guarda el costo, los
  recargos, el margen y el precio con el que se creó.

La lista sale de `listProviders()` (`lib/providers`): hoy solo el
MockProvider; el de Higgsfield se suma en la fase 3.
