import { describe, expect, it } from "vitest";

import { createMemoryStorage } from "@/test/storage";

import { adFileName, signOutputs, slugify } from "./files";

const job = {
  brief: {
    productName: "Pan de Yuca ¡Recién horneado!",
    adCopy: "x",
    photoConsent: false,
  },
  templateId: "whatsappStatus",
  request: { modelId: "m", prompt: "p", aspectRatio: "9:16" as const },
};

describe("slugify", () => {
  it("quita tildes, signos y espacios", () => {
    expect(slugify("  Pan de Yuca ¡Recién horneado! ")).toBe(
      "pan-de-yuca-recien-horneado",
    );
    expect(slugify("Açaí & Pão")).toBe("acai-pao");
    expect(slugify("🔥🔥")).toBe("");
  });
});

describe("adFileName", () => {
  it("usa el producto, el formato y la extensión del tipo", () => {
    expect(adFileName(job, { mimeType: "video/webm" }, 0, 1)).toBe(
      "oniric-pan-de-yuca-recien-horneado-9x16.webm",
    );
  });

  it("numera cuando hay varios resultados", () => {
    expect(adFileName(job, { mimeType: "image/png" }, 1, 2)).toBe(
      "oniric-pan-de-yuca-recien-horneado-9x16-2.png",
    );
  });

  it("usa 'anuncio' si no hay un nombre utilizable", () => {
    expect(
      adFileName(
        { ...job, brief: { ...job.brief, productName: "🔥" } },
        { mimeType: "image/png" },
        0,
        1,
      ),
    ).toBe("oniric-anuncio-9x16.png");
  });
});

describe("signOutputs", () => {
  it("firma una URL para ver y otra para descargar cada resultado", async () => {
    const { storage } = createMemoryStorage();

    const [signed] = await signOutputs(storage, {
      ...job,
      outputs: [
        {
          path: "org/job/0.webm",
          size: 10,
          mediaType: "video",
          mimeType: "video/webm",
        },
      ],
    });

    expect(signed?.url).toBe("https://storage.test/org/job/0.webm?ttl=3600");
    expect(signed?.downloadUrl).toBe(
      "https://storage.test/org/job/0.webm?ttl=3600&download=oniric-pan-de-yuca-recien-horneado-9x16.webm",
    );
  });
});
