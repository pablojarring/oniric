import sharp from "sharp";

/** JPEG real de prueba, de un color plano. */
export async function sampleJpeg(
  width = 64,
  height = 48,
): Promise<Uint8Array<ArrayBuffer>> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: "#f97316" },
  })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buffer);
}
