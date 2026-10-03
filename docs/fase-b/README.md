# Fase B: diseño del flujo creativo (octubre de 2026)

Diseño para aprobar antes de programar. Se apoya en la investigación de la
[fase A](../fase-a/README.md): manual creativo, rúbrica y herramientas.

- **Bocetos navegables:** [Oniric flujo creativo](https://claude.ai/artifact/KzUCC87csxTJZ2yQp79zjh)
  (privado del dueño). Son 16 pantallas con el ejemplo de Panadería La Esquina.
  Con Play se navega con los botones y las opciones responden al toque.
- Este documento cubre el recorrido, la búsqueda inteligente de inspiración,
  las plantillas y los personajes propios, el almacenamiento y el plan de la
  fase C.

## 1. El recorrido

| #   | Pantalla           | Qué hace                                                                                                                                                                         |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Inicio             | "Crear anuncio", la próxima fecha comercial y el avance de Mi marca.                                                                                                             |
| 2   | Objetivo           | Primera pregunta, con respuestas de un toque generadas para el negocio, "Otras ideas", "No sé, decide tú", texto libre y nota de voz.                                            |
| 3   | Conversación       | La IA pregunta solo lo que falta. Si el dueño menciona algo propio (en el ejemplo, Mishi, el gato de la panadería), pregunta si quiere usarlo y si lo guarda en Mi marca.        |
| 4   | ¿Qué tan pro?      | Rápido, Pro o Cine, con el rango de créditos, la recomendación del director creativo y cuántos anuncios alcanzan con el saldo.                                                   |
| 5   | Inspiración        | Búsqueda que mezcla el producto con un estilo (sección 2): plantillas Oniric, videos de internet y fotos libres.                                                                 |
| 6   | Plantilla Oniric   | Ejemplo hecho por Oniric, cómo está armada por tomas y cómo se adapta al producto del cliente.                                                                                   |
| 7   | Tablero            | Lo guardado, "¿qué te gusta de este video?" (luz, cámara, ritmo, colores, sonido), las etiquetas que entendió la IA y "Guardar como Mi estilo".                                  |
| 8   | ¿Quién sale?       | Nadie, el personaje de la marca, yo, otra persona real (con confirmación de consentimiento) o una persona ficticia.                                                              |
| 9   | Personajes Oniric  | Set propio de personajes ficticios, editables (edad, ropa, forma de ser) y reutilizables (sección 3).                                                                            |
| 10  | Mi marca           | Opcional y por partes: lo esencial, personalidad, voz, logo y colores, personajes y lo propio, lo que no va, Mi estilo. Cada parte ofrece "No tengo", "Ayúdame" o "Ya lo tengo". |
| 11  | Ideas              | El insight para confirmar con un toque y 3 ideas distintas (con humor, emotiva, demostración) con su cierre y precio.                                                            |
| 12  | Guion              | Guion por tomas con tiempo, acción, cámara, sonido y texto; cambios por texto o voz; "Para curiosos" muestra lo que se le pide a la IA.                                          |
| 13  | Imagen de prueba   | Una imagen clave (3 créditos) para aprobar el look antes de pagar el video, ajustes de un toque y el precio final con el saldo que queda.                                        |
| 14  | Edición            | Texto encima del video en zonas seguras, 3 estilos de texto pensados para la marca, voz en off, música y llamado a la acción. Rehacerla no vuelve a cobrar el video.             |
| 15  | Admin: tope y lote | Tope de gasto en Higgsfield con su interruptor, aviso al 80 %, costo real del mes y el lote de pruebas con las notas del dueño y de Claude.                                      |
| 16  | Admin: rúbrica     | Calificación con los 10 criterios, nota ponderada en vivo, nota de Claude al lado, criterios que difieren en más de 1 punto, ética y "¿lo publicarías?".                         |

Decisiones de diseño:

- **Una pregunta a la vez y nada obligatorio.** El progreso se ve arriba y el
  resumen se puede corregir con un toque (los chips de respuestas anteriores).
- **El precio siempre a la vista** antes de gastar: en el nivel, en cada idea
  y en la imagen de prueba.
- **El modelo de Higgsfield no se muestra.** Lo elige Oniric según el nivel y
  la idea (regla de negocio de CLAUDE.md: nada de "playground").
- **Mismo estilo de la app actual:** violeta, Bricolage Grotesque y Geist.

## 2. Búsqueda inteligente de inspiración

El pedido del dueño: "si el cliente de la panadería quiere hacer un comercial
de pan, deberían salir plantillas útiles… una búsqueda de comerciales de pan que
además se junte con una búsqueda de comerciales de cine".

### Por qué no se toman de Higgsfield, TikTok o Pinterest directamente

- La galería y los "templates" de Higgsfield no tienen API pública ni licencia
  para mostrarlos en otra app (ver [herramientas](../fase-a/herramientas.md)).
- TikTok y Pinterest no ofrecen una búsqueda pública para apps de terceros, y
  descargar o volver a subir su contenido viola sus términos y los derechos de
  autor de quien lo hizo.
- Lo que sí está permitido es **mostrar** contenido público con sus
  reproductores oficiales (YouTube, TikTok, Pinterest) y usar fotos y videos
  con licencia libre (Pexels).

### Cómo funciona (mixta)

1. **La IA arma la mezcla.** GPT-6 Luna toma lo que ya se sabe del anuncio
   (negocio, producto, objetivo, fecha, nivel) y propone combinaciones de
   producto y estilo: "pan artesanal + comercial de cine + Día de Difuntos".
   Escribe las búsquedas en español y en inglés (hay más material en inglés).
   El cliente puede quitar o cambiar cada parte, o escribir su propia búsqueda.
2. **Busca en paralelo en cuatro fuentes:**

| Fuente                             | Cómo se busca                                                                                                                 | Cómo se muestra                  | Qué puede hacer la IA con eso                                                          | Costo                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Plantillas Oniric**              | La IA elige del catálogo propio por etiquetas (rubro, objetivo, estilo).                                                      | Ejemplo propio.                  | Usar la receta completa (estructura, prompt, modelo) y el ejemplo como referencia.     | Nada.                                                     |
| **YouTube**                        | YouTube Data API (`search`, solo videos que permiten inserción, búsqueda segura, región Ecuador).                             | Reproductor oficial.             | Solo inspiración: lo que al cliente le gusta se describe con palabras.                 | Gratis: 10.000 unidades al día; cada búsqueda gasta 100.  |
| **TikTok y Pinterest**             | Búsqueda web de OpenAI limitada a `tiktok.com` y `pinterest.com`; con cada enlace, oEmbed de TikTok o el widget de Pinterest. | Reproductor o widget oficial.    | Solo inspiración, igual que YouTube.                                                   | ≈ US$0,01 por búsqueda web (verificar la tarifa vigente). |
| **Fotos y videos libres (Pexels)** | API de Pexels.                                                                                                                | Imagen con el crédito del autor. | **Referencia directa:** se puede pasar a Higgsfield como imagen o video de referencia. | Gratis: 200 consultas por hora y 20.000 al mes.           |

3. **Filtra y ordena.** GPT-6 Luna descarta lo que no sirve leyendo solo los
   títulos y las descripciones (no mira ni descarga los videos ajenos) y deja
   unos 12 resultados, mezclados por fuente.
4. **El tablero guarda solo referencias:** la fuente, el enlace o el id, el
   título y lo que le gusta al cliente ("la luz", "el ritmo"). Nada de internet
   se descarga ni se guarda en Supabase.
5. **Al generar:**
   - lo marcado como "Solo inspiración" se traduce en palabras para el campo
     _estilo_ del prompt;
   - las plantillas Oniric, las fotos del cliente y las fotos de Pexels se suben
     a Higgsfield como referencias (subida directa a Higgsfield, ya hecha en el
     PR #16) en los modelos que las aceptan (Kling O3, Seedance 2.5, MiniMax H3,
     Cinema Studio). En los demás, también se describen con palabras.
6. **Caché:** cada búsqueda se guarda unos días por su combinación (solo los
   datos del resultado, en JSON) para no repetir llamadas. Los datos de
   YouTube se renuevan o se borran a los 30 días, como piden sus políticas.

Si una fuente falla o se agota su cuota, se muestran las demás; las plantillas
Oniric siempre están.

### Cuidados

- **Pexels:** mostrar el enlace a Pexels y el crédito del autor. Como
  referencia directa se prefieren fotos sin personas reconocibles: su licencia
  no permite dar a entender que esas personas recomiendan un producto. Si hay
  personas, la foto solo inspira (se describe con palabras).
- **Reproductores de terceros:** cargan cookies de YouTube, TikTok o
  Pinterest. Hay que mencionarlo en la política de privacidad (pendiente en
  `estado.md`) y permitir esos dominios en la política de contenido del sitio.
- **Moderación:** búsqueda segura, solo dominios permitidos, filtro de texto
  sobre títulos y un botón para reportar.
- Las referencias inspiran: no se copian marcas, personas ni anuncios ajenos
  (manual creativo, principio 7).

## 3. Plantillas y personajes propios

### Plantillas Oniric

Cada plantilla es un estilo de anuncio (la lista de la fase A: comercial de
cine, primer plano que antoja, demostración, POV, detrás de escena, el producto
cobra vida, oferta relámpago, personaje de la marca, creador presentando,
ilustrado o animado). Guarda:

- **estructura:** tomas con tiempos, cámara, sonido y dónde va el texto;
- **receta:** plantilla de prompt, modelo sugerido por nivel y parámetros;
- **ejemplos por rubro**, hechos por Oniric con Higgsfield.

Se empieza con **imágenes clave** (≈ US$0,014 cada una): 10 plantillas por 3
rubros son unos US$0,42. Los videos de ejemplo, solo en las más usadas y
después.

### Personajes Oniric

Un set propio de personajes ficticios, para que un negocio sin personaje pueda
tener uno:

- de 12 a 20 personajes para empezar, por rubro (panadería, belleza,
  servicios), diversos y fieles a Ecuador, sin estereotipos;
- cada uno con una ficha (edad, rasgos, ropa, forma de ser) y un retrato con
  2 o 3 ángulos hechos con Soul 2 (≈ US$0,003 por retrato), que sirven de
  referencia para que salga igual en cada video;
- el cliente lo edita (edad, ropa con su logo, forma de ser) y se guarda en su
  Mi marca. Cada retrato nuevo cuesta 1 crédito (el mínimo por generación);
- siempre adultos, sin parecido con famosos, y nunca presentados como clientes
  reales ni como testimonios (sería publicidad engañosa).

TODO: verificar si la API de Higgsfield permite crear un personaje entrenado
(por ejemplo, Soul ID) o solo pasar sus retratos como referencia.

## 4. Almacenamiento (Supabase gratis)

Supabase Free da 1 GB de archivos, 500 MB de base de datos y 5 GB de
transferencia al mes. El plan:

| Qué                                                            | Dónde                                                                   | Peso estimado                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Resultados de internet y del tablero                           | Solo enlaces y textos en la base de datos.                              | Unos KB por anuncio.                          |
| Ejemplos de las plantillas Oniric (imágenes)                   | Carpeta `public/` de la app (CDN de Vercel), sin pasar por Supabase.    | 30 imágenes WebP de ≈ 300 KB: ≈ 9 MB.         |
| Retratos base de los personajes Oniric                         | Igual que las plantillas.                                               | 20 personajes × 3 ángulos × ≈ 150 KB: ≈ 9 MB. |
| Recetas de las plantillas                                      | Base de datos, editables desde el admin (el repositorio es público).    | Unos KB.                                      |
| Fotos del cliente (producto, Mishi, personajes editados, logo) | Bucket privado de Supabase, comprimidas a WebP de 1.600 px como máximo. | ≈ 200 KB cada una.                            |
| Videos de los anuncios                                         | Bucket privado actual (`ad-outputs`).                                   | De 5 a 15 MB cada uno: es lo que más pesa.    |

Con esto las plantillas y los personajes no consumen la cuota de Supabase. Lo
que la va a llenar son los videos (unos 100 caben en 1 GB). Cuando se acerque,
la opción gratis es mover los resultados a Cloudflare R2 (10 GB sin costo de
transferencia), detrás de `lib/storage`, sin tocar el resto de la app.

## 5. Lo que hay que aprobar

1. El orden del recorrido (sección 1).
2. La búsqueda mixta con las cuatro fuentes y la regla "solo inspiración" vs.
   "referencia directa".
3. El set de personajes Oniric.
4. La imagen de prueba de 3 créditos antes del video.
5. Propuesta: el texto encima del video incluido en el precio.
   TODO(producto): si la voz en off, la música y las búsquedas en internet se
   cobran aparte (cuestan centavos) o van incluidas con un límite por anuncio.
6. El tope de gasto: se reserva el costo estimado antes de enviar; al llegar
   al tope, todas las cuentas vuelven al simulador.
7. La primera lista de plantillas (se puede ajustar sobre los bocetos).

## 6. Fase C: construcción con el simulador

En este orden, cada paso con su PR y sus pruebas, sin gastar saldo real:

1. **Modelo de datos:** perfil de marca, personajes, tableros, plantillas de
   inspiración con receta, caché de búsquedas, gasto del proveedor y lotes de
   evaluación.
2. **Proveedor de texto:** una interfaz `TextProvider` como
   `GenerationProvider`, con GPT-6 Luna y un simulador para desarrollo y
   pruebas. TODO: confirmar el id del modelo y si acepta imágenes;
   `OPENAI_API_KEY` todavía no se ve en esta sesión del entorno de Claude Code
   (hace falta una sesión nueva).
3. **Conversación guiada** con respuestas dinámicas y opciones de respaldo.
4. **Búsqueda de inspiración** con una interfaz por fuente (simuladas en
   pruebas). Claves nuevas: `YOUTUBE_API_KEY` y `PEXELS_API_KEY`, gratis; se
   cargan en Vercel y en el entorno, nunca en el repositorio.
5. **Director creativo:** insight, 3 ideas, guion por tomas y prompt detallado.
6. **Tope de gasto y lote de evaluación** en el admin.
7. **Capa de edición** con Remotion (falta decidir dónde renderizar).

Después, la **fase D**: pruebas pagadas en la app real con la rúbrica.
