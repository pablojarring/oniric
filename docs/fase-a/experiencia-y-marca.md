# Experiencia del cliente: conversación guiada, Mi marca y personas

Cómo llegar a la información que necesita el director creativo sin que el
dueño del negocio tenga que pensar como publicista.

## ¿Formulario o chat?

Lo que dice la evidencia:

- **Un chat libre es difícil.** Jakob Nielsen (Nielsen Norman Group) lo llama
  la "barrera de articulación": a mucha gente le cuesta describir por escrito
  lo que quiere con la precisión que necesita una IA. Lo que ayuda: galerías
  de estilos, constructores de prompts, opciones para elegir y reescritura
  automática del pedido.
- **Cuando se sabe qué datos hacen falta, un formulario rinde mejor que un
  chat.** En un chat se pierde el progreso y cuesta revisar lo que se dijo.
- **Una pregunta a la vez reduce el esfuerzo percibido.** Los formularios por
  pasos se completan más que los de una sola página (un análisis de Formstack
  sobre 650.000 envíos encontró un 25 % más). Los números de las empresas que
  venden formularios conversacionales son más altos, pero hay que tomarlos con
  cuidado.

**Conclusión:** ni formulario largo ni chat vacío. Una **conversación guiada**:
la estructura y el progreso de un formulario, con la calidez y la inteligencia
de un chat.

## La conversación guiada

1. **Una pregunta a la vez**, con una barra de progreso visible.
2. **Respuestas de un toque, dinámicas.** Las opciones no son listas fijas: el
   modelo de texto las genera para cada negocio según lo que ya respondió.
   Varían cada vez, son concretas y creativas, y hay un botón para pedir otras
   distintas. Para una panadería de Quito no aparecen las mismas opciones que
   para un salón de belleza de Guayaquil. Si la IA falla, hay opciones de
   respaldo curadas para no dejar al cliente sin respuesta.
3. **Siempre se puede escribir o mandar una nota de voz.** Los dueños de
   negocio en Ecuador usan mucho las notas de voz de WhatsApp. TODO: verificar
   el costo de transcribir audio.
4. **Las preguntas siguientes las decide la IA.** Solo pregunta lo que falta o
   lo que es relevante. Si el dueño menciona algo (un personaje, un eslogan),
   pregunta más sobre eso; si no, no insiste.
5. **Tarjetas visuales cuando se trata de estilo:** ejemplos de luz, encuadre
   o ambiente para tocar, en vez de palabras técnicas.
6. **Resumen editable al final:** "Así entendí tu negocio" o "Así entendí este
   anuncio", con todo a la vista para corregir con un toque.
7. **Nada es obligatorio** salvo lo mínimo para generar. Siempre hay "saltar"
   y "no sé, decide tú".

El costo de la IA en esta conversación es de fracciones de centavo por
anuncio (ver [herramientas.md](./herramientas.md)).

## Mi marca (opcional y por partes)

Se arma la primera vez con unas pocas preguntas y se completa sola con el uso.
Nunca se obliga a crear lo que el negocio no tiene: cada parte ofrece "no
tengo", "ayúdame a definirlo" o "ya lo tengo".

| Parte             | Qué se guarda                                                                                         | Si no lo tiene                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Lo esencial       | Nombre, qué vende, quién le compra, por qué lo eligen, ciudad.                                        | Es lo único que se pide; con eso alcanza.                                               |
| Personalidad      | Hasta 3 palabras (cercano, elegante, divertido, tradicional…), propuestas por la IA según el negocio. | La IA propone y el dueño elige o salta.                                                 |
| Voz               | Cómo le habla a sus clientes (tú o usted, formal o coloquial, palabras propias).                      | Se deduce de un mensaje de ejemplo que el dueño pegue o dicte.                          |
| Visual            | Logo, colores (sacados del logo y las fotos), fotos del local y los productos.                        | Se usan colores neutros y la estética de la idea elegida.                               |
| Elementos propios | Personaje o mascota, eslogan, jingle, alguien que siempre aparece.                                    | Nada. Solo si el dueño lo tiene o lo pide se pregunta más (fotos, cómo es, cómo habla). |
| Lo que no quiere  | Temas, estilos o tonos que no van con el negocio.                                                     | Nada.                                                                                   |
| Mi estilo         | Tableros de inspiración guardados.                                                                    | Se crea al guardar un tablero de un anuncio.                                            |

La página "Mi marca" se puede editar cuando quiera. Los anuncios aprobados
afinan la personalidad y la voz con el tiempo.

