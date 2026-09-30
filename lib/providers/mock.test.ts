import { describe, expect, it } from "vitest";

import { aspectRatios } from "./generation-provider";
import { MOCK_FAILURE_MARKER, MockProvider } from "./mock";

const request = {
  modelId: "mock-video-standard",
  prompt: "Promo de pan recién horneado",
  aspectRatio: "9:16" as const,
  durationSeconds: 10,
};

describe("MockProvider", () => {
  it("lista modelos de video e imagen con formatos válidos", async () => {
    const models = await new MockProvider().listModels();

    expect(models.map((model) => model.mediaType)).toEqual(
      expect.arrayContaining(["video", "image"]),
    );
    for (const model of models) {
      for (const ratio of model.aspectRatios) {
        expect(aspectRatios).toContain(ratio);
      }
      expect(model).not.toHaveProperty("costUsd");
    }
  });

  it("estima el costo del video por segundo y de la imagen por unidad", async () => {
    const provider = new MockProvider();

    expect(await provider.estimate(request)).toEqual({ costUsd: 0.8 });
    expect(
      await provider.estimate({
        modelId: "mock-image",
        prompt: "x",
        aspectRatio: "1:1",
      }),
    ).toEqual({ costUsd: 0.08 });
  });

  it("procesa durante la latencia y luego termina con salidas", async () => {
    let now = 1_000;
    const provider = new MockProvider({ latencyMs: 3_000, now: () => now });
    const { providerJobId } = await provider.submit(request);

    expect(await provider.getStatus(providerJobId)).toEqual({
      state: "running",
    });

    now += 3_000;
    expect(await provider.getStatus(providerJobId)).toEqual({
      state: "succeeded",
    });
    const [output] = await provider.fetchOutput(providerJobId);
    expect(output).toMatchObject({
      mediaType: "video",
      mimeType: "video/webm",
      width: 1080,
      height: 1920,
      durationSeconds: 10,
    });
    // Un video WebM real, descargable como el de un proveedor.
    const bytes = new Uint8Array(
      await (await fetch(output?.url ?? "")).arrayBuffer(),
    );
    expect([...bytes.slice(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  });

  it("las imágenes son SVG del formato pedido", async () => {
    const provider = new MockProvider();
    const { providerJobId } = await provider.submit({
      modelId: "mock-image",
      prompt: "x",
      aspectRatio: "16:9",
    });

    const [output] = await provider.fetchOutput(providerJobId);
    expect(output).toMatchObject({
      mediaType: "image",
      mimeType: "image/svg+xml",
      width: 1920,
      height: 1080,
    });
    const svg = await (await fetch(output?.url ?? "")).text();
    expect(svg).toContain('viewBox="0 0 1920 1080"');
  });

  it("falla si el prompt tiene el marcador de falla", async () => {
    const provider = new MockProvider();
    const { providerJobId } = await provider.submit({
      ...request,
      prompt: `Promo ${MOCK_FAILURE_MARKER}`,
    });

    expect(await provider.getStatus(providerJobId)).toEqual({
      state: "failed",
      error: "mock_failure",
    });
  });

  it("no guarda estado: otra instancia resuelve el mismo job", async () => {
    const { providerJobId } = await new MockProvider().submit(request);

    expect(await new MockProvider().getStatus(providerJobId)).toEqual({
      state: "succeeded",
    });
  });

  it("rechaza modelos e ids desconocidos", async () => {
    const provider = new MockProvider();

    await expect(
      provider.submit({ ...request, modelId: "no-existe" }),
    ).rejects.toThrow("Modelo desconocido");
    await expect(provider.getStatus("otro_123")).rejects.toThrow();
  });
});
