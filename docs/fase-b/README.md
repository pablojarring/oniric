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

| #   | Pantalla           | Qué hace                                                                                                                                                                                   |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Inicio             | "Crear anuncio", la próxima fecha comercial y el avance de Mi marca.                                                                                                                       |
| 2   | Objetivo           | Primera pregunta, con respuestas de un toque generadas para el negocio, "Otras ideas", "No sé, decide tú", texto libre y nota de voz.                                                      |
| 3   | Conversación       | La IA pregunta solo lo que falta. Si el dueño menciona algo propio (en el ejemplo, Mishi, el gato de la panadería), pregunta si quiere usarlo y si lo guarda en Mi marca.                  |
| 4   | ¿Qué tan pro?      | Rápido, Pro o Cine, con el rango de créditos, la recomendación del director creativo y cuántos anuncios alcanzan con el saldo.                                                             |
| 5   | Inspiración        | Búsqueda que mezcla el producto con un estilo (sección 2): plantillas Oniric, videos de internet y fotos libres.                                                                           |
| 6   | Plantilla Oniric   | Ejemplo hecho por Oniric, cómo está armada por tomas y cómo se adapta al producto del cliente.                                                                                             |
| 7   | Tablero            | Lo guardado, "¿qué te gusta de este video?" (luz, cámara, ritmo, colores, sonido), las etiquetas que entendió la IA y "Guardar como Mi estilo".                                            |
| 8   | ¿Quién sale?       | Nadie, el personaje de la marca, yo, otra persona real (con confirmación de consentimiento) o una persona ficticia.                                                                        |
| 9   | Personajes Oniric  | Set propio de personajes ficticios, editables (edad, ropa, forma de ser) y reutilizables (sección 3).                                                                                      |
| 10  | Mi marca           | Opcional y por partes: lo esencial, personalidad, voz, logo y colores, personajes y lo propio, lo que no va, Mi estilo. Cada parte ofrece "No tengo", "Ayúdame" o "Ya lo tengo".           |
| 11  | Ideas              | El insight para confirmar con un toque y 3 ideas distintas (con humor, emotiva, demostración) con su cierre y precio.                                                                      |
| 12  | Guion              | Guion por tomas con tiempo, acción, cámara, sonido y texto; cambios por texto o voz; "Para curiosos" muestra lo que se le pide a la IA.                                                    |
| 13  | Imagen de prueba   | El primer cuadro del video, hecho con Higgsfield (3 créditos) y con marca de agua, con la animación del texto encima, ajustes de un toque y el precio final (sección 7).                   |
| 14  | Edición            | Motion graphics que responden al video (título detrás del sujeto, garabatos, etiquetas, cierre), voz en off, música y llamado a la acción. Cambiar el texto no cobra el video (sección 8). |
| 15  | Admin: tope y lote | Tope de gasto en Higgsfield con su interruptor, aviso al 80 %, costo real del mes y el lote de pruebas con las notas del dueño y de Claude.                                                |
| 16  | Admin: rúbrica     | Calificación con los 10 criterios, nota ponderada en vivo, nota de Claude al lado, criterios que difieren en más de 1 punto, ética y "¿lo publicarías?".                                   |

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
   - lo marcado como "Solo inspiración" se traduce en una ficha visual para el
     prompt y para la imagen de prueba (sección 6);
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

## 5. Decisiones del dueño sobre los bocetos (3 de octubre de 2026)

- **Aprobado:** el orden del recorrido, la búsqueda mixta y los personajes
  Oniric.
- **Condición para la búsqueda:** las referencias de internet tienen que
  llegar bien interpretadas al modelo, no solo como palabras sueltas: que
  sirvan de verdad como referencia (sección 6).
- **Imagen de prueba:** preocupa que no haga justicia al video y que el
  cliente se vaya. Debe venir de Higgsfield y con marca de agua (sección 7).
- **Edición:** se quiere el nivel de un programa de edición profesional, con
  motion graphics que respondan al video, como la demo de Higgsfield con
  Claude Opus 5.5 y After Effects (sección 8).
- **Cobro:** el texto y la edición van incluidos, pero se cobran al cliente
  dentro del precio en créditos. Nunca es un costo que Oniric absorbe
  (sección 9).
