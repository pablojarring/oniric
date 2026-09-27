# Asistente de anuncios (modo pyme)

El cliente pyme crea un anuncio en 3 pasos, sin elegir modelos ni parámetros
(CLAUDE.md §4). La plantilla decide el modelo, la duración y los formatos.

| Ruta        | Qué hace                                                      |
| ----------- | ------------------------------------------------------------- |
| `/home`     | Saldo de créditos y botón "Crear anuncio".                    |
| `/create`   | Asistente de 3 pasos.                                         |
| `/ads/[id]` | Estado del anuncio; consulta cada 3 s mientras está en curso. |

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

## Plantillas

`lib/templates/index.ts`. Los nombres, descripciones y el texto sugerido están
en `messages/*.json` (namespace `Templates`).

| Plantilla                | Tipo   | Duración | Formatos        | Modelo (mock)         | Precio pyme  |
| ------------------------ | ------ | -------- | --------------- | --------------------- | ------------ |
| Promo 15s para Instagram | Video  | 15 s     | 9:16, 1:1, 16:9 | `mock-video-standard` | 105 créditos |
| Estado de WhatsApp       | Video  | 10 s     | 9:16            | `mock-video-standard` | 70 créditos  |
| Oferta del día           | Imagen | —        | 1:1, 9:16, 16:9 | `mock-image`          | 3 créditos   |

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

## Datos guardados

Cada anuncio es un `generation_jobs` con:

- `template_id`: la plantilla.
- `brief`: producto, descripción, oferta, texto final y consentimiento.
- `input_image_path`: ruta de la foto en Storage (o vacío).

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
- TODO(paso 5): galería y descarga.
- TODO(paso 6 y fase 3): recarga de créditos desde el asistente.
- TODO(fase 3): modelos de Higgsfield por plantilla y vigencia de la URL firmada.
