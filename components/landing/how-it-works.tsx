import {
  CircleCheckIcon,
  CroissantIcon,
  ImageUpIcon,
  ImagesIcon,
  SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionHeading } from "@/components/marketing/section-heading";
import { templateIds } from "@/lib/templates";

const steps = ["product", "template", "generate"] as const;

export function HowItWorks() {
  const t = useTranslations("Landing.how");

  const visuals = {
    product: <ProductVisual />,
    template: <TemplateVisual />,
    generate: <GenerateVisual />,
  };

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-16 bg-linear-to-b from-violet-50/70 via-fuchsia-50/40 to-transparent px-4 py-24 sm:px-6"
    >
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="relative mx-auto mt-16 max-w-6xl">
        {/* Línea que une los pasos en pantallas anchas. */}
        <div
          aria-hidden
          className="absolute top-7 right-[16%] left-[16%] hidden h-0.5 bg-linear-to-r from-violet-300 via-fuchsia-300 to-orange-300 lg:block"
        />
        <ol className="grid gap-12 lg:grid-cols-3 lg:gap-8">
          {steps.map((step, index) => (
            <li
              key={step}
              className="relative flex reveal flex-col items-center text-center"
            >
              <span
                aria-hidden
                className="grid size-14 place-items-center rounded-full bg-gradient-brand font-heading text-xl font-bold text-white shadow-lg ring-6 shadow-fuchsia-500/30 ring-violet-100"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 font-heading text-xl font-bold">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="mt-2 max-w-xs text-muted-foreground lg:min-h-18">
                {t(`steps.${step}.description`)}
              </p>
              <div
                aria-hidden
                className="mt-6 w-full max-w-sm rounded-3xl border bg-card/90 p-4 text-left shadow-lg shadow-violet-500/5 backdrop-blur"
              >
                {visuals[step]}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mx-auto mt-14 flex max-w-2xl reveal items-center gap-4 rounded-2xl border bg-card px-5 py-4 text-left shadow-sm">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
          <ImagesIcon aria-hidden className="size-5" />
        </span>
        {t("result")}
      </p>
    </section>
  );
}

function ProductVisual() {
  const t = useTranslations("Landing.how.visuals");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 px-4 py-6 text-sm text-muted-foreground">
        <ImageUpIcon className="size-7 text-violet-500" />
        {t("upload")}
      </div>
      <div className="flex items-center gap-3 rounded-xl border bg-background p-2 text-sm">
        <span className="grid size-9 place-items-center rounded-lg bg-linear-to-br from-amber-300 to-orange-500 text-white">
          <CroissantIcon className="size-5" />
        </span>
        <span className="flex-1 font-medium">{t("file")}</span>
        <CircleCheckIcon className="size-5 text-emerald-500" />
      </div>
    </div>
  );
}

function TemplateVisual() {
  const t = useTranslations("Templates.items");

  return (
    <ul className="flex flex-col gap-2">
      {templateIds.map((id, index) => (
        <li
          key={id}
          className={
            index === 1
              ? "flex items-center justify-between gap-2 rounded-xl border border-violet-400 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-800 ring-2 ring-violet-500/20"
              : "rounded-xl border bg-background px-3 py-2.5 text-sm text-muted-foreground"
          }
        >
          {t(`${id}.name`)}
          {index === 1 && (
            <CircleCheckIcon className="size-4 shrink-0 text-violet-600" />
          )}
        </li>
      ))}
    </ul>
  );
}

function GenerateVisual() {
  const t = useTranslations("Landing.how.visuals");

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-xl border bg-background p-3 text-sm leading-relaxed">
        {t("copy")}
        <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-violet-600" />
      </p>
      <span className="flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-brand text-sm font-semibold text-white shadow-md shadow-fuchsia-500/25">
        <SparklesIcon className="size-4" />
        {t("generate")}
      </span>
    </div>
  );
}
