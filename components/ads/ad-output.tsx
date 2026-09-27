import Image from "next/image";

import type { StoredOutput } from "@/lib/generation/types";

/** Vista previa de un resultado: video o imagen según su tipo MIME. */
export function AdOutput({
  output,
  url,
  alt,
  className = "max-h-[70vh] w-auto self-start rounded-lg border",
}: {
  output: Pick<StoredOutput, "mimeType" | "width" | "height">;
  /** URL firmada del bucket privado. */
  url: string;
  alt: string;
  /** Por defecto, self-start: en un flex en columna, estirarlo deformaría la vista previa. */
  className?: string;
}) {
  const width = output.width ?? 1080;
  const height = output.height ?? 1080;

  if (output.mimeType.startsWith("video/")) {
    return (
      <video
        src={url}
        width={width}
        height={height}
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
        className={className}
      />
    );
  }
  // Las URLs firmadas vencen: se muestran tal cual, sin el optimizador de
  // imágenes de Next.js.
  return (
    <Image
      src={url}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={className}
    />
  );
}
