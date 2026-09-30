import { cn } from "cn";
import { Link2Icon, PlayIcon } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { AdStatusBadge } from "@/components/ads/ad-status-badge";
import { templateVisuals } from "@/components/ads/template-visuals";
import type { GenerationJob } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format";
import { isTemplateId } from "@/lib/templates";

const placeholderTones = {
  sunset: "from-orange-300 via-fuchsia-400 to-violet-600",
  berry: "from-fuchsia-400 via-violet-500 to-indigo-700",
  citrus: "from-amber-200 via-orange-400 to-rose-500",
} as const;

/** Tarjeta de un anuncio en la galería y en el inicio. */
export function AdCard({
  job,
  thumbnailUrl,
}: {
  job: GenerationJob;
  /** URL firmada del primer resultado, si el anuncio terminó. */
  thumbnailUrl?: string;
}) {
  const t = useTranslations("AdGallery");
  const tTemplates = useTranslations("Templates");
  const locale = useLocale() as Locale;

  const templateId =
    job.templateId && isTemplateId(job.templateId) ? job.templateId : null;
  const templateName = templateId
    ? tTemplates(`items.${templateId}.name`)
    : job.modelId;
  const title = job.brief?.productName ?? templateName;
  const output = job.outputs?.[0];
  const isVideo = output?.mimeType.startsWith("video/") ?? false;
  const visual = templateId ? templateVisuals[templateId] : undefined;
  const PlaceholderIcon = visual?.icon;

  return (
    <Link
      href={`/ads/${job.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-[translate,box-shadow] outline-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/10 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-muted">
        {thumbnailUrl && output ? (
          isVideo ? (
            <video
              // `#t=0.1` muestra el primer cuadro en vez de un recuadro vacío.
              src={`${thumbnailUrl}#t=0.1`}
              muted
              playsInline
              preload="metadata"
              aria-label={t("thumbnailAlt", { product: title })}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <Image
              src={thumbnailUrl}
              alt={t("thumbnailAlt", { product: title })}
              fill
              unoptimized
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )
        ) : (
          <div
            aria-hidden
            className={cn(
              "grid size-full place-items-center bg-linear-to-br opacity-80",
              placeholderTones[visual?.tone ?? "berry"],
              job.status === "failed" && "opacity-40 grayscale",
            )}
          >
            {PlaceholderIcon && (
              <PlaceholderIcon
                className={cn(
                  "size-10 text-white/90",
                  (job.status === "pending" || job.status === "running") &&
                    "animate-pulse motion-reduce:animate-none",
                )}
                strokeWidth={1.6}
              />
            )}
          </div>
        )}
        {isVideo && thumbnailUrl && (
          <span
            aria-hidden
            className="absolute right-2.5 bottom-2.5 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
          >
            <PlayIcon className="size-3.5 fill-current" />
          </span>
        )}
        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          {job.status !== "succeeded" ? (
            <AdStatusBadge status={job.status} className="shadow-sm" />
          ) : (
            <span />
          )}
          {job.shareToken && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
              <Link2Icon aria-hidden className="size-3" />
              {t("shared")}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5 p-3.5">
        <span className="truncate font-semibold">{title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {templateName} · {formatDateTime(job.createdAt, locale)}
        </span>
      </div>
    </Link>
  );
}
