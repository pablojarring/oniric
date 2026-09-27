# Idiomas

## Cómo funciona

El idioma de la interfaz lo elige el usuario con el selector del encabezado
(`components/locale-switcher.tsx`), que muestra cada idioma con su nombre nativo.
La URL indica el idioma:

| Idioma  | Ejemplo de URL       |
| ------- | -------------------- |
| Español | `/`, `/galeria`      |
| Otros   | `/pt`, `/pt/galeria` |

En cada visita, `proxy.ts` (next-intl) resuelve el idioma en este orden:

1. El idioma de la URL.
2. La cookie `NEXT_LOCALE`, que guarda la última elección durante un año.
3. El encabezado `Accept-Language` del navegador.
4. Español.

Cada respuesta incluye un encabezado `Link` con `hreflang` para cada idioma, así
los buscadores indexan todas las versiones.

Con sesión, el idioma elegido también se guarda en el perfil (`users.locale`) y
se aplica al iniciar sesión en otro dispositivo (ver [auth.md](./auth.md)).

## Activar un idioma

1. Crea `messages/<código>.json`. Puede ser parcial: las claves que falten se
   muestran en español (`i18n/messages.ts`).
2. En `i18n/config.ts`, agrega el código a `locales` y sus datos a `localeInfo`
   (si estaba en `plannedLocales`, quítalo de ahí).
3. Si la traducción es parcial, agrega el código a `partialLocales` en
   `i18n/messages.test.ts`.
4. Revisa que la fuente cubra sus caracteres. Geist se carga solo con el subset
   `latin`; hace falta `latin-ext` para vocales con macrón (ā, Nāhuatl) y
   `vietnamese` para las nasales del guaraní (ẽ, ỹ).
5. `pnpm test` valida las claves, el código BCP 47 y el locale de formato.

## Lenguas originarias

Están registradas como candidatas en `plannedLocales` (`i18n/config.ts`), pero
todavía no están activas:

| Código  | Lengua           | Nombre nativo | Países principales | Formato |
| ------- | ---------------- | ------------- | ------------------ | ------- |
| `qu-EC` | Kichwa           | Kichwa        | Ecuador            | `es-EC` |
| `jiv`   | Shuar            | Shuar chicham | Ecuador            | `es-EC` |
| `qu`    | Quechua (sureño) | Runasimi      | Perú, Bolivia      | `es-PE` |
| `gn`    | Guaraní          | Avañeʼẽ       | Paraguay           | `es-PY` |
| `ay`    | Aimara           | Aymar aru     | Bolivia, Perú      | `es-BO` |
| `nah`   | Náhuatl          | Nāhuatl       | México             | `es-MX` |
| `yua`   | Maya yucateco    | Maaya tʼaan   | México             | `es-MX` |
| `quc`   | Kʼicheʼ          | Kʼicheʼ       | Guatemala          | `es-GT` |
| `arn`   | Mapuche          | Mapudungun    | Chile              | `es-CL` |

Kichwa y shuar son idiomas oficiales de relación intercultural en Ecuador; el
guaraní es oficial en Paraguay, y el quechua y el aimara en Perú y Bolivia.

TODO(producto): decidir cuáles se activan y en qué orden. Antes de activar una:

- La traducción la hace o la revisa un hablante nativo. La traducción
  automática sin revisión puede ser incorrecta u ofensiva.
- Se valida el código y el nombre nativo, y se elige la variante. Por ejemplo,
  kichwa unificado o una variante regional.
- Se prueba el selector y las páginas con textos largos: las traducciones
  pueden ocupar bastante más espacio que el español.

## Formato de números, fechas y moneda

`Intl` (Node y navegadores) no tiene datos para guaraní, aimara, náhuatl, maya,
kʼicheʼ, mapuche ni shuar. Con esos códigos formatea en silencio con el locale del
sistema (`en-US` en el servidor), lo que da formatos incorrectos y diferencias
entre servidor y navegador. Por eso cada idioma define `formatLocale` y un test
verifica que `Intl` lo soporte.

Regla: para formatear precios, fechas o cifras usa
`localeInfo[locale].formatLocale`, no el código del idioma.

- El español usa `es-419`, que muestra los montos como `USD 1,234.50`. En
  países donde `$` es el peso local (México, Colombia, Chile, Argentina) eso
  evita confusiones.
- El portugués usa `pt-BR` (`US$ 1.234,50`).

Los montos y las fechas se formatean con `lib/format.ts` (`formatUsd`,
`formatDateTime`), que usa el `formatLocale` de cada idioma.

## Idioma de la interfaz e idioma del contenido

Son dos cosas distintas. Una pyme de Otavalo puede usar la interfaz en español y
querer un anuncio en kichwa para sus clientes. Para marketing, generar anuncios
en lenguas originarias probablemente diferencia más que traducir la interfaz,
porque llega directamente a los clientes del negocio.

Hoy el texto sugerido del asistente sale en el idioma de la interfaz, y el
cliente puede reescribirlo en cualquier idioma: el prompt le pide al modelo que
lo muestre tal cual (ver [asistente.md](./asistente.md)).

TODO(producto): elegir el idioma del anuncio por separado del de la interfaz
(p. ej. un anuncio en kichwa con la interfaz en español), con textos sugeridos
revisados por hablantes nativos.
