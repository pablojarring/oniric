import { describe, expect, it, vi } from "vitest";

import { OpenAIApiError } from "../text/openai";
import { OpenAITranscriptionProvider } from "./openai";
import type { TranscriptionRequest } from "./transcription-provider";

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const request: TranscriptionRequest = {
  audio: new Blob([new Uint8Array(100)], { type: "audio/webm" }),
  filename: "nota.webm",
  durationSeconds: 10,
  context: 'Panadería La Esquina answers: "¿Qué quieres lograr?"',
};

const provider = (fetchFn: typeof fetch) =>
  new OpenAITranscriptionProvider({
    apiKey: "sk-test",
    fetch: fetchFn,
    sleep: async () => undefined,
  });

describe("OpenAITranscriptionProvider", () => {
  it("manda el audio en multipart y cobra los segundos que informa la API", async () => {
    const api = fakeApi(
      json({
        text: " Quiero vender más pan de yuca. ",
        usage: { type: "duration", seconds: 8 },
      }),
    );
    const result = await provider(api.fetch).transcribe(request);

    expect(result).toEqual({
      text: "Quiero vender más pan de yuca.",
      model: "gpt-transcribe",
      seconds: 8,
      // 8 s a US$0,0045 por minuto.
      costMicroUsd: 600,
    });
    const call = api.calls[0] as Call;
    expect(call.url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(call.init.method).toBe("POST");
    expect(new Headers(call.init.headers).get("Authorization")).toBe(
      "Bearer sk-test",
    );
    const form = call.init.body as FormData;
    expect(form.get("model")).toBe("gpt-transcribe");
    expect(form.get("prompt")).toBe(request.context);
    expect((form.get("file") as File).name).toBe("nota.webm");
  });

  it("sin duración en la respuesta, cobra la que midió el navegador", async () => {
    const api = fakeApi(json({ text: "Hola" }));
    const result = await provider(api.fetch).transcribe(request);
    expect(result.seconds).toBe(10);
    expect(result.costMicroUsd).toBe(750);
  });

  it("reintenta una vez ante un 5xx y no ante la falta de saldo", async () => {
    const retried = fakeApi(
      json({ error: { message: "caído" } }, 503),
      json({ text: "Hola" }),
    );
    await expect(
      provider(retried.fetch).transcribe(request),
    ).resolves.toMatchObject({ text: "Hola" });
    expect(retried.calls).toHaveLength(2);

    const quota = fakeApi(
      json(
        { error: { code: "insufficient_quota", message: "Sin saldo" } },
        429,
      ),
    );
    const error = await provider(quota.fetch)
      .transcribe(request)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(OpenAIApiError);
    expect((error as OpenAIApiError).quotaExceeded).toBe(true);
    expect(quota.calls).toHaveLength(1);
  });

  it("no acepta modelos sin precio", () => {
    expect(
      () =>
        new OpenAITranscriptionProvider({ apiKey: "sk-test", model: "otro" }),
    ).toThrow(/Sin precio/);
  });
});
