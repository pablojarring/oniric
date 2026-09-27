import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, sniffImageType, validateImage } from "./images";

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 0];
const webp = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0];

describe("sniffImageType", () => {
  it.each([
    ["image/png", png],
    ["image/jpeg", jpeg],
    ["image/webp", webp],
  ])("reconoce %s por su firma", (type, bytes) => {
    expect(sniffImageType(new Uint8Array(bytes))).toBe(type);
  });

  it("rechaza otros formatos aunque se llamen .png", () => {
    const gif = new TextEncoder().encode("GIF89a....");
    const svg = new TextEncoder().encode("<svg xmlns=");
    expect(sniffImageType(gif)).toBeNull();
    expect(sniffImageType(svg)).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });

  it("rechaza un RIFF que no es WebP", () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45];
    expect(sniffImageType(new Uint8Array(wav))).toBeNull();
  });
});

describe("validateImage", () => {
  it("acepta una imagen válida y usa el tipo real, no el declarado", async () => {
    const file = new File([new Uint8Array(jpeg)], "foto.png", {
      type: "image/png",
    });
    expect(await validateImage(file)).toMatchObject({
      ok: true,
      mimeType: "image/jpeg",
      extension: "jpg",
    });
  });

  it("rechaza archivos de más de 8 MB", async () => {
    const file = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "grande.jpg");
    expect(await validateImage(file)).toEqual({ ok: false, error: "tooLarge" });
  });

  it("rechaza tipos no soportados", async () => {
    const file = new File(["hola"], "texto.jpg", { type: "image/jpeg" });
    expect(await validateImage(file)).toEqual({
      ok: false,
      error: "unsupportedType",
    });
  });
});
