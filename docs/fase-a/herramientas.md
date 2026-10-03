# Herramientas: qué puede hacer Oniric por detrás

Investigación de la fase A (octubre de 2026). Precios en USD, de lo que cobra
cada proveedor a Oniric (al cliente se le suma el margen de `lib/billing`).
"Desde" es el precio mínimo: sube con la resolución, el sonido u otras
opciones.

## 1. Higgsfield: modelos disponibles por API

Fuente: el catálogo público de la consola de Higgsfield
(`dash.higgsfield.ai/api/v2/catalog-models/`, consultado el 3 de octubre de
2026). Los parámetros exactos de cada modelo están en su página de la consola
(`console.higgsfield.ai/models/...`), que pide iniciar sesión: hay que
confirmarlos antes de integrar cada modelo.

### Video

| Modelo             | Precio           | Lo que lo hace útil para Oniric                                                             |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------- |
| Kling 3.0 (actual) | US$0,042/s       | Varias tomas en un video y **audio propio**, hasta 15 s. 10 s ≈ US$0,42.                    |
| Wan 3.0            | desde US$0,025/s | El más barato con audio propio, hasta 30 s. 10 s ≈ US$0,25.                                 |
| Wan 2.7            | desde US$0,05/s  | **Personajes que se mantienen iguales** entre escenas, con audio.                           |
| Kling O3           | desde US$0,042/s | Usa **imágenes o videos de referencia**, varias tomas, audio, primer y último cuadro.       |
| MiniMax H3         | US$0,065/s       | 2K, hasta 15 s, con referencias de imagen, **video y audio**.                               |
| LTX 2.5 Fast / Pro | desde US$0,09/s  | **Control de movimiento de cámara**, audio propio.                                          |
| Seedance 2.5       | desde US$0,144/s | Hasta 30 s y **hasta 50 referencias** (fotos, videos y audios), con audio.                  |
| Cinema Studio 4.0  | desde US$0,206/s | De Higgsfield: **dirección de escena automática** de cine, referencias, sonido, hasta 30 s. |
| Genjutsu           | desde US$0,159/s | Toma el **movimiento de un video** y rehace la escena con tus personajes o productos.       |

### Imagen

| Modelo                 | Precio         | Lo que lo hace útil                                                                 |
| ---------------------- | -------------- | ----------------------------------------------------------------------------------- |
| Marketing Studio Image | desde US$0,014 | Fotos de campaña desde la foto del producto, con **modelo de referencia** opcional. |
| Soul 2                 | desde US$0,003 | Retratos realistas: sirve para **crear un personaje ficticio** de la marca.         |
| Ideogram 4.0           | US$0,03        | Imágenes con **texto bien escrito** (afiches, empaques).                            |
| Recraft 4.1            | US$0,035       | Ilustraciones con **la paleta de la marca**.                                        |

