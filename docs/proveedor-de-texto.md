# Proveedor de texto (director creativo)

`lib/providers/text/` es el "director creativo" del flujo creativo nuevo. Hace
la conversación guiada, el brief, las ideas, el guion y los prompts. Igual que
`GenerationProvider`, el resto de la app solo usa la interfaz `TextProvider`:
cambiar de modelo o de proveedor no toca nada más.

| Archivo            | Qué hace                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `text-provider.ts` | Interfaz, pedido (`TextRequest`), resultado con uso y costo, y el cálculo del costo por tokens.  |
| `openai.ts`        | Proveedor real: Responses API de OpenAI con salidas estructuradas estrictas. Modelo: GPT-6 Luna. |
| `mock.ts`          | Simulador para desarrollo y tests: responde con la respuesta de prueba de cada tarea.            |
| `json-schema.ts`   | Convierte el esquema de zod al JSON Schema estricto que acepta OpenAI.                           |
| `index.ts`         | `getTextProvider()`: OpenAI con `OPENAI_API_KEY`; sin ella, el simulador.                        |

## Cómo se usa

Cada tarea arma un pedido con instrucciones, mensajes y un esquema de zod para
la respuesta:

```ts
const { output, usage } = await getTextProvider().generate({
  task: "conversation_question",
  instructions: "Eres el director creativo de Oniric…",
  messages: [{ role: "user", content: "Tengo una panadería en Quito." }],
  schema: z.object({ question: z.string(), options: z.array(z.string()) }),
  mock: () => ({ question: "¿Qué quieres lograr?", options: ["…"] }),
});
```

- **La respuesta siempre cumple el esquema:** se envía como JSON Schema
  estricto y además se valida con zod al recibirla. En una salida estricta todos
  los campos son obligatorios: lo opcional se declara con `.nullable()`. Los
  largos de texto (`.min()` y `.max()` en strings) no se envían, porque la
  salida estricta no los admite, pero zod los sigue validando.
- **Imágenes:** un mensaje del usuario puede llevar partes `{ type: "image",
url }` (URL pública o firmada), por ejemplo para las fichas visuales del
  tablero.
- **Uso y costo:** cada resultado trae los tokens de entrada (y de caché) y de
  salida, y el costo en micro-dólares con la tarifa del modelo. Ese costo entra
  en el precio del anuncio como "preparación" (docs/fase-b/precios.md). Un
  modelo sin precio en `textModelPrices` no se puede usar.
- **Simulador:** cada tarea trae su respuesta de prueba (`mock`). Se valida con
  el mismo esquema que la real. El uso se estima a 4 caracteres por token y se
  cobra con la tarifa de GPT-6 Luna, para que los precios de prueba se parezcan
  a los reales. Si las instrucciones incluyen `[mock:falla]`, la tarea falla.

## OpenAI (GPT-6 Luna)

Verificado en la documentación de OpenAI y en fichas del modelo (octubre de
2026):

- Modelo `gpt-6-luna`, lanzado el 22 de septiembre de 2026, con imágenes y
  salidas JSON estrictas.
- Tarifa estándar: US$0,10 por millón de tokens de entrada, US$0,01 de entrada
  en caché y US$0,50 de salida. El razonamiento del modelo cuenta como salida.
- Pedido: `POST https://api.openai.com/v1/responses` con `instructions`,
  `input`, `text.format = { type: "json_schema", name, schema, strict: true }`,
  `max_output_tokens` y `store: false`, para que OpenAI no guarde las
  conversaciones de los clientes.
- Respuesta: `output[]` con mensajes cuyo contenido es `output_text` o
  `refusal`; `usage.input_tokens`, `usage.input_tokens_details.cached_tokens` y
  `usage.output_tokens`.

Errores:

- Un `refusal` es un `TextRefusalError`.
- Una respuesta `incomplete`, por ejemplo por `max_output_tokens`, falla con el
  motivo.
- Los cortes de red, los 5xx y los 429 se reintentan dos veces.
- Un 429 con `insufficient_quota` no se reintenta: el saldo de OpenAI se acabó
  o se llegó al tope del proyecto (`quotaExceeded`).

Los mensajes de error nunca incluyen la clave.

## Configuración

- `OPENAI_API_KEY`: con ella, **cada pedido gasta saldo real de OpenAI**
  (centavos por anuncio). No la definas en desarrollo ni en tests (CLAUDE.md
  §8). En Vercel ya está cargada. Este PR todavía no llama al proveedor desde
  ninguna pantalla, así que no gasta nada.
- `OPENAI_TEXT_MODEL`: opcional, para cambiar de modelo. Tiene que tener precio
  en `textModelPrices`.
- Tope de prueba del dueño: US$10. Conviene ponerlo también como límite de
  presupuesto del proyecto en el panel de OpenAI (docs/fase-b/precios.md,
  sección 5).
