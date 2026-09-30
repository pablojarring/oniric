import { cn } from "cn";
import { PlayIcon, type LucideIcon } from "lucide-react";

const tones = {
  sunset: "from-orange-400 via-fuchsia-500 to-violet-700",
  berry: "from-fuchsia-500 via-violet-600 to-indigo-800",
  citrus: "from-amber-300 via-orange-500 to-rose-600",
} as const;

// Todas las medidas internas son relativas al ancho (`cqw`), así el anuncio se
// ve igual en cualquier tamaño, como una imagen.
const sizes = {
  story: {
    screen: "rounded-[11cqw] p-[7cqw]",
    label: "px-[3.5cqw] py-[1.5cqw] text-[4.2cqw]",
    icon: "size-[34cqw]",
    title: "text-[8.5cqw]",
    copy: "text-[5.2cqw]",
    cta: "mt-[3cqw] px-[5cqw] py-[2cqw] text-[4.8cqw]",
  },
  square: {
    screen: "rounded-[8cqw] p-[6cqw]",
    label: "px-[3cqw] py-[1.2cqw] text-[4.2cqw]",
    icon: "size-[22cqw]",
    title: "text-[8cqw]",
    copy: "text-[5cqw]",
    cta: "mt-[2.5cqw] px-[4cqw] py-[1.6cqw] text-[4.5cqw]",
  },
  landscape: {
    screen: "rounded-[5cqw] p-[4.5cqw]",
    label: "px-[2cqw] py-[0.8cqw] text-[2.8cqw]",
    icon: "size-[20cqw]",
    title: "text-[5.5cqw]",
    copy: "text-[3.3cqw]",
    cta: "mt-[1.5cqw] px-[2.8cqw] py-[1cqw] text-[3cqw]",
  },
} as const;

export type AdMockupProps = {
  format: keyof typeof sizes;
  tone: keyof typeof tones;
  icon: LucideIcon;
  /** Plantilla, p. ej. "Estado de WhatsApp". */
  label: string;
  title: string;
  copy: string;
  cta: string;
  video?: boolean;
  /** Debe fijar el ancho: el alto sale del formato. */
  className?: string;
};

/**
 * Vista de ejemplo de un anuncio generado, en el formato de cada red. Es una
 * ilustración: el producto se representa con un ícono.
 */
export function AdMockup({
  format,
  tone,
  icon: Icon,
  label,
  title,
  copy,
  cta,
  video = false,
  className,
}: AdMockupProps) {
  const size = sizes[format];

  const screen = (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden bg-linear-to-br text-white",
        tones[tone],
        size.screen,
      )}
    >
      {video && format === "story" && (
        <div className="mb-[3cqw] flex gap-[1.5cqw]" aria-hidden>
          <span className="h-[0.9cqw] flex-1 rounded-full bg-white" />
          <span className="h-[0.9cqw] flex-1 rounded-full bg-white/40" />
        </div>
      )}
      <span
        className={cn(
          "self-start rounded-full bg-black/25 font-semibold backdrop-blur",
          size.label,
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "flex flex-1 items-center justify-center",
          format === "landscape" && "justify-end pr-[6cqw]",
        )}
      >
        <span
          className={cn(
            "relative grid place-items-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur-sm",
            size.icon,
          )}
        >
          <Icon className="size-1/2" strokeWidth={1.6} aria-hidden />
          {video && (
            <span className="absolute -right-[4%] -bottom-[4%] grid size-[36%] place-items-center rounded-full bg-white text-violet-700 shadow">
              <PlayIcon className="size-1/2 fill-current" aria-hidden />
            </span>
          )}
        </span>
      </div>
      <div
        className={cn(
          "flex flex-col gap-[1cqw]",
          format === "landscape" &&
            "absolute bottom-[4.5cqw] left-[4.5cqw] max-w-[58%]",
        )}
      >
        <p
          className={cn(
            "font-heading leading-tight font-bold drop-shadow",
            size.title,
          )}
        >
          {title}
        </p>
        <p className={cn("leading-snug text-white/90", size.copy)}>{copy}</p>
        <span
          className={cn(
            "self-start rounded-full bg-white font-semibold text-violet-700",
            size.cta,
          )}
        >
          {cta}
        </span>
      </div>
    </div>
  );

  // El contenedor externo fija el ancho y es la referencia de las medidas `cqw`.
  return (
    <div className={cn("@container", className)}>
      {format === "story" ? (
        <div className="aspect-[9/16] rounded-[14cqw] bg-zinc-950 p-[2.5cqw] shadow-2xl ring-1 shadow-violet-900/30 ring-zinc-800">
          {screen}
        </div>
      ) : (
        <div
          className={cn(
            "shadow-xl shadow-violet-900/20",
            format === "square"
              ? "aspect-square rounded-[8cqw]"
              : "aspect-video rounded-[5cqw]",
          )}
        >
          {screen}
        </div>
      )}
    </div>
  );
}
