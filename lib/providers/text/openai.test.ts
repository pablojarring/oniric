import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { OpenAIApiError, OpenAITextProvider, TextRefusalError } from "./openai";
import type { TextRequest } from "./text-provider";

type Call = { url: string; init: RequestInit };

/** API falsa: responde en orden y guarda cada llamada. */
function fakeApi(...responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      const next = responses.shift();
      if (!next) throw new Error("Llamada inesperada a la API falsa");
      if (next instanceof Error) throw next;
      return next;
    },
  );
  return { calls, fetch: fetchFn as unknown as typeof fetch };
}

const json = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const schema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
});

const request: TextRequest<z.infer<typeof schema>> = {
  task: "conversation_question",
  instructions: "Eres el director creativo de Oniric.",
  messages: [{ role: "user", content: "Tengo una panadería en Quito." }],
  schema,
};

function completed(output: unknown, usage = {}) {
  return json({
    id: "resp_123",
    model: "gpt-6-luna-2026-09-22",
    status: "completed",
    output: [
      { type: "reasoning", summary: [] },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: JSON.stringify(output) }],
      },
    ],
    usage: {
      input_tokens: 1_000,
      input_tokens_details: { cached_tokens: 200 },
      output_tokens: 300,
      ...usage,
    },
  });
}

function provider(api: { fetch: typeof fetch }, extra = {}) {
  return new OpenAITextProvider({
    apiKey: "sk-test",
    fetch: api.fetch,
    sleep: async () => undefined,
    ...extra,
  });
}

describe("OpenAITextProvider", () => {
  it("pide una salida estricta a la Responses API sin guardar la conversación", async () => {
    const api = fakeApi(
      completed({ question: "¿Qué quieres lograr?", options: ["A", "B"] }),
    );
    await provider(api).generate(request);

    expect(api.calls).toHaveLength(1);
    const { url, init } = api.calls[0] as Call;
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-test",
    );
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: "gpt-6-luna",
      instructions: "Eres el director creativo de Oniric.",
      input: [{ role: "user", content: "Tengo una panadería en Quito." }],
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "conversation_question",
          strict: true,
        },
      },
    });
    expect(body.text.format.schema.additionalProperties).toBe(false);
  });

  it("devuelve la salida validada y el costo con la tarifa de GPT-6 Luna", async () => {
    const api = fakeApi(
      completed({ question: "¿Qué quieres lograr?", options: ["A", "B"] }),
    );
    const result = await provider(api).generate(request);

    expect(result.output).toEqual({
      question: "¿Qué quieres lograr?",
      options: ["A", "B"],
    });
    expect(result.model).toBe("gpt-6-luna-2026-09-22");
    // 800 × 0,10 + 200 × 0,01 + 300 × 0,50 = 80 + 2 + 150 micro-dólares.
    expect(result.usage).toEqual({
      inputTokens: 1_000,
      cachedInputTokens: 200,
      outputTokens: 300,
      costMicroUsd: 232,
    });
  });

  it("manda las imágenes del usuario como input_image", async () => {
    const api = fakeApi(
      completed({ question: "¿Así?", options: ["Sí", "No"] }),
    );
    await provider(api).generate({
      ...request,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe esta referencia." },
            { type: "image", url: "https://i.ytimg.com/vi/abc/hqdefault.jpg" },
          ],
        },
      ],
    });

    const body = JSON.parse(String(api.calls[0]?.init.body));
    expect(body.input[0].content).toEqual([
      { type: "input_text", text: "Describe esta referencia." },
      {
        type: "input_image",
        image_url: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
      },
    ]);
  });

  it("no acepta imágenes en mensajes del asistente", async () => {
    const api = fakeApi();
    await expect(
      provider(api).generate({
        ...request,
        messages: [
          {
            role: "assistant",
            content: [{ type: "image", url: "https://example.com/a.jpg" }],
          },
        ],
      }),
    ).rejects.toThrow("Solo los mensajes del usuario");
    expect(api.calls).toHaveLength(0);
  });

  it("una negativa del modelo es un error propio", async () => {
    const api = fakeApi(
      json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "No puedo ayudar con eso." }],
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    );
    await expect(provider(api).generate(request)).rejects.toBeInstanceOf(
      TextRefusalError,
    );
  });

  it("una respuesta incompleta falla con el motivo", async () => {
    const api = fakeApi(
      json({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: [],
      }),
    );
    await expect(provider(api).generate(request)).rejects.toThrow(
      "max_output_tokens",
    );
  });

  it("una salida que no cumple el esquema no pasa", async () => {
    const api = fakeApi(
      completed({ question: "¿Qué?", options: ["solo una"] }),
    );
    await expect(provider(api).generate(request)).rejects.toThrow();
  });

  it("reintenta ante un 5xx o un corte de red", async () => {
    const api = fakeApi(
      json({ error: { message: "Server error" } }, 500),
      new TypeError("fetch failed"),
      completed({ question: "¿Qué?", options: ["A", "B"] }),
    );
    const result = await provider(api).generate(request);
    expect(result.output.question).toBe("¿Qué?");
    expect(api.calls).toHaveLength(3);
  });

  it("no reintenta sin saldo y lo informa", async () => {
    const api = fakeApi(
      json(
        {
          error: {
            code: "insufficient_quota",
            message: "You exceeded your current quota.",
          },
        },
        429,
        { "x-request-id": "req_9" },
      ),
    );
    const error = await provider(api)
      .generate(request)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(OpenAIApiError);
    expect((error as OpenAIApiError).quotaExceeded).toBe(true);
    expect((error as OpenAIApiError).message).toContain("req_9");
    expect((error as OpenAIApiError).message).not.toContain("sk-test");
    expect(api.calls).toHaveLength(1);
  });

  it("no reintenta un 400", async () => {
    const api = fakeApi(json({ error: { message: "Invalid schema" } }, 400));
    await expect(provider(api).generate(request)).rejects.toThrow(
      "Invalid schema",
    );
    expect(api.calls).toHaveLength(1);
  });

  it("rechaza un modelo sin precio conocido", () => {
    expect(
      () => new OpenAITextProvider({ apiKey: "sk-test", model: "gpt-99" }),
    ).toThrow("Sin precio");
  });

  it("rechaza nombres de tarea inválidos sin llamar a la API", async () => {
    const api = fakeApi();
    await expect(
      provider(api).generate({ ...request, task: "tarea con espacios" }),
    ).rejects.toThrow("Nombre de tarea inválido");
    expect(api.calls).toHaveLength(0);
  });
});