- Después (mismo día): **aprobados** la lista de plantillas y los estilos de
  animación, más cinco estilos nuevos (psicodélico, nueva era, clásico,
  hogareño y estilo TikTok). Topes: Higgsfield US$15 (ya cargados en la API) y
  OpenAI US$10. El recálculo de precios, el audio con ElevenLabs v4 y la
  comparación entre créditos y suscripción están en
  [precios.md](./precios.md).

## 6. Que las referencias de internet sirvan de verdad

Una referencia ajena no se puede descargar ni pasar tal cual a Higgsfield
(sección 2). Para que igual llegue completa al modelo, se hace en dos pasos:

1. **Ficha visual.** Cuando el cliente guarda una referencia, el modelo de texto
   mira su imagen de vista previa (la miniatura que la plataforma muestra), sin
   guardarla, y escribe una ficha detallada:
   - luz: tipo, dirección y hora ("cálida, de lado, como de amanecer");
   - color: paleta con sus códigos;
   - encuadre y composición: plano, ángulo, dónde está el producto;
   - movimiento y ritmo: lo que se deduce de la imagen, el título y la
     descripción;
   - ambiente, texturas y estilo de texto, si lo hay.

   El cliente la ve como etiquetas y marca qué quiere tomar ("la luz", "el
   ritmo").

2. **Referencia puente.** Con la ficha, la plantilla, la foto del producto y Mi
   marca, Oniric genera **su propia imagen** con Higgsfield: la imagen de prueba
   (sección 7). Esa imagen sí es nuestra y entra al modelo de video como
   referencia visual. Así la inspiración externa llega al video como imagen,
   no solo como texto, sin copiar nada ajeno.

Cuidados:

- TODO(legal): confirmar en los términos de YouTube, TikTok y Pinterest que se
  puede analizar la miniatura con IA sin guardarla. Las políticas de YouTube
  prohíben descargar, guardar o modificar su contenido audiovisual y limitan los
  datos guardados a 30 días; no mencionan el análisis con IA. Si no se permite,
  la ficha se arma con el título, la descripción y las respuestas del cliente,
  o con una captura que el cliente suba él mismo.
- TODO: confirmar que GPT-6 Luna acepta imágenes. Si no, la ficha la escribe
  otro modelo barato que sí las acepte (por ejemplo, GPT-5 nano).

## 7. Imagen de prueba: el primer cuadro del video

- **Viene de Higgsfield** (Marketing Studio Image, ≈ US$0,014, 3 créditos) con
  la foto del producto, la ficha visual y la plantilla.
- **Es el primer cuadro del video:** el video se genera a partir de esa imagen
  (Kling 3.0 de imagen a video ya recibe la imagen inicial en la integración
  actual). Lo que el cliente aprueba es exactamente lo que se anima, así que la
  imagen no puede quedar por debajo del video.
- **Con marca de agua:** el cliente ve una versión reducida (≈ 540 px) con
  "Oniric · vista previa" repetido encima, hecha en el servidor. El original
  limpio queda en el bucket privado y solo se usa para generar el video. Una
  página web no puede impedir una captura de pantalla; la marca de agua y la
  baja resolución hacen que la captura no sirva.
- **Vista animada gratis:** sobre la imagen se reproduce la animación del texto
  y un movimiento suave de cámara (Remotion Player, en el navegador, sin
  costo), para que el cliente vea cómo va a quedar antes de pagar el video.
- Cada imagen nueva cuesta 3 créditos. Se puede saltar e ir directo al video.

## 8. Motion graphics que responden al video

### La referencia: Higgsfield con Claude Opus 5.5

En la demo, un diseño editorial animado ("Best Album '26"):

- tipografía enorme y condensada;
- el título pasa detrás y delante de la persona (la persona está recortada en
  su propia capa);
- un garabato a mano en verde lima;
- etiquetas y textos pequeños de revista;
- íconos 3D cromados;
- una cámara que se acerca y se inclina sobre la composición.

Se hizo con el MCP de Higgsfield y su plugin de After Effects: Claude genera las
imágenes, quita fondos, arma la composición, anima las capas y entrega un
proyecto `.aep` editable.

Eso necesita After Effects de escritorio, el plugin instalado y una cuenta de
Higgsfield, así que no se puede correr en un servidor para cada cliente. El
equivalente de Oniric es **Remotion**: la composición también es editable (son
datos y código), se ve en vivo en el navegador y se renderiza en un servidor.

### Cómo se hace en Oniric

1. **Análisis del video** (después de generarlo):
   - cortes y tiempos de cada toma (ffmpeg);
   - un cuadro cada medio segundo, leído por el modelo de texto: dónde está el
     sujeto, qué zonas quedan libres en cada momento, colores dominantes y los
     momentos sin acción para el texto;
   - **recorte del sujeto** en cada cuadro (una máscara), para poner el título
     detrás del sujeto como en la demo y que nada tape la cara ni el producto.
2. **Plan de animación.** El modelo de texto elige y ajusta piezas de una
   **biblioteca propia de animaciones hechas por diseñadores**:
   - tipografía cinética;
   - garabatos y subrayados a mano;
   - etiquetas y bloques editoriales;
   - stickers e íconos;
   - llamadas que señalan el producto;
   - precios y cuentas regresivas;
   - cierre con el logo.

   Cada pieza entra con los cortes de la toma, en las zonas libres, con los
   colores del video y de Mi marca. La IA dirige, no dibuja: por eso no se ve
   como un diseño hecho por IA.

3. **Vista en vivo y cambios:** el cliente cambia el texto o el estilo y lo ve
   al instante en el navegador.
4. **Render final** en un servidor con Remotion.

Estilos de animación aprobados: **Portada de revista** (como la demo), **De
barrio** (rótulo pintado a mano) y **Oferta relámpago** (rápido, precio y cuenta
regresiva), más **Psicodélico**, **Nueva era**, **Clásico**, **Hogareño** y
**Estilo TikTok**. Detalle y tipografías en [precios.md](./precios.md), sección 7.

### Costo por anuncio de 10 s (al proveedor)

| Paso                      | Herramienta                                                                           | Costo aproximado                        |
| ------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| Cortes y tiempos          | ffmpeg, en el mismo servidor del render                                               | US$0                                    |
| Lectura de cuadros y plan | Modelo de texto con imágenes                                                          | menos de US$0,015                       |
| Recorte del sujeto        | API de recorte de video (Bria en fal.ai: US$0,0042 por segundo; otras, hasta US$0,01) | US$0,04 a 0,10                          |
| Render (hasta 3)          | Remotion Lambda (en su ejemplo, ≈ US$0,02 por minuto de video)                        | menos de US$0,01                        |
| Voz en off (opcional)     | ElevenLabs u OpenAI                                                                   | US$0,02 a 0,05                          |
| **Total**                 |                                                                                       | **≈ US$0,07 a 0,18 (14 a 36 créditos)** |

- TODO: ver en la consola de Higgsfield si su API ofrece recorte de fondo,
  voz, música y efectos (su MCP los tiene). Sería una sola cuenta para todo.
- Por decidir: dónde renderizar. Recomendación: Remotion Lambda (cuenta de
  AWS, se paga por uso y Remotion estima el costo antes de cada render).

## 9. Cómo se cobra la edición

- **La edición es una parte más del precio** en `lib/billing`: su costo
  estimado (análisis, recorte, hasta 3 renders y la voz o la música si se
  eligen) pasa por los mismos factores que el video (ISD, banco y margen). Se
  reserva con el video y se reembolsa si falla. Oniric nunca la absorbe.
- **Por costo, no por porcentaje del video.** El costo de la edición depende de
  los segundos y de las opciones, no del modelo de video. Un porcentaje fijo
  cobraría de más en Cine: el 10 % de 1.252 créditos son 125 créditos por la
  misma edición que en Rápido cuesta unos 13. Si el dueño prefiere un
  porcentaje mínimo, se agrega como ajuste en el admin.
- **Al cliente, un solo precio** con "¿Qué incluye?" (video, animación del texto
  adaptada al video, hasta 3 cambios del texto), sin montos por partida. El
  desglose queda en el admin y en el registro de créditos.
- **Cambios:** cambiar el texto nunca vuelve a cobrar el video ni el análisis.
  Los 3 primeros renders están incluidos; desde el cuarto, ≈ 2 créditos cada
  uno en un video de 10 s.
- **Preparación** (propuesta, con la misma regla): la conversación, las
  búsquedas en internet y las fichas visuales cuestan de US$0,01 a 0,03 por
  anuncio. Se suman al precio de cada anuncio como un componente fijo pequeño,
  en vez de cobrarse aparte.

Ejemplo, Pro de 10 s: video ≈ 86 créditos + edición ≈ 13 = **≈ 99 créditos**,
más la imagen de prueba (3).

## 10. Fase C por tramos: cuándo se puede probar

Cada paso es un PR con sus pruebas, construido con el simulador y sin gastar
saldo real. Al final de cada tramo hay una ronda de **pruebas pagadas en la app
real** (fase D) con la rúbrica, dentro de los topes de cada proveedor. El
asistente actual de 3 pasos sigue funcionando hasta que el flujo nuevo lo
reemplace.

**Tramo 1: la creatividad y el video** (la primera prueba pagada)

1. `TextProvider` (GPT-6 Luna y su simulador). Hecho: el modelo es
   `gpt-6-luna` y acepta imágenes y salidas estrictas
   ([proveedor-de-texto.md](../proveedor-de-texto.md)).
2. Datos de las sesiones creativas, conversación guiada con respuestas
   dinámicas, y director creativo: insight, 3 ideas, guion por tomas y prompt
   detallado. En dos PRs: primero la lógica
   ([director-creativo.md](../director-creativo.md)), después las pantallas.
3. Imagen de prueba como primer cuadro (con marca de agua), video con Kling (ya
   integrado) y el precio nuevo con preparación y edición.
4. Topes de gasto por proveedor y lote de evaluación en el admin.

→ **Ronda 1:** se activa `HIGGSFIELD_API_KEY` en Vercel y se prueba la
Panadería La Esquina. El texto todavía va encima sin motion graphics.

**Tramo 2: motion graphics y voz**

5. Remotion: biblioteca con los 3 primeros estilos y vista en vivo.
6. Análisis del video, recorte del sujeto y render en Remotion Lambda.
7. Voz con ElevenLabs v4 y los 5 estilos nuevos.

→ **Ronda 2:** los mismos anuncios, ahora con edición profesional.

**Tramo 3: inspiración y marca**

8. Búsqueda mixta y fichas visuales.
9. Mi marca, personajes Oniric y tablero.

→ **Ronda 3:** Estudio Brillo, con la estilista ficticia y un tablero.

**Tramo 4: antes de vender**

10. Planes, barra de uso y prueba gratis. Primero con la Suscripción Recurrente
    de Payphone Business y acreditación manual.
11. Cobro automático con la tokenización de Payphone.

La música se decide después de las rondas 1 y 2.

**Lo que el dueño tendrá que cargar, y cuándo** (Claude avisa en su momento):

| Tramo | Qué                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------- |
| 1     | Nada nuevo: `OPENAI_API_KEY` ya está en Vercel. Al final, activar `HIGGSFIELD_API_KEY` en Vercel. |
| 2     | Cuenta de AWS para Remotion Lambda; si hace falta, claves de recorte de video o de ElevenLabs.    |
| 3     | `YOUTUBE_API_KEY` y `PEXELS_API_KEY`.                                                             |
| 4     | Pedir a Payphone la aprobación de la tokenización.                                                |

## Fuentes

- [Higgsfield y Claude: proyectos de After Effects editables](https://alphasignal.ai/news/higgsfield-lets-claude-build-fully-editable-after-effects-projects)
  y [MCP de Higgsfield](https://higgsfield.ai/blog/Generate-AI-Videos-From-Claude-with-Higgsfield-MCP).
- [Remotion Lambda: ejemplo de costo](https://remotion.dev/docs/lambda/cost-example).
- [Recorte de fondo de video en fal.ai](https://fal.ai/learn/tools/best-background-remover-apis-2026).
- [Políticas para desarrolladores de YouTube](https://developers.google.com/youtube/terms/developer-policies).
