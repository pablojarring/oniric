import {
  DownloadIcon,
  LanguagesIcon,
  LinkIcon,
  PencilIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionHeading } from "@/components/marketing/section-heading";
import { localeInfo, locales } from "@/i18n/config";

const cardClassName =
  "group relative flex reveal flex-col justify-between gap-6 overflow-hidden rounded-3xl border bg-card p-6 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-violet-500/10";

/** Beneficios en una grilla "bento": cada tarjeta con una pequeña ilustración. */
export function Features() {
  const t = useTranslations("Landing.features");
  const tPricing = useTranslations("Landing.pricing");

  const text = (
    key: "copy" | "formats" | "gallery" | "credits" | "privacy" | "language",
  ) => (
    <div>
      <h3 className="font-heading text-lg font-bold">
        {t(`items.${key}.title`)}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground group-data-dark:text-white/70">
        {t(`items.${key}.description`)}
      </p>
    </div>
  );

  return (
    <section className="px-4 py-24 sm:px-6">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
      <ul className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-4">
        <li className={`${cardClassName} lg:col-span-2`}>
          <div
            aria-hidden
            className="rounded-2xl border bg-linear-to-br from-violet-50 to-fuchsia-50 p-4"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
              <PencilIcon className="size-3.5" />
              {t("copyEdit")}
            </span>
            <p className="mt-2 text-sm leading-relaxed sm:text-base">
              {t("copyExample")}
              <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-violet-600" />
            </p>
          </div>
          {text("copy")}
        </li>

        <li className={cardClassName}>
          <div
            aria-hidden
            className="flex h-28 items-end justify-center gap-3 text-[0.65rem] font-semibold"
          >
            <span className="flex aspect-[9/16] h-full items-end justify-center rounded-lg border-2 border-violet-400 bg-violet-50 pb-1 text-violet-700 transition-transform group-hover:-translate-y-1">
              9:16
            </span>
            <span className="flex aspect-square h-16 items-end justify-center rounded-lg border-2 border-fuchsia-400 bg-fuchsia-50 pb-1 text-fuchsia-700 transition-transform delay-75 group-hover:-translate-y-1">
              1:1
            </span>
            <span className="flex aspect-video h-12 items-end justify-center rounded-lg border-2 border-orange-400 bg-orange-50 pb-1 text-orange-700 transition-transform delay-150 group-hover:-translate-y-1">
              16:9
            </span>
          </div>
          {text("formats")}
        </li>

        <li className={cardClassName}>
          <div aria-hidden className="flex h-28 items-center justify-center">
            <div className="flex flex-wrap justify-center gap-2">
              {locales.map((code) => (
                <span
                  key={code}
                  lang={code}
                  className="flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-sm font-semibold shadow-xs"
                >
                  <LanguagesIcon className="size-4 text-violet-600" />
                  {localeInfo[code].nativeName}
                </span>
              ))}
            </div>
          </div>
          {text("language")}
        </li>

        <li className={cardClassName}>
          <div aria-hidden className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <span className="aspect-[4/5] rounded-lg bg-linear-to-br from-orange-400 to-fuchsia-500" />
              <span className="aspect-[4/5] rounded-lg bg-linear-to-br from-fuchsia-500 to-violet-700" />
              <span className="aspect-[4/5] rounded-lg bg-linear-to-br from-amber-300 to-rose-500" />
            </div>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-600 py-1.5 text-white">
                <DownloadIcon className="size-3.5" />
                {t("download")}
              </span>
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-full border py-1.5">
                <LinkIcon className="size-3.5" />
                {t("copyLink")}
              </span>
            </div>
          </div>
          {text("gallery")}
        </li>

        {/* Tarjeta destacada, sobre fondo oscuro. */}
        <li
          data-dark
          className={`${cardClassName} border-zinc-800 bg-zinc-950 text-white lg:col-span-2`}
        >
          <div
            aria-hidden
            className="absolute -top-20 -right-10 size-64 rounded-full bg-fuchsia-600/40 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 left-10 size-56 rounded-full bg-violet-600/40 blur-3xl"
          />
          <div aria-hidden className="relative flex flex-col items-start gap-4">
            <span className="flex items-baseline gap-2">
              <span className="font-heading text-5xl font-extrabold tracking-tight sm:text-6xl">
                {tPricing("creditPrice")}
              </span>
              <span className="text-sm text-white/70">
                {tPricing("creditUnit")}
              </span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
              <RotateCcwIcon className="size-4" />
              {t("refund")}
            </span>
          </div>
          <div className="relative">{text("credits")}</div>
        </li>

        <li className={cardClassName}>
          <div aria-hidden className="flex h-28 items-center justify-center">
            <span className="relative grid size-20 place-items-center">
              <span className="absolute inset-0 rounded-full bg-violet-500/15 transition-transform duration-500 group-hover:scale-125" />
              <span className="absolute inset-3 rounded-full bg-violet-500/20" />
              <span className="relative grid size-12 place-items-center rounded-full bg-linear-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
                <ShieldCheckIcon className="size-6" />
              </span>
            </span>
          </div>
          {text("privacy")}
        </li>
      </ul>
    </section>
  );
}
