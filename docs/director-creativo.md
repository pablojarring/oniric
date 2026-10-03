# Director creativo

`lib/creative/` es el corazón del flujo creativo nuevo (fase C, tramo 1). Lleva
la conversación guiada, arma el brief, propone el insight y 3 ideas, y escribe
el guion por tomas con los prompts para Higgsfield. Usa el
[proveedor de texto](./proveedor-de-texto.md): GPT-6 Luna, o el simulador en
desarrollo y tests.

Este paso incluye solo la lógica y los datos. Las pantallas llegan en el
siguiente PR, y la imagen de prueba, el video y el precio en el paso 3.

## Recorrido de una sesión

| Estado         | Qué pasa                                                                           | Función del servicio                                                       |
| -------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `conversation` | Una pregunta a la vez, con 3 a 5 respuestas de un toque generadas para el negocio. | `startCreativeSession`, `answerCreativeTurn`, `resumeCreativeConversation` |
| `briefed`      | La conversación terminó y hay brief. El dueño elige el nivel.                      | `setCreativeTier`                                                          |
| `ideas`        | Insight y 3 ideas con ángulos distintos. Se pueden pedir otras 3.                  | `generateCreativeIdeas`                                                    |
| `scripted`     | Guion de la idea elegida, con sus prompts. Se puede revisar con un pedido.         | `chooseCreativeIdea`, `reviseCreativeScript`                               |

## Tareas del modelo

Cada tarea está en `lib/creative/tasks/`, con sus instrucciones, su esquema de
salida (`lib/creative/schemas.ts`) y su respuesta para el simulador.

- **`conversation_turn`**:
  - la primera pregunta es siempre el objetivo;
  - después pregunta solo lo que falta (producto, qué lo hace especial y, si
    sirve, oferta o público);
  - si el dueño menciona algo propio de su marca (una mascota, un personaje,
    un eslogan), pregunta una vez si quiere usarlo y guardarlo;
  - nunca impone personalidad ni personajes;
  - cierra con el brief después de 6 preguntas como máximo.
- **`creative_ideas`**:
  - un insight (una verdad sobre quien compra) y 3 ideas con ángulos
    distintos, cada una con título, idea en una frase, cierre y cómo se vería;
  - cada idea trae su autoevaluación con la rúbrica (gancho, relevancia y
    originalidad);
  - al pedir otras, se evitan los títulos anteriores.
- **`creative_script`**:
  - tomas seguidas que suman la duración del nivel, con acción, cámara,
    sonido y texto de la capa de edición;
  - el prompt detallado por partes (sujeto, acción, entorno, cámara, luz,
    estilo, sonido y restricciones), el prompt del video y el del primer
    cuadro, en inglés;
  - las restricciones siempre piden que no haya texto dentro del video,
    dejar las zonas libres según el formato, sin marcas ajenas ni personas
    reales;
  - las tomas se ordenan y ajustan a la duración aunque el modelo se desvíe
    (`normalizeShots`).

Reglas comunes:

- El cliente lee todo en su idioma (español neutro natural en Ecuador, con
  "tú", o portugués de Brasil).
- Se usan solo hechos del dueño, sin inventar precios, descuentos ni promesas:
  la publicidad engañosa es ilegal.
- Lo que escribe el cliente va marcado como datos y nunca se sigue como
  instrucción, contra la inyección de prompts.

## Niveles

`lib/creative/tiers.ts` define la duración y las tomas máximas del guion:

| Nivel  | Duración | Tomas máximas |
| ------ | -------- | ------------- |
| Rápido | 10 s     | 2             |
| Pro    | 10 s     | 4             |
| Cine   | 15 s     | 6             |

Cine llega a 30 s cuando se integren Cinema Studio o Seedance. El modelo y el
precio de cada nivel llegan en el paso 3.

## Datos

- **`creative_sessions`** guarda:
  - la organización y quién la creó;
  - el estado, el idioma, la fecha comercial, el formato y el nivel;
  - las preguntas con sus respuestas (`turns`), el brief, las ideas (con su
    tanda y los títulos anteriores), la idea elegida y el guion (con las
    revisiones pedidas).
- **`text_usage`** registra cada pedido al proveedor de texto: tarea, modelo,
  tokens y costo. De ahí salen el costo de la "preparación" de cada anuncio
  (`sessionTextCostMicroUsd`), el límite de uso y, en el paso 4, el tope de
  gasto en OpenAI.

## Cuidados

- **Propiedad:** cada función verifica que la sesión sea de la organización.
- **Moderación:** el texto libre del dueño (respuestas y cambios al guion) pasa
  por `moderateText` y tiene un máximo de 500 caracteres.
- **Límite de uso:** 120 pedidos de texto por organización y por hora.
- **Respuestas simultáneas:** si dos respuestas llegan a la vez, la segunda
  falla con `conflict` en vez de pisar a la primera.
- **Fallas del modelo:** si el proveedor falla después de una respuesta, la
  respuesta queda guardada y `resumeCreativeConversation` pide la siguiente
  pregunta.

Los errores son `CreativeFlowError` con un código: `notFound`, `invalidState`,
`invalidAnswer`, `moderation`, `rateLimited`, `conflict` o `providerFailed`.
