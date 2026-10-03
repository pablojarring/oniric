# Director creativo

`lib/creative/` es el corazón del flujo creativo nuevo (fase C, tramo 1). Lleva
la conversación guiada, arma el brief, propone el insight y 3 ideas, y escribe
el guion por tomas con los prompts para Higgsfield. Usa el
[proveedor de texto](./proveedor-de-texto.md): GPT-6 Luna, o el simulador en
desarrollo y tests.

La lógica y los datos llegaron en el PR #23, las pantallas en el PR #24 y las
decisiones del dueño sobre ellas (notas de voz, corregir el brief, otras
respuestas, confirmar el insight y ¿Quién sale?) en el PR #25. La imagen de
prueba, el video, el precio y la foto del producto llegan en el paso 3.

## Recorrido de una sesión

| Estado         | Qué pasa                                                                           | Función del servicio                                                       |
| -------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `conversation` | Una pregunta a la vez, con 3 a 5 respuestas de un toque generadas para el negocio. | `startCreativeSession`, `answerCreativeTurn`, `resumeCreativeConversation` |
| `briefed`      | La conversación terminó y hay brief. El dueño elige el nivel.                      | `setCreativeTier`                                                          |
| `ideas`        | Insight y 3 ideas con ángulos distintos. Se pueden pedir otras 3.                  | `generateCreativeIdeas`                                                    |
| `scripted`     | Guion de la idea elegida, con sus prompts. Se puede revisar con un pedido.         | `chooseCreativeIdea`, `reviseCreativeScript`                               |

## Pantallas

Son del modo guiado (flag `creativeDirector` en `lib/segment`). Los textos
están en `messages/*.json`, en el espacio `Director`, en español y portugués.

- **Entrada:** una tarjeta "Nuevo · Beta" en el inicio ("Crea tu anuncio con
  el director creativo") lleva a `/director`. Cuando el director haga videos,
  "Crear anuncio" llevará siempre aquí y el asistente viejo de 3 pasos se
  quitará después de la ronda 1 (decisión del dueño).
- **`/director`:**
  - se elige el formato (9:16, 1:1 o 16:9) y se empieza;
  - acepta `?season=` del calendario comercial;
  - debajo están las últimas 5 sesiones para retomarlas
    (`listCreativeSessions`).
- **`/director/[id]`:** arriba van los 4 pasos (Cuéntame, Nivel, Ideas y
  Guion) y debajo, la pantalla del estado de la sesión:
  - **Conversación**, como un chat:
    - la pregunta con sus respuestas de un toque, y "Otras respuestas" para
      pedir opciones distintas (`refreshTurnOptions`);
    - texto propio (Enter envía) o una **nota de voz** de hasta 30 s: se
      transcribe y el texto queda en la caja para revisarlo antes de enviar;
    - "No sé, decide tú" y "Saltar";
    - las respuestas anteriores quedan arriba;
    - si el proveedor falla después de guardar la respuesta, aparece un
      mensaje al estilo de Claude ("algo salió mal de nuestro lado, inténtalo
      de nuevo en unos minutos") y "Reintentar".
  - **Nivel:**
    - lo que entendió el director (el brief), que el dueño puede **corregir a
      mano** antes de pedir las ideas (`updateCreativeBrief`): los textos, las
      listas de incluir y evitar, y qué elementos de la marca se usan;
    - Rápido, Pro (recomendado) o Cine;
    - **¿Quién sale?** (versión simple): que decida el director, nadie (solo
      el producto), el personaje de la marca (si el brief tiene uno), el
      dueño o una persona ficticia (`setCreativeSettings`).
  - **Ideas:**
    - el insight, que el dueño **confirma con un toque** o rechaza con "No
      del todo": entonces el director busca otra verdad y propone 3 ideas
      nuevas (`answerCreativeInsight`);
    - las 3 ideas con su ángulo y "Otras 3 ideas".
  - **Guion:**
    - las tomas con sus tiempos, cámara, sonido y texto en pantalla, y el
      cierre;
    - "Para curiosos", con las partes del prompt en inglés;
    - se puede pedir un cambio (escrito o con nota de voz) o elegir otra
      idea;
    - el paso siguiente (imagen de prueba) aparece como "Muy pronto".
- **Acciones** (`lib/creative/actions.ts`):
  - validan lo que llega del navegador y llaman al servicio;
  - refrescan la página, que vuelve a leer la sesión, también cuando fallan,
    porque una respuesta puede haber quedado guardada;
  - la nota de voz no cambia la sesión: el texto vuelve a la pantalla;
  - los prompts completos del video y del primer cuadro no se mandan al
    navegador.

### ¿Quién sale?

`featuringRule` (`lib/creative/context.ts`) le dice a las ideas y al guion
quién puede salir:

| Elección                 | Regla para el modelo                                                               |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Que decida el director   | Solo el producto o personas adultas ficticias, nunca como clientes reales.         |
| Nadie, solo el producto  | Sin personas en cuadro; solo manos trabajando.                                     |
| El personaje de la marca | El personaje del brief (mascota o personaje), igual en cada toma.                  |
| Tú (el dueño)            | El dueño sale, descrito sin inventar rasgos: su foto se pide en el paso 3.         |
| Una persona ficticia     | Personas adultas ficticias, nunca presentadas como clientes reales ni testimonios. |

En todos los casos: sin famosos ni marcas ajenas. "Otra persona real", con su
consentimiento, y los personajes Oniric llegan en el tramo 3.

El costo de texto de cada sesión (y de cada nota de voz) queda en `text_usage`
y entra al precio en el paso 3. Hasta entonces no se cobra.

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
- **Moderación:** el texto libre del dueño (respuestas, cambios al guion y el
  brief corregido) pasa por `moderateText`. Cada respuesta tiene un máximo de
  500 caracteres; cada campo del brief, 300.
- **Notas de voz:** webm, mp4, mp3 o wav, hasta 30 s y 2 MB. La transcripción
  vuelve a la pantalla y se modera recién al enviarla.
- **Límite de uso:** 120 pedidos de texto y notas de voz por organización y
  por hora.
- **Respuestas simultáneas:** si dos respuestas llegan a la vez, la segunda
  falla con `conflict` en vez de pisar a la primera.
- **Fallas del modelo:** si el proveedor falla después de una respuesta, la
  respuesta queda guardada y `resumeCreativeConversation` pide la siguiente
  pregunta.

Los errores son `CreativeFlowError` con un código: `notFound`, `invalidState`,
`invalidAnswer`, `invalidAudio`, `moderation`, `rateLimited`, `conflict` o
`providerFailed`.
