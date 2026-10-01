# Higgsfield (proveedor real)

`lib/providers/higgsfield.ts` implementa `GenerationProvider` con la API de
Higgsfield. Todo está verificado en la documentación oficial
(docs.higgsfield.ai, septiembre de 2026); no hay endpoints inventados.

Sin `HIGGSFIELD_API_KEY` se sigue usando el `MockProvider`. **Con la clave,
cada generación gasta saldo real**: no la definas en desarrollo ni en tests
(CLAUDE.md §8).

## Cómo funciona

| Paso      | Llamada                                   | Notas                                                          |
| --------- | ----------------------------------------- | -------------------------------------------------------------- |
| Estimar   | `POST /estimate/<endpoint>` → `{ usd }`   | Se cachea 1 hora por parámetros: las páginas cotizan seguido.  |
| Enviar    | `POST /<endpoint>` → `{ request_id }`     | `Idempotency-Key` = id del job; reintenta 5xx y cortes.        |
| Estado    | `GET /requests/<request_id>/status`       | `queued`, `in_progress`, `completed`, `failed`, `nsfw`…        |
| Resultado | El mismo estado: `video.url` o `images[]` | Se copia a `ad-outputs` antes de cobrar (los borran a 7 días). |
| Aviso     | `?hf_webhook=<nuestra URL>` al enviar     | Ver "Webhook".                                                 |

Autenticación: `Authorization: Key <key_id>:<key_secret>`, solo desde el
servidor.

- `failed` y `nsfw` no se cobran en Higgsfield; aquí el job falla y se
  reembolsan los créditos (`nsfw` y `canceled` quedan como error del job).
- Un 403 al enviar es **saldo insuficiente en Higgsfield**: el job falla con
  `submit_failed` y se reembolsa. Hay que recargar el saldo prepagado.
- Un 400 por concurrencia (límite de la cuenta) también hace fallar el envío.
  TODO(fase 3): cola de envíos si el volumen lo pide.

## Modelos por plantilla

| Plantilla           | Modelo (`modelId`)       | Sin foto                             | Con foto                              |
| ------------------- | ------------------------ | ------------------------------------ | ------------------------------------- |
| Promo 15s Instagram | `kling-3.0-std`          | `kling-video/v3.0/std/text-to-video` | `kling-video/v3.0/std/image-to-video` |
| Estado de WhatsApp  | `kling-3.0-std`          | ídem                                 | ídem                                  |
| Oferta del día      | `marketing-studio-image` | `marketing-studio/image`             | ídem, con la foto en `image_urls`     |

- Kling 3.0 Standard acepta de 3 a 15 segundos y, sin foto, los formatos 9:16,
  1:1 y 16:9. Va con `sound: "off"`.
- Con foto, el video toma el encuadre de la foto. Por eso la foto se guarda y se
  envía **ya encuadrada** en el formato elegido (`lib/uploads/frame.ts`): la
  foto entera al centro sobre una copia desenfocada, en 1080×1920, 1080×1080 o
  1920×1080.
- Marketing Studio Image va en `1k` (suficiente para redes) y calidad `high`.

TODO(producto), antes de vender:

- Probar calidad y costo real de cada plantilla con una prueba pagada (con
  permiso del dueño y un tope de gasto).
- Confirmar que con foto cuesta lo mismo que sin foto: hoy se estima siempre
  sin foto, porque estimar con foto necesitaría una foto real.
- Decidir si los videos llevan sonido generado.

## Webhook

`POST /api/webhooks/higgsfield?job=<id>&sig=<firma>`.

Higgsfield **no firma** sus avisos, así que:

1. La URL que le pasamos lleva el id del job y una firma HMAC-SHA256 con
   `HIGGSFIELD_WEBHOOK_SECRET`. Sin firma válida: 401.
2. El cuerpo se valida contra el sobre documentado (400 si no coincide) y su
   `request_id` debe ser el del job (409 si no).
3. El contenido **nunca** se usa para cobrar ni reembolsar: solo dispara
   `syncJob`, que consulta el estado con nuestras credenciales. Responde 200
   enseguida y sincroniza después (`after`), porque Higgsfield espera respuesta
   en 10 segundos.

Los avisos repetidos se aceptan (la sincronización es idempotente). Sin
`HIGGSFIELD_WEBHOOK_SECRET` o sin una URL pública con HTTPS (en local) no se
pide webhook: siguen el polling de la página del anuncio (de 3 a 10 segundos,
con algo de azar) y la tarea programada diaria.

## Configuración

| Variable                    | Valor                                                                   |
| --------------------------- | ----------------------------------------------------------------------- |
| `HIGGSFIELD_API_KEY`        | `<key_id>:<key_secret>` de la consola de Higgsfield.                    |
| `HIGGSFIELD_WEBHOOK_SECRET` | `openssl rand -hex 32`. Si cambia, los envíos en curso pasan a polling. |

Solo en Vercel (entorno Production) y solo cuando el dueño decida empezar a
gastar saldo real. El panel de márgenes (`/admin/pricing`) muestra los modelos
de Higgsfield aunque no esté configurado, para fijar sus márgenes antes.

## Dinero

El cliente paga en Payphone; Higgsfield cobra de un saldo prepagado que se
recarga en su consola con la tarjeta de la empresa (paga ISD). Ver
[creditos.md](./creditos.md) y [estado.md](./estado.md).

TODO(fase 3): panel del saldo del proveedor con alerta y reporte mensual para
el contador (siguiente PR).
