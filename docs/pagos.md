# Pagos: compra de créditos

Las pymes compran paquetes de créditos en `/credits` y pagan con tarjeta en
Payphone (botón de pago por redirección). Los precios y paquetes están en
[creditos.md](./creditos.md).

## Flujo

1. El cliente elige un paquete en `/credits` (`buyCreditsAction`).
2. `startCheckout` crea la compra en `credit_purchases` como `pending`, con el
   desglose de base e IVA, y llama a **Prepare** de Payphone: montos en
   centavos (`amountWithTax` = base, `tax` = IVA), `clientTransactionId` = id de
   la compra y las URL de respuesta y cancelación.
3. El navegador va a la página de pago de Payphone (recarga completa).
4. Payphone vuelve a `/api/payments/payphone/return?id=…&clientTransactionId=…`.
5. `confirmPurchase` llama a **Confirm** desde el servidor y:
   - **Aprobado** y el monto coincide: en una transacción, bloquea la compra,
     acredita los créditos (un lote nuevo, que vence según el segmento) y la
     marca `paid` con los datos del pagador.
   - **Cancelado:** la marca `failed` (`canceled`). No se cobró.
   - **Monto distinto:** `failed` (`amount_mismatch`), sin acreditar; queda para
     revisar a mano.
   - **Payphone no responde:** sigue `pending`. Al recargar la página de vuelta
     se reintenta.
6. Redirige a `/credits?purchase=<id>`, que muestra el resultado.

Si el cliente cancela en Payphone, vuelve a `/credits?purchase=<id>&canceled=1`.

### Garantías

- **No se acredita dos veces:** la compra se bloquea (`for update`) antes de
  acreditar y una compra `paid` nunca vuelve atrás. Hay un índice único por
  transacción de la pasarela.
- **La URL de vuelta no alcanza para acreditar:** siempre se confirma con
  Payphone desde el servidor, con el token, y se verifica el
  `clientTransactionId` y el monto.
- **Sin confirmación no hay cobro:** Payphone reversa solo los pagos que no se
  confirman en 5 minutos. Una compra que sigue `pending` después de 10 minutos
  se muestra como "no completada".
- **Límite:** 10 compras iniciadas por organización por hora.

## Configuración

| Variable            | Dónde                                                         |
| ------------------- | ------------------------------------------------------------- |
| `PAYPHONE_TOKEN`    | Payphone Developer → tu aplicación → Credenciales. Secreta.   |
| `PAYPHONE_STORE_ID` | Payphone Developer → Solicitud de compañía → acciones.        |
| `PAYMENT_GATEWAY`   | Solo desarrollo y tests: `mock` (ver abajo). No va en Vercel. |

- Sin `PAYPHONE_TOKEN` y `PAYPHONE_STORE_ID` (y sin `mock`), la página muestra
  los paquetes pero las compras en línea quedan desactivadas.
- En la aplicación de Payphone Developer: tipo **Web**, los dominios de la app
  en **Dominio web** y `https://<dominio>/api/payments/payphone/return` como
  **URL de respuesta**.
- **Modo de pruebas de Payphone:** mientras la aplicación esté en pruebas, los
  pagos se aprueban sin mover dinero. Para pagar con la app de Payphone hace
  falta invitar un probador (Probadores → Clientes).

### Pasarela de prueba

Con `PAYMENT_GATEWAY=mock` (en `.env.example` y en CI), no hay página de pago:
el cliente vuelve de inmediato a la ruta de vuelta y la compra se aprueba sola.
Se ignora en la producción de Vercel (`VERCEL_ENV=production`), porque
acreditaría créditos gratis.

## Facturación

Cada compra guarda base, IVA, total y los datos que el pagador ingresó en
Payphone (nombre, cédula o RUC, correo y teléfono). En `/admin/purchases` el
equipo ve las compras pagadas con ese desglose para emitir la factura
electrónica.

Mientras no haya facturación automática, las facturas se emiten a mano en el
Facturador SRI. Todos los paquetes cuestan hasta US$50, así que se pueden
facturar a consumidor final si el comprador no da sus datos.

## Pendientes

- TODO(fase 3): factura electrónica automática (`InvoiceProvider`): XML firmado
  con la firma electrónica de la empresa y enviado al SRI al momento de la
  compra.
- TODO(producto): pedir los datos de facturación (RUC, razón social) antes de
  pagar, para quien necesita factura con sus datos.
- TODO(fase 3): antes de cobrar de verdad, pasar la aplicación de Payphone a
  producción, regenerar el token y pasar a Vercel Pro (el plan Hobby no permite
  uso comercial).
- TODO(producto): Payphone solo tiene la página de pago en español e inglés.
- TODO(producto): compra de créditos para empresa (facturación mensual).
