import { DEFAULT_TEXT_MODEL, defaultTextModelPrice } from "./openai";
import {
  assertTaskName,
  textCostMicroUsd,
  type TextProvider,
  type TextRequest,
  type TextResult,
} from "./text-provider";

// Proveedor de texto falso para desarrollo y tests (CLAUDE.md §8: no gastar
// saldo real). Responde con la respuesta de prueba de cada tarea (`mock` en el
// pedido) o con una registrada al crearlo, y la valida con el mismo esquema que
// la respuesta real. El uso se estima con el largo del texto y se cobra con la
// tarifa del modelo real, para que los precios del entorno de prueba se parezcan
// a los reales.

/** Una tarea cuyas instrucciones incluyen este texto falla (útil en tests). */
export const MOCK_TEXT_FAILURE_MARKER = "[mock:falla]";

type Responder = (request: TextRequest<unknown>) => unknown;

export class MockTextProvider implements TextProvider {
  readonly id = "mock";
  readonly model = `${DEFAULT_TEXT_MODEL} (mock)`;

  constructor(private readonly responders: Record<string, Responder> = {}) {}

  async generate<T>(request: TextRequest<T>): Promise<TextResult<T>> {
    assertTaskName(request.task);
    if (request.instructions.includes(MOCK_TEXT_FAILURE_MARKER)) {
      throw new Error(`Falla simulada en la tarea "${request.task}".`);
    }
    const responder =
      (request.mock as Responder | undefined) ?? this.responders[request.task];
    if (!responder) {
      throw new Error(
        `El simulador de texto no tiene respuesta para la tarea "${request.task}".`,
      );
    }
    const output = request.schema.parse(
      responder(request as TextRequest<unknown>),
    );

    const inputTokens = estimateTokens(
      request.instructions +
        request.messages
          .map((message) =>
            typeof message.content === "string"
              ? message.content
              : message.content
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join(" "),
          )
          .join(" "),
    );
    const outputTokens = estimateTokens(JSON.stringify(output));
    return {
      output,
      model: this.model,
      usage: {
        inputTokens,
        cachedInputTokens: 0,
        outputTokens,
        costMicroUsd: textCostMicroUsd(defaultTextModelPrice, {
          inputTokens,
          cachedInputTokens: 0,
          outputTokens,
        }),
      },
    };
  }
}

/** Unos 4 caracteres por token, la regla práctica para español e inglés. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
