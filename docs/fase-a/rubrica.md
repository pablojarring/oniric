# Rúbrica de evaluación v1 y pipeline de pruebas

Versión para acordar entre el dueño y Claude. Sirve para calificar cada
anuncio de prueba con el mismo criterio, comparar versiones de prompts y
decidir qué pasa a producción.

## Rúbrica

Cada criterio se califica de 1 a 5. La nota final es el promedio ponderado.

| #   | Criterio                           | Peso | 1 (rehacer)                                     | 3 (aceptable)                               | 5 (excelente)                                      |
| --- | ---------------------------------- | ---- | ----------------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| 1   | **Mensaje claro**                  | 15   | No se entiende qué ofrecen ni qué hacer.        | Se entiende con esfuerzo o al final.        | En 3 s queda claro qué es y qué hacer.             |
| 2   | **Gancho inicial**                 | 10   | Los primeros 2 s no detienen a nadie.           | Arranca bien pero sin sorpresa.             | Los primeros 2 s obligan a mirar.                  |
| 3   | **Relevancia**                     | 10   | Genérico: serviría para cualquier negocio.      | Se dirige al público, sin un insight claro. | Toca una verdad del cliente del negocio.           |
| 4   | **Originalidad**                   | 10   | Cliché o "hecho por IA" evidente.               | Correcto, ya visto.                         | Idea fresca que se recuerda.                       |
| 5   | **Producto protagonista y fiel**   | 15   | No se ve el producto o está deformado.          | Se ve, pero no luce o cambia detalles.      | Es la estrella y se ve igual que en la foto.       |
| 6   | **Calidad de imagen y movimiento** | 15   | Deformaciones, manos o caras raras, saltos.     | Detalles menores que se notan.              | Parece filmado por profesionales.                  |
| 7   | **Texto y diseño**                 | 5    | Texto ilegible o deformado; tapa lo importante. | Legible, sin estilo.                        | Legible, con estilo y en zona segura.              |
| 8   | **Audio**                          | 10   | Molesta, no corresponde o no se entiende.       | Correcto, plano.                            | Suma: ambiente, voz o música acordes.              |
| 9   | **Coherencia de marca**            | 5    | Contradice la marca (tono, colores).            | Neutro.                                     | Se reconoce la marca sin ver el logo.              |
| 10  | **Formato y plataforma**           | 5    | Formato o duración equivocados.                 | Sirve, sin aprovechar la red.               | Hecho para la red: ritmo, encuadre, zonas seguras. |

Además, dos preguntas que no promedian:

- **Ética (pasa o no pasa).** Sin publicidad engañosa, con consentimiento de
  las personas, sin marcas ajenas, sin estereotipos ofensivos. Si no pasa, el
  anuncio no se publica, sin importar la nota.
- **¿Lo publicarías tal cual?** Sí / con ajustes / no. Es la señal más
  importante del mundo real.

**Lectura de la nota:** 4,0 o más, publicable; de 3,0 a 3,9, ajustar; menos
de 3,0, rehacer.

### Quién califica qué

- **El dueño:** todos los criterios.
- **Claude:** todos menos el audio (no puede escucharlo). El movimiento lo
  juzga por cuadros, así que en el criterio 6 manda la nota del dueño. Para
  comparar, la nota de Claude se calcula sin el criterio 8.

## Pipeline de evaluación

1. **Lote de pruebas.** Cada anuncio de prueba se genera en la app real y
   queda en un lote del panel de admin, con su idea, prompt, modelo y costo.
2. **Presupuesto antes de gastar.** Antes de generar, el lote muestra el costo
   estimado de cada anuncio y el total.
3. **Calificación del dueño** en el mismo panel, con esta rúbrica.
4. **Calificación de Claude.** El dueño pasa el enlace del lote. Claude
   descarga los videos, saca un cuadro por segundo y una hoja de contactos, lee
   el guion y el prompt, y califica.
5. **Comparación.** Tabla con las dos notas lado a lado. Donde difieren en más
   de 1 punto, se conversa: se ajusta la rúbrica, el prompt o la idea.
6. **Registro.** Cada ronda queda en `docs/evaluaciones/<fecha>.md`.

## Plan de pruebas (borrador)

Se prueban escenarios distintos, no repeticiones. Las ideas concretas las
genera el propio flujo de Oniric: eso es lo que se está probando.

**Negocio 1: Panadería La Esquina (Quito).**

1. Oferta del día (imagen) con foto del producto.
2. Estado de WhatsApp de 10 s con foto.
3. Comercial de marca con estilo de cine.
4. Temporada: Día de Difuntos (colada morada y guaguas de pan).
5. Con el dueño en el video (persona real, fotos propias).

**Negocio 2 (ficticio): Estudio Brillo, salón de belleza en Guayaquil.**

1. Promoción de un servicio.
2. Una estilista ficticia creada por descripción y reutilizada como personaje.
3. Con un tablero de inspiración.
4. Imagen para redes del servicio estrella.

Cuidado: nada de "antes y después" generado por IA presentado como real (sería
engañoso).

**Presupuesto:** con US$5, unos 8 videos de 10 s con Kling 3.0 (≈ US$0,42
cada uno) más las imágenes (≈ US$0,014 cada una). Los modelos caros (Cinema
Studio ≈ US$2 por 10 s) solo si el dueño decide gastar más.