Higgsfield también ofrece flujos armados sobre Marketing Studio ("Product
shots", "Graphic ads", "Marketplace design") con presets de composición, luz y
estilo.

### Lo que esto cambia en el plan

- **El audio ya existe dentro de los modelos.** Kling 3.0 genera sonido si se
  activa (hoy lo mandamos apagado), y Cinema Studio genera efectos, voces y
  música en la misma pasada. Falta probar la calidad y si el sonido cambia el
  precio.
- **Sí se puede dar material de inspiración.** Seedance 2.5, Cinema Studio,
  MiniMax H3 y Kling O3 aceptan fotos y videos de referencia; Seedance 2.5 y
  H3, también audio. En Seedance el prompt puede nombrar cada referencia
  ("@Image1 para el producto, @Video1 para el movimiento"). Genjutsu copia el
  movimiento y la cámara de un video que le guste al cliente.
- **Personajes de marca:** se puede crear un personaje una vez (Soul 2, a
  centavos) y usar esa imagen como referencia en cada video (Wan 2.7, Kling
  O3, Seedance), para que salga igual siempre.
- **Elegir modelo por anuncio:** el cliente no elige modelos; Oniric elige el
  adecuado según la idea (barato para un estado de WhatsApp, Cinema Studio
  para un comercial de cine). Encaja con `GenerationProvider`: cada modelo se
  agrega al catálogo sin tocar el resto.

### Con tus US$5 de prueba

Ejemplos: un video de Kling 3.0 de 10 s cuesta ≈ US$0,42, uno de Wan 3.0
≈ US$0,25, y una imagen de Marketing Studio ≈ US$0,014. Alcanza para unos 8
a 10 videos cortos más varias imágenes, no para muchos videos de Cinema
Studio (10 s ≈ US$2,06).

### Cuidados

- Las referencias del cliente (fotos o videos de otros anuncios) se usan como
  inspiración de estilo o movimiento, no para copiar marcas, personas ni
  contenido ajeno. TODO: revisar los términos de Higgsfield sobre derechos del
  material de referencia.
- Las fotos de personas reales requieren su consentimiento (CLAUDE.md §7).

## 2. Audio

| Opción                       | Precio                             | Para qué                                                   |
| ---------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Audio propio del modelo      | incluido o con recargo (verificar) | Ambiente, efectos y voces dentro de la escena.             |
| ElevenLabs (voz)             | US$0,05–0,10 por 1.000 caracteres  | Voz en off en español; 30 s de locución ≈ US$0,02–0,05.    |
| OpenAI gpt-4o-mini-tts (voz) | ≈ US$0,015 por minuto              | Voz en off más barata (verificar acentos en español).      |
| Eleven Music (música)        | US$0,30 por minuto                 | Música original; la licencia comercial requiere plan pago. |

Recomendación: probar primero el audio propio del modelo. Si no alcanza la
calidad o no dice lo que el negocio necesita, agregar voz en off y música en
la etapa de edición (sección 3), donde también se mezcla.

## 3. Edición: texto, motion graphics, voz y música encima del video

No hace falta otra IA para "dibujar": es edición por código. La IA de texto
decide qué decir y con qué estilo; el motor de edición lo arma.

| Motor      | Costo                                                                               | Notas                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remotion   | Gratis hasta 3 empleados; con 4 o más, US$0,01 por render con mínimo de US$100/mes. | Videos con React. **Vista previa en vivo en el navegador**: el cliente ve el texto antes de pagar el render. Hay que resolver dónde renderizar (Vercel tiene límites). |
| Shotstack  | US$0,20–0,40 por minuto renderizado.                                                | API en la nube, sin servidores propios.                                                                                                                                |
| Creatomate | Desde US$41/mes (≈ US$0,28 por minuto en 720p).                                     | API en la nube con plantillas.                                                                                                                                         |
| ffmpeg     | Gratis.                                                                             | Superpone imágenes sobre el video; poco movimiento.                                                                                                                    |

Recomendación: Remotion, por la vista previa en vivo y el control fino de
tipografías y animación. TODO(producto): confirmar cuántas personas tiene
ONIRIASOLUTIONS (define si aplica la licencia gratuita) y elegir dónde
renderizar.

**Ventaja clave:** la capa de edición va encima del video, así que se puede
rehacer las veces que haga falta sobre el mismo video sin volver a pagar a
Higgsfield.

## 4. Modelos de texto (el "director creativo" por dentro)

Precios por millón de tokens, entrada / salida (octubre de 2026):

| Modelo           | Precio         | Nota                         |
| ---------------- | -------------- | ---------------------------- |
| GPT-5 nano       | US$0,05 / 0,40 | El más barato.               |
| GPT-5.4 nano     | US$0,20 / 1,25 | El nano más nuevo de OpenAI. |
| Claude Haiku 4.5 | US$1 / 5       | El más barato de Anthropic.  |

Las tres opciones aceptan imágenes, para leer el tablero de inspiración.
Escribir un brief, tres ideas y un prompt cuesta menos de un centavo con
cualquiera. Como un video cuesta ≈ US$0,42, conviene evaluar también un modelo
mejor solo para el paso de las ideas, donde está la creatividad: sigue siendo
una fracción de centavo frente al video. TODO(producto): decidir con una prueba
a ciegas.

## Fuentes

- [Catálogo de la consola de Higgsfield](https://console.higgsfield.ai/explore)
  y su API pública de catálogo.
- [Documentación de Higgsfield: subida de archivos](https://docs.higgsfield.ai/docs/concepts/file-uploads),
  [FAQ](https://docs.higgsfield.ai/docs/help/faq).
- [Cinema Studio (centro de ayuda de Higgsfield)](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-cinema-studio),
  [Cinema Studio 4.0](https://higgsfield.ai/blog/cinema-studio-4-0),
  [Genjutsu](https://higgsfield.ai/blog/higgsfield-genjutsu).
- [Seedance 2.5: referencias](https://runware.ai/docs/models/bytedance-seedance-2-5).
- [Remotion: licencia y precios](https://www.remotion.dev/docs/license/pricing).
- [Shotstack vs. Creatomate](https://shotstack.io/vs/creatomate-alternatives/),
  [Creatomate vs. Shotstack](https://creatomate.com/compare/shotstack-alternative).
- [Precios de ElevenLabs](https://developer.puter.com/tutorials/elevenlabs-api-pricing/),
  [voz de OpenAI](https://techsy.io/en/blog/best-tts-apis-developers).
- [Precios de Anthropic](https://platform.claude.com/docs/en/about-claude/pricing),
  [precios de OpenAI](https://pricepertoken.com/pricing-page/provider/openai).
