import { describe, expect, it } from "vitest";

import { createMemoryStorage } from "@/test/storage";

import { MAX_OUTPUT_BYTES, OutputStorageError, storeOutputs } from "./outputs";

const job = { id: "job-1", organizationId: "org-1" };
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function fakeFetch(body: BodyInit | null, init: ResponseInit = {}) {
  return (async () => new Response(body, init)) as unknown as typeof fetch;
}

describe("storeOutputs", () => {
  it("sube cada resultado a la carpeta del job con su extensión", async () => {
    const { storage, files } = createMemoryStorage();

    const stored = await storeOutputs(
      storage,
      job,
      [
        {
          url: "https://proveedor.test/a.png",
          mediaType: "image",
          mimeType: "image/png",
          width: 10,
          height: 10,
        },
      ],
      fakeFetch(png),
    );

    expect(stored).toEqual([
      {
        path: "org-1/job-1/0.png",
        size: 4,
        mediaType: "image",
        mimeType: "image/png",
        width: 10,
        height: 10,
      },
    ]);
    expect(files.get("org-1/job-1/0.png")).toEqual({
      bytes: png,
      mimeType: "image/png",
    });
  });

  it("repetir la copia reemplaza el mismo archivo", async () => {
    const { storage, files } = createMemoryStorage();
    const output = {
      url: "https://proveedor.test/a.png",
      mediaType: "image" as const,
      mimeType: "image/png",
    };

    await storeOutputs(storage, job, [output], fakeFetch(png));
    await storeOutputs(storage, job, [output], fakeFetch(png));

    expect(files.size).toBe(1);
  });

  it("descarga URLs data: (las usa el MockProvider)", async () => {
    const { storage, files } = createMemoryStorage();

    await storeOutputs(storage, job, [
      {
        url: `data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`,
        mediaType: "image",
        mimeType: "image/svg+xml",
      },
    ]);

    expect(
      new TextDecoder().decode(files.get("org-1/job-1/0.svg")?.bytes),
    ).toBe("<svg/>");
  });

  it.each([
    ["un tipo no soportado", { mimeType: "application/zip" }, fakeFetch(png)],
    ["una respuesta con error", {}, fakeFetch(null, { status: 404 })],
    [
      "un archivo más grande que el máximo",
      {},
      fakeFetch(null, {
        headers: { "content-length": String(MAX_OUTPUT_BYTES + 1) },
      }),
    ],
  ])("rechaza %s sin subir nada", async (_case, override, fetchFile) => {
    const { storage, files } = createMemoryStorage();

    await expect(
      storeOutputs(
        storage,
        job,
        [
          {
            url: "https://proveedor.test/a.png",
            mediaType: "image",
            mimeType: "image/png",
            ...override,
          },
        ],
        fetchFile,
      ),
    ).rejects.toBeInstanceOf(OutputStorageError);
    expect(files.size).toBe(0);
  });
});
