import Image from "next/image";

import type { OutputFile } from "@/lib/providers/generation-provider";

/** Vista previa de un resultado: video o imagen según su tipo MIME. */
export function AdOutput({ output, alt }: { output: OutputFile; alt: string }) {
  const width = output.width ?? 1080;
  const height = output.height ?? 1080;
  // self-start: dentro de un flex en columna, el estiramiento ignoraría el
  // alto máximo y deformaría la vista previa.
  const className = "max-h-[70vh] w-auto self-start rounded-lg border";

  if (output.mimeType.startsWith("video/")) {
    return (
      <video
        src={output.url}
        width={width}
        height={height}
        controls
        playsInline
        aria-label={alt}
        className={className}
      />
    );
  }
  // Los outputs vienen del proveedor (y en la fase 3, del almacenamiento
  // propio): se muestran tal cual, sin el optimizador de imágenes.
  return (
    <Image
      src={output.url}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={className}
    />
  );
}
