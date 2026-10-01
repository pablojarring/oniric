import { describe, expect, it, vi } from "vitest";

import type { GenerationRequest } from "./generation-provider";
import {
  HiggsfieldApiError,
  HiggsfieldProvider,
  signWebhookReference,
  verifyWebhookSignature,
} from "./higgsfield";

const CREDENTIALS = "key-id:key-secret";
const REQUEST_ID = "d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff";

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

const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const accepted = () =>
  json({
    status: "queued",
    request_id: REQUEST_ID,
    status_url: `https://api.higgsfield.ai/requests/${REQUEST_ID}/status`,
    cancel_url: `https://api.higgsfield.ai/requests/${REQUEST_ID}/cancel`,
  });

const video: GenerationRequest = {
  modelId: "kling-3.0-std",
  prompt: "Pan de yuca recién horneado",
  aspectRatio: "9:16",
  durationSeconds: 10,
};

function provider(api: { fetch: typeof fetch }, extra = {}) {
  return new HiggsfieldProvider({
    credentials: CREDENTIALS,
    fetch: api.fetch,
    sleep: async () => undefined,
    ...extra,
  });
}

const body = (call: Call | undefined) =>
  JSON.parse(String(call?.init.body)) as Record<string, unknown>;
const header = (call: Call | undefined, name: string) =>
  new Headers(call?.init.headers).get(name);

