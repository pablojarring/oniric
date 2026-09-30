import {
  ArrowRightIcon,
  CoffeeIcon,
  CroissantIcon,
  ImageIcon,
  ShirtIcon,
  VideoIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AdMockup, type AdMockupProps } from "@/components/marketing/ad-mockup";
import {
  ctaArrowClassName,
  secondaryCtaClassName,
} from "@/components/marketing/cta";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Link } from "@/i18n/navigation";
import { adTemplates, templateIds, type TemplateId } from "@/lib/templates";

/** Anuncio de ejemplo de cada plantilla, en uno de sus formatos. */
const samples: Record<
  TemplateId,
  Pick<AdMockupProps, "format" | "tone" | "icon"> & { className: string }
> = {
  promoInstagram: {
    format: "landscape",
    tone: "berry",
    icon: ShirtIcon,
    className: "w-full max-w-80",
  },
  whatsappStatus: {
    format: "story",
    tone: "sunset",
    icon: CroissantIcon,
    className: "w-40",
  },
  dailyOffer: {
    format: "square",
    tone: "citrus",
    icon: CoffeeIcon,
    className: "w-56",
  },
};

export function Templates() {
  const t = useTranslations("Landing");
  const tTemplates = useTranslations("Templates.items");

  return (
    <section id="templates" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow={t("templates.eyebrow")}
        title={t("templates.title")}
        description={t("templates.description")}
      />
      <ul className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
        {templateIds.map((id) => {
          const template = adTemplates[id];
          const { className, ...mockup } = samples[id];
          const sample = mockup.format;
          const isVideo = template.mediaType === "video";
          const MediaIcon = isVideo ? VideoIcon : ImageIcon;

          return (
            <li
              key={id}
              className="group flex reveal flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10"
            >
              <div
                aria-hidden
                className="relative flex h-88 items-center justify-center overflow-hidden bg-linear-to-br from-violet-100 via-fuchsia-50 to-orange-100 p-6"
              >
                <div className="absolute inset-0 bg-dots" />
                <AdMockup
                  {...mockup}
                  video={isVideo}
                  className={`relative transition-transform duration-500 group-hover:scale-105 ${className}`}
                  label={t(`samples.${sample}.label`)}
                  title={t(`samples.${sample}.title`)}
                  copy={t(`samples.${sample}.copy`)}
                  cta={t(`samples.${sample}.cta`)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">
                    <MediaIcon aria-hidden className="size-3.5" />
                    {isVideo
                      ? t("templates.video", {
                          seconds: template.durationSeconds ?? 0,
                        })
                      : t("templates.image")}
                  </span>
                  {template.aspectRatios.map((ratio) => (
                    <span
                      key={ratio}
                      className="rounded-full border px-2.5 py-1"
                    >
                      {ratio}
                    </span>
                  ))}
                </div>
                <h3 className="font-heading text-xl font-bold">
                  {tTemplates(`${id}.name`)}
                </h3>
                <p className="text-muted-foreground">
                  {tTemplates(`${id}.description`)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-12 flex justify-center">
        <Link href="/signup" className={`group ${secondaryCtaClassName}`}>
          {t("templates.cta")}
          <ArrowRightIcon aria-hidden className={ctaArrowClassName} />
        </Link>
      </div>
    </section>
  );
}
