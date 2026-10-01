# Asistente de anuncios (modo pyme)

El cliente pyme crea un anuncio en 3 pasos, sin elegir modelos ni parámetros
(CLAUDE.md §4). La plantilla decide el modelo, la duración y los formatos.

| Ruta         | Qué hace                                                           |
| ------------ | ------------------------------------------------------------------ |
| `/home`      | Saldo, botón "Crear anuncio", plantillas y los últimos anuncios.   |
| `/create`    | Asistente de 3 pasos (`?template=<id>` llega con esa plantilla).   |
| `/ads`       | Galería con todos los anuncios de la organización, por páginas.    |
| `/ads/[id]`  | Estado y resultado del anuncio, descarga y enlace público.         |
| `/s/[token]` | Página pública de un anuncio compartido (sin sesión, no indexada). |

## Los 3 pasos

1. **Tu producto:** nombre de lo que se anuncia, y una foto del producto o una
   descripción (al menos una de las dos). Con foto, el cliente debe confirmar
   que tiene derecho a usarla y el consentimiento de las personas que aparecen.
2. **Plantilla:** una de las tres plantillas y el formato (9:16, 1:1 o 16:9,
   según la plantilla). "Oferta del día" pide además la oferta.
3. **Revisa y genera:** texto del anuncio sugerido y editable, precio en
   créditos (y en USD) y saldo. Si no alcanza, el botón queda desactivado.

Al generar, la página del anuncio muestra el resultado cuando termina, o el
aviso de que falló y se devolvieron los créditos.

## Interfaz

- **Menú:** en pantallas anchas va en el encabezado; en el celular, en una
  barra fija abajo con "Crear" en el centro y la configuración al final. Las
  secciones de cada segmento están en `segmentConfig[segment].navigation`
  (`lib/segment`), no en los componentes.
- **Saldo:** siempre a la vista en el encabezado (lleva a recargar). El
  encabezado vive en el layout y no se vuelve a renderizar al navegar, así que
  el saldo se consulta de nuevo en cada cambio de página
  (`getAvailableCredits`).
- **Vista previa:** mientras el cliente completa el asistente, una vista de
  ejemplo muestra el anuncio con su producto, su foto, la plantilla, el formato
  y el texto. Es una ilustración (`AdMockup`), no el resultado de la IA.
- **Plantillas en el inicio:** cada una lleva al asistente con la plantilla y
  su formato por defecto ya elegidos.
- **Resultado:** descarga, "Copiar texto" para pegarlo al publicar y, con el
  enlace público activo, "Enviar por WhatsApp" con el texto y el enlace.

## Plantillas

`lib/templates/index.ts`. Los nombres, descripciones y el texto sugerido están
en `messages/*.json` (namespace `Templates`).

| Plantilla                | Tipo   | Duración | Formatos        | Modelo (mock)         | Precio pyme  |
| ------------------------ | ------ | -------- | --------------- | --------------------- | ------------ |
| Promo 15s para Instagram | Video  | 15 s     | 9:16, 1:1, 16:9 | `mock-video-standard` | 244 créditos |
| Estado de WhatsApp       | Video  | 10 s     | 9:16            | `mock-video-standard` | 163 créditos |
| Oferta del día           | Imagen | —        | 1:1, 9:16, 16:9 | `mock-image`          | 17 créditos  |

- Cada plantilla define su modelo por proveedor (`models`). Agregar un proveedor
  es agregar su modelo en cada plantilla, sin tocar la UI.
- El precio sale de `pricing.ts` con el margen de la organización; la UI nunca
  lo calcula.
- El prompt para el proveedor se arma en inglés (`buildPrompt`): estilo de la
  plantilla, producto, descripción, oferta y el texto del anuncio entre comillas
  para que el modelo lo muestre tal cual, en el idioma del cliente.

### Texto sugerido

Es una plantilla de texto por plantilla e idioma, con el nombre del negocio, el
producto y la oferta (ICU de next-intl). El cliente puede editarlo o volver al
sugerido.

## Seguridad y cumplimiento (CLAUDE.md §7)

- **Moderación** (`lib/moderation`): lista de términos bloqueados en español,
  portugués e inglés, sin distinguir mayúsculas ni tildes, sobre el nombre, la
  descripción, la oferta y el texto. El proveedor aplica además la suya.
- **Rostros de terceros:** con foto, el consentimiento es obligatorio y queda
  registrado en el job (`brief.photoConsent`).
