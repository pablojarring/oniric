# Fase A: investigación (octubre de 2026)

Investigación previa al rediseño del flujo creativo, sin código ni gasto. El
objetivo, en palabras del dueño: que un dueño de negocio sin mentalidad de
publicista llegue a anuncios creativos, novedosos y de calidad, que reemplacen
la grabación, la edición y la parte técnica, y que un publicista no pueda
desacreditar ni los resultados ni la app.

## Documentos

| Documento                                          | Qué contiene                                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [manual-creativo.md](./manual-creativo.md)         | Qué enseñan las mejores escuelas creativas, los 8 principios que aplica Oniric, el flujo creativo propuesto y la estructura del prompt detallado. |
| [rubrica.md](./rubrica.md)                         | Rúbrica de evaluación v1, el pipeline de evaluación y el plan de pruebas con dos negocios.                                                        |
| [herramientas.md](./herramientas.md)               | Modelos de Higgsfield con precios (audio, referencias, personajes, cámara de cine), audio, motores de edición y modelos de texto.                 |
| [experiencia-y-marca.md](./experiencia-y-marca.md) | Formulario vs. chat (gana la conversación guiada), Mi marca opcional, personas en el anuncio, plantillas de inspiración y tablero.                |

## Conclusiones

1. **El cliente elige; Oniric crea.** Preguntas simples con respuestas de un
   toque generadas para cada negocio. Por dentro, un "director creativo" (modelo
   de texto) arma el brief, encuentra el insight y propone 3 ideas distintas.
2. **La calidad está en el prompt.** Cada idea se convierte en un guion por
   tomas y un prompt detallado con estructura fija (sujeto, acción, entorno,
   cámara, luz, estilo, sonido y restricciones).
3. **Higgsfield da mucho más de lo que usamos.** Hay modelos con audio propio,
   con referencias de fotos, videos y audio (para el tablero de inspiración),
   con personajes que se mantienen iguales y con dirección de cine. Oniric
   puede elegir el modelo según la idea.
4. **La edición se hace aparte y es barata de repetir.** Texto, motion
   graphics, voz y música van encima del video con un motor de edición
   (Remotion recomendado). No hace falta otra IA para dibujarlos, y se pueden
   rehacer sin volver a pagar el video.
5. **Inspiración de dos formas:** plantillas de estilos de anuncio con video de
   ejemplo (recomendadas por la IA para cada negocio) y un tablero propio con
   fotos, capturas y colores.
6. **Mi marca es opcional.** Se capta lo que el negocio tiene y se pregunta
   más solo si hay algo que explorar (un personaje, un eslogan).
7. **Medir antes de afirmar.** Una rúbrica compartida, un lote de pruebas en
   la app real y la comparación de las notas del dueño y de Claude.

## Decisiones del dueño (3 de octubre de 2026)

- "Mi marca" (perfil, personalidad, colores y personaje opcional) pasa al modo
  pyme, aunque CLAUDE.md lo ubicaba en la fase 2 de empresa.
- Tablero de inspiración por anuncio y también guardado como "Mi estilo".
- Plantillas de inspiración: el cliente puede elegir el estilo de su anuncio
  entre ejemplos.
- Personas: el cliente decide si sale él, otra persona real (con
  consentimiento) o una persona ficticia por descripción.
- Las respuestas de un toque deben ser variadas e innovadoras, nunca estáticas.
- Las pruebas pagadas se hacen en la app real, con Higgsfield activo para
  todas las cuentas y un tope de gasto.
- Segundo negocio de prueba: un salón de belleza ficticio.

Después de revisar la investigación:

- **Manual creativo y rúbrica v1: aprobados.**
- **GPT-6 Luna para todo el texto** (US$0,10 / 0,50 por millón de tokens).
- **Remotion** para la edición: gratis, porque ONIRIASOLUTIONS tiene 1 persona.
  La licencia depende de quien construye la app, no de los clientes.
- **Niveles de calidad:** el cliente decide qué tan pro quiere su anuncio
  (Rápido, Pro, Cine) y ve el precio antes de generar.
- **Ejemplos de las plantillas:** los genera Oniric, con su receta guardada; no
  se toman de la galería de Higgsfield.

## Por decidir

1. Aprobar la primera lista de plantillas de inspiración (estilos de anuncio,
   en [experiencia-y-marca.md](./experiencia-y-marca.md)).
2. Dónde renderizar los videos de Remotion.
3. Audio: empezar por el audio propio del modelo y agregar voz y música solo
   si hace falta.
4. Primeros modelos a integrar: Kling 3.0 con sonido, Wan 3.0 (barato),
   Seedance 2.5 o Kling O3 (referencias), Soul 2 (personajes) y Marketing
   Studio (imágenes). Cinema Studio para el nivel Cine.

## Siguiente: fase B (diseño del flujo)

Bocetos navegables para aprobar antes de programar: Mi marca, objetivo,
material (tablero y personas), ideas, guion y vista previa, edición, y en el
admin el lote de evaluación y el tope de gasto. Antes de integrar cada modelo
hay que confirmar sus parámetros en la consola de Higgsfield.

Hecha en [fase-b/README.md](../fase-b/README.md), con los bocetos para aprobar.
