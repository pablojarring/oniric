import sharp from "sharp";

import type { AspectRatio } from "@/lib/providers/generation-provider";

/** Lienzo de cada formato, en el tamaño que usan las redes. */
export const frameSizes: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

/** Parte del lienzo que ocupa la foto; el resto es el fondo desenfocado. */
const PHOTO_SCALE = 0.9;

/**
 * Encuadra la foto del producto en el formato elegido sin recortarla: la foto
 * entera al centro, sobre una copia ampliada y desenfocada de sí misma (el
 * fondo habitual de las historias). Los modelos de imagen a video toman el
 * encuadre de la foto, así el anuncio sale en el formato que eligió el
 * cliente. Devuelve un JPEG; lanza un error si los bytes no son una imagen.
 */
export async function frameProductPhoto(
  bytes: Uint8Array,
  aspectRatio: AspectRatio,
): Promise<Uint8Array> {
  const { width, height } = frameSizes[aspectRatio];
  // `rotate()` sin ángulo aplica la orientación EXIF de las fotos del celular.
  const photo = sharp(bytes, { failOn: "error" }).rotate();

  const background = await photo
    .clone()
    .resize(width, height, { fit: "cover" })
    .blur(30)
    .modulate({ brightness: 0.8 })
    .toBuffer();
  const foreground = await photo
    .clone()
    .resize(Math.round(width * PHOTO_SCALE), Math.round(height * PHOTO_SCALE), {
      fit: "inside",
    })
    .toBuffer();

  const framed = await sharp(background)
    .composite([{ input: foreground, gravity: "center" }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return new Uint8Array(framed);
}
