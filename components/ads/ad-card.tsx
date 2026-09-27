import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import type { GenerationJob } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format";
import { isTemplateId } from "@/lib/templates";

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
  const tPage = useTranslations("AdPage");
  const tTemplates = useTranslations("Templates");
  const locale = useLocale();

  const templateName =
    job.templateId && isTemplateId(job.templateId)
      ? tTemplates(`items.${job.templateId}.name`)
      : job.modelId;
  const title = job.brief?.productName ?? templateName;
  const output = job.outputs?.[0];

  return (
    <Link
      href={`/ads/${job.id}`}
      className="group flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {thumbnailUrl && output ? (
          output.mimeType.startsWith("video/") ? (
            <video
              src={thumbnailUrl}
              muted
              playsInline
              preload="metadata"
              aria-label={t("thumbnailAlt", { product: title })}
              className="size-full object-contain"
            />
          ) : (
            <Image
              src={thumbnailUrl}
              alt={t("thumbnailAlt", { product: title })}
              fill
              unoptimized
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-contain"
            />
          )
        ) : (
          <span className="px-4 text-center text-sm text-muted-foreground">
            {tPage(`status.${job.status}`)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 text-sm">
        <span className="font-medium group-hover:underline">{title}</span>
        <span className="text-muted-foreground">
          {templateName} · {formatDateTime(job.createdAt, locale)}
        </span>
        {job.shareToken && (
          <span className="text-muted-foreground">{t("shared")}</span>
        )}
      </div>
    </Link>
  );
}