- **Fotos** (`lib/uploads`): PNG, JPEG o WebP de hasta 8 MB. El tipo se detecta
  por los primeros bytes del archivo, no por la extensión.
- **Almacenamiento:** bucket privado `product-photos` de Supabase Storage, en
  una carpeta por organización. La app sube y firma con la clave secreta desde
  el servidor; el proveedor recibe una URL firmada que vence en 1 hora. Si la
  generación no llega a crearse, la foto se borra.
- **Límite por organización:** 20 generaciones por hora (`GENERATION_RATE_LIMIT`
  en `lib/generation/service.ts`). Se cuenta con la billetera bloqueada, así que
  las solicitudes simultáneas no lo superan.
- **Precio confirmado:** el formulario envía el precio que vio el cliente; si
  cambió (p. ej. un admin cambió el margen), no se genera y se pide revisar.
- El asistente solo está disponible con el feature flag `guidedWizard`.

## Resultados

Cuando el proveedor termina, `syncJob` descarga cada resultado y lo sube al
bucket privado `ad-outputs` (`<organización>/<job>/<n>.<ext>`) **antes** de
cobrar. Si la copia falla, no se cobra y el job sigue en curso hasta la próxima
sincronización. Un resultado de más de 50 MB o de un tipo no soportado, o un
"éxito" sin resultados, da la generación por fallida y se reembolsa.
Ver [creditos.md](./creditos.md).

- La página del anuncio y la galería muestran los resultados con URLs firmadas
  de 1 hora. Videos con `<video>`, imágenes con `<img>`.
- **Descargar** usa otra URL firmada que fuerza la descarga con un nombre
  legible: `oniric-pan-de-yuca-9x16.webm`.
- El MockProvider entrega imágenes SVG y videos WebM reales de muestra
  (`public/mock/`) como URLs `data:`, para que la copia funcione igual que con
  un proveedor real.

## Compartir

Cada anuncio terminado puede tener un **enlace público** (`/s/<token>`):

- El dueño lo crea desde la página del anuncio y puede copiarlo, enviarlo por
  WhatsApp (`wa.me`, con el texto del anuncio), usar el diálogo de compartir
  del celular o desactivarlo.
- El token es aleatorio (128 bits). Al desactivarlo se borra: el enlace anterior
  deja de funcionar para siempre y uno nuevo tiene otro token.
- La página pública muestra solo el resultado, el texto del anuncio y el nombre
  del negocio, con un llamado a crear una cuenta. No muestra precio ni datos
  internos, y pide a los buscadores no indexarla.
- La URL no lleva idioma: quien la abre la ve en el suyo.

## Datos guardados

Cada anuncio es un `generation_jobs` con:

- `template_id`: la plantilla.
- `brief`: producto, descripción, oferta, texto final y consentimiento.
- `input_image_path`: ruta de la foto en Storage (o vacío).
- `outputs`: resultados copiados a `ad-outputs` (ruta, tipo, tamaño y medidas).
- `share_token` y `shared_at`: enlace público activo (o vacío).

## Desarrollo

Una organización nueva empieza sin créditos. Para probar el asistente en local:

```bash
pnpm credits:grant tu-correo@ejemplo.com 500
```

El script solo corre contra el Supabase local y registra la acreditación en el
ledger. Para simular una generación fallida, escribe `[mock:falla]` en la
descripción.

## Pendientes

- TODO(producto): confirmar las tres plantillas, sus textos y su estilo.
- TODO(producto): texto sugerido con plantillas o con un modelo de lenguaje.
- TODO(producto): cuánto tiempo se guardan las fotos de producto.
- TODO(producto): revisar la lista de moderación.
- TODO(producto): valor definitivo del límite por organización.
- TODO(producto): créditos de bienvenida para organizaciones nuevas.
- TODO(producto): cuánto tiempo se guardan los resultados en `ad-outputs`.
- TODO(producto): vista previa del enlace público al compartirlo (imagen
  Open Graph), que necesita una URL que no venza.
- Si no alcanzan los créditos, el paso 3 lleva a la recarga (`/credits`, ver
  [pagos.md](./pagos.md)).
- TODO(fase 3): vigencia de la URL firmada de la foto (1 hora) si Higgsfield
  tarda más en tomarla. Modelos por plantilla: ver [higgsfield.md](./higgsfield.md).