## Personas en el anuncio

El cliente elige con un toque:

| Opción            | Cómo funciona                                                                                                                                                                           | Cuidados                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Nadie             | El producto es el protagonista.                                                                                                                                                         | —                                                                                   |
| Yo                | El dueño sube fotos suyas.                                                                                                                                                              | Confirma que es él o ella.                                                          |
| Otra persona real | Fotos de un empleado, un familiar o un cliente.                                                                                                                                         | Confirmación de que esa persona dio su consentimiento (CLAUDE.md §7).               |
| Persona ficticia  | Se describe ("una estilista joven, cálida, de cabello rizado"). La IA crea un retrato (Soul 2, centavos), el dueño lo aprueba y queda guardado como personaje reutilizable de la marca. | Nunca se presenta como cliente real ni como testimonio (sería publicidad engañosa). |

Siempre: sin famosos ni menores de edad, y moderación de las fotos.

## Plantillas de inspiración (estilos de anuncio)

Además del tablero, el cliente puede elegir **cómo quiere que sea su anuncio**
entre plantillas de inspiración, cada una con un video de ejemplo. No es un
menú fijo: la IA recomienda primero las 3 o 4 que mejor encajan con el negocio
y el objetivo, y se puede ver la galería completa.

Cada plantilla define una estructura probada (tomas, ritmo, cámara, sonido y
dónde va el texto), que el director creativo adapta al negocio. Primera lista
para discutir:

| Plantilla               | Cómo es                                                                                                           | Ideal para                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Comercial de cine       | Producto como héroe, cámara lenta, luz cuidada, cierre con la marca.                                              | Marca, lanzamientos.             |
| Primer plano que antoja | Texturas, vapor, crujidos, detalles en macro (estilo ASMR).                                                       | Comida y bebida, belleza.        |
| Demostración            | Cómo se usa o cómo queda, paso a paso y rápido.                                                                   | Productos, servicios.            |
| Punto de vista (POV)    | Cámara en primera persona, como si el cliente lo viviera.                                                         | Experiencias, locales.           |
| Detrás de escena        | Cómo se hace, el local, el oficio, la historia del negocio.                                                       | Panaderías, talleres, artesanos. |
| El producto cobra vida  | El producto se mueve, se arma o "actúa" (estilo stop motion).                                                     | Productos pequeños, humor.       |
| Oferta relámpago        | Ritmo rápido, cuenta regresiva, precio protagonista (en la capa).                                                 | Promociones, fechas.             |
| Personaje de la marca   | La mascota o el personaje guardado en Mi marca protagoniza.                                                       | Negocios con personaje.          |
| Creador presentando     | Una persona (real con consentimiento o ficticia) muestra el producto a cámara, sin presentarse como clienta real. | Belleza, moda, servicios.        |
| Ilustrado o animado     | Estilo dibujado con la paleta de la marca.                                                                        | Servicios difíciles de filmar.   |

- Los videos de ejemplo los generamos nosotros una vez por plantilla (y por
  rubro, para que se vean cercanos); no se usan anuncios ni marcas ajenas.
- Una plantilla puede combinarse con el tablero: la plantilla da la estructura
  y el tablero, el estilo.
- Cada plantilla sugiere el modelo de Higgsfield adecuado (por ejemplo, Cinema
  Studio o LTX para cine, Kling o Wan para lo rápido).

## Tablero de inspiración

Por anuncio, y guardable como "Mi estilo":

- Una cuadrícula simple: agregar fotos o capturas, tocar estilos de una galería
  curada, elegir colores.
- La IA lo lee y lo resume en etiquetas editables ("luz cálida", "cámara
  lenta", "tonos terracota").
- Según el modelo elegido, las referencias se pasan como imágenes o videos de
  referencia (Seedance 2.5, Cinema Studio, MiniMax H3, Kling O3) o se traducen
  en palabras para el prompt.
- Las referencias inspiran: no se copian marcas, personas ni anuncios ajenos.

## Fuentes

- [La barrera de articulación (Jakob Nielsen)](https://jakobnielsenphd.substack.com/p/prompt-driven-ai-ux-hurts-usability)
- [Si es un formulario, que siga siendo formulario](https://uxplanet.org/ai-chat-or-not-if-its-a-form-it-should-stay-a-form-0294c59332d6)
- [Formularios conversacionales y tradicionales](https://orbitforms.ai/blog/conversational-forms-vs-traditional-forms)
