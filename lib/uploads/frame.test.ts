import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { sampleJpeg } from "@/test/images";

import { frameProductPhoto, frameSizes } from "./frame";

describe("frameProductPhoto", () => {
  it.each(Object.entries(frameSizes))(
    "encuadra la foto en %s sin recortarla",
    async (aspectRatio, size) => {
      const framed = await frameProductPhoto(
        await sampleJpeg(300, 200),
        aspectRatio as keyof typeof frameSizes,
      );

      const metadata = await sharp(framed).metadata();
      expect(metadata).toMatchObject({ format: "jpeg", ...size });
    },
  );

  it("rechaza bytes que no son una imagen", async () => {
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    await expect(frameProductPhoto(fakeJpeg, "1:1")).rejects.toThrow();
  });
});