describe("HiggsfieldProvider", () => {
  it("lista los modelos de las plantillas con sus formatos", async () => {
    const models = await provider(fakeApi()).listModels();
    expect(models.map((model) => model.id)).toEqual([
      "kling-3.0-std",
      "marketing-studio-image",
    ]);
    const kling = models[0];
    expect(kling?.durationsSeconds).toContain(10);
    expect(kling?.durationsSeconds).toContain(15);
    expect(kling?.aspectRatios).toEqual(["9:16", "1:1", "16:9"]);
  });

  describe("submit", () => {
    it("envía el video sin foto con el formato y la clave de idempotencia", async () => {
      const api = fakeApi(accepted());
      const result = await provider(api).submit(video, { reference: "job-1" });

      expect(result).toEqual({ providerJobId: REQUEST_ID });
      const [call] = api.calls;
      expect(call?.url).toBe(
        "https://api.higgsfield.ai/kling-video/v3.0/std/text-to-video",
      );
      expect(call?.init.method).toBe("POST");
      expect(header(call, "Authorization")).toBe(`Key ${CREDENTIALS}`);
      expect(header(call, "Idempotency-Key")).toBe("job-1");
      expect(body(call)).toEqual({
        prompt: video.prompt,
        duration: 10,
        sound: "off",
        aspect_ratio: "9:16",
      });
    });

    it("con foto usa el endpoint de imagen a video", async () => {
      const api = fakeApi(accepted());
      await provider(api).submit({
        ...video,
        inputImageUrl: "https://storage.test/foto.jpg",
      });

      const [call] = api.calls;
      expect(call?.url).toBe(
        "https://api.higgsfield.ai/kling-video/v3.0/std/image-to-video",
      );
      expect(body(call)).toEqual({
        prompt: video.prompt,
        duration: 10,
        sound: "off",
        image_url: "https://storage.test/foto.jpg",
      });
    });

    it("la imagen de oferta lleva el formato y la foto como referencia", async () => {
      const api = fakeApi(accepted());
      await provider(api).submit({
        modelId: "marketing-studio-image",
        prompt: "Oferta 2x1",
        aspectRatio: "1:1",
        inputImageUrl: "https://storage.test/foto.jpg",
      });

      const [call] = api.calls;
      expect(call?.url).toBe(
        "https://api.higgsfield.ai/marketing-studio/image",
      );
      expect(body(call)).toEqual({
        prompt: "Oferta 2x1",
        aspect_ratio: "1:1",
        resolution: "1k",
        quality: "high",
        image_urls: ["https://storage.test/foto.jpg"],
      });
    });

    it("pide el webhook firmado del job", async () => {
      const api = fakeApi(accepted());
      await provider(api, {
        webhook: { siteUrl: "https://oniric.test", secret: "s3cret" },
      }).submit(video, { reference: "job-1" });

      const url = new URL(api.calls[0]?.url ?? "");
      const webhook = new URL(url.searchParams.get("hf_webhook") ?? "");
      expect(webhook.origin + webhook.pathname).toBe(
        "https://oniric.test/api/webhooks/higgsfield",
      );
      expect(webhook.searchParams.get("job")).toBe("job-1");
      expect(webhook.searchParams.get("sig")).toBe(
        signWebhookReference("s3cret", "job-1"),
      );
    });

    it("reintenta un 5xx o un corte de red con la misma clave", async () => {
      const api = fakeApi(
        json({ detail: "Unexpected" }, 500),
        new TypeError("fetch failed"),
        accepted(),
      );
      const result = await provider(api).submit(video, { reference: "job-1" });

      expect(result.providerJobId).toBe(REQUEST_ID);
      expect(api.calls).toHaveLength(3);
      expect(api.calls.map((call) => header(call, "Idempotency-Key"))).toEqual([
        "job-1",
        "job-1",
        "job-1",
      ]);
    });

    it("no reintenta un error del cliente, como saldo insuficiente", async () => {
      const api = fakeApi(
        json({ detail: "Insufficient credits" }, 403, {
          "x-correlation-id": "corr-1",
        }),
      );
      const error = await provider(api)
        .submit(video, { reference: "job-1" })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HiggsfieldApiError);
      expect(error).toMatchObject({
        status: 403,
        detail: "Insufficient credits",
        correlationId: "corr-1",
        insufficientCredits: true,
      });
      expect(String(error)).not.toContain("key-secret");
      expect(api.calls).toHaveLength(1);
    });
  });

  describe("estimate", () => {
    it("devuelve el costo en USD y lo cachea por parámetros", async () => {
      const api = fakeApi(json({ credits: "12.500", usd: "0.781" }));
      const hf = provider(api);

      await expect(hf.estimate(video)).resolves.toEqual({ costUsd: 0.781 });
      // Otro prompt y con foto: mismo costo, sin volver a llamar.
      await expect(
        hf.estimate({
          ...video,
          prompt: "Otro texto",
          inputImageUrl: "https://storage.test/foto.jpg",
        }),
      ).resolves.toEqual({ costUsd: 0.781 });

      expect(api.calls).toHaveLength(1);
      expect(api.calls[0]?.url).toBe(
        "https://api.higgsfield.ai/estimate/kling-video/v3.0/std/text-to-video",
      );
      expect(body(api.calls[0])).toMatchObject({
        duration: 10,
        aspect_ratio: "9:16",
      });
    });

    it("vuelve a estimar al vencer la caché o con otros parámetros", async () => {
      let now = 0;
      const api = fakeApi(
        json({ usd: "0.5" }),
        json({ usd: "0.75" }),
        json({ usd: "0.6" }),
      );
      const hf = provider(api, { now: () => now, estimateTtlMs: 1_000 });

      await hf.estimate(video);
      await expect(
        hf.estimate({ ...video, durationSeconds: 15 }),
      ).resolves.toEqual({ costUsd: 0.75 });
      now = 2_000;
      await expect(hf.estimate(video)).resolves.toEqual({ costUsd: 0.6 });
      expect(api.calls).toHaveLength(3);
    });

    it("rechaza una estimación inválida", async () => {
      const api = fakeApi(json({ usd: "no" }));
      await expect(provider(api).estimate(video)).rejects.toThrow(
        "estimación inválida",
      );
    });
  });

  describe("estado y resultados", () => {
    it.each([
      ["queued", { state: "pending" }],
      ["in_progress", { state: "running" }],
      ["completed", { state: "succeeded" }],
      ["nsfw", { state: "failed", error: "nsfw" }],
      ["canceled", { state: "failed", error: "canceled" }],
      ["failed", { state: "failed", error: "provider_failed" }],
    ])("%s → %o", async (status, expected) => {
      const api = fakeApi(json({ status, request_id: REQUEST_ID }));
      await expect(provider(api).getStatus(REQUEST_ID)).resolves.toEqual(
        expected,
      );
      expect(api.calls[0]?.url).toBe(
        `https://api.higgsfield.ai/requests/${REQUEST_ID}/status`,
      );
      expect(api.calls[0]?.init.method).toBe("GET");
    });

    it("incluye el error del proveedor si lo informa", async () => {
      const api = fakeApi(
        json({
          status: "failed",
          request_id: REQUEST_ID,
          error: "Generation failed",
        }),
      );
      await expect(provider(api).getStatus(REQUEST_ID)).resolves.toEqual({
        state: "failed",
        error: "provider: Generation failed",
      });
    });

    it("devuelve el video o las imágenes de una solicitud terminada", async () => {
      const api = fakeApi(
        json({
          status: "completed",
          request_id: REQUEST_ID,
          video: { url: "https://cdn.test/out/video.mp4" },
        }),
        json({
          status: "completed",
          request_id: REQUEST_ID,
          images: [
            { url: "https://cdn.test/out/a.jpg?token=1" },
            { url: "https://cdn.test/out/b" },
          ],
        }),
      );
      const hf = provider(api);

      await expect(hf.fetchOutput(REQUEST_ID)).resolves.toEqual([
        {
          url: "https://cdn.test/out/video.mp4",
          mediaType: "video",
          mimeType: "video/mp4",
        },
      ]);
      await expect(hf.fetchOutput(REQUEST_ID)).resolves.toEqual([
        {
          url: "https://cdn.test/out/a.jpg?token=1",
          mediaType: "image",
          mimeType: "image/jpeg",
        },
        {
          url: "https://cdn.test/out/b",
          mediaType: "image",
          mimeType: "image/png",
        },
      ]);
    });

    it("no entrega resultados de una solicitud en curso", async () => {
      const api = fakeApi(
        json({ status: "in_progress", request_id: REQUEST_ID }),
      );
      await expect(provider(api).fetchOutput(REQUEST_ID)).rejects.toThrow(
        "todavía no terminó",
      );
    });

    it("sin credenciales no llama a la API", async () => {
      const api = fakeApi();
      await expect(
        new HiggsfieldProvider({ credentials: "", fetch: api.fetch }).estimate(
          video,
        ),
      ).rejects.toThrow("no está configurado");
      expect(api.calls).toHaveLength(0);
    });

    it("un modelo desconocido falla antes de llamar a la API", async () => {
      const api = fakeApi();
      await expect(
        provider(api).submit({ ...video, modelId: "otro" }),
      ).rejects.toThrow("Modelo desconocido");
      expect(api.calls).toHaveLength(0);
    });
  });
});

describe("firma del webhook", () => {
  it("acepta solo la firma del mismo job y secreto", () => {
    const signature = signWebhookReference("s3cret", "job-1");
    expect(verifyWebhookSignature("s3cret", "job-1", signature)).toBe(true);
    expect(verifyWebhookSignature("s3cret", "job-2", signature)).toBe(false);
    expect(verifyWebhookSignature("otro", "job-1", signature)).toBe(false);
    expect(verifyWebhookSignature("s3cret", "job-1", "zz")).toBe(false);
    expect(verifyWebhookSignature("s3cret", "job-1", "")).toBe(false);
  });
});
