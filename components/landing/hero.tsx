import {
  ArrowRightIcon,
  CheckIcon,
  CircleCheckIcon,
  CoffeeIcon,
  CroissantIcon,
  PlayCircleIcon,
  SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AdMockup } from "@/components/marketing/ad-mockup";
import { Aurora } from "@/components/marketing/aurora";
import {
  ctaArrowClassName,
  primaryCtaClassName,
  secondaryCtaClassName,
} from "@/components/marketing/cta";
import { Link } from "@/i18n/navigation";

const trustItems = ["noSubscription", "payPerUse", "languages"] as const;

export function Hero() {
  const t = useTranslations("Landing.hero");

  return (
    <section className="relative isolate overflow-hidden">
      <Aurora />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:pt-24 lg:pb-28">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="inline-flex animate-shine items-center gap-2 rounded-full px-3.5 py-1 text-sm font-medium shadow-sm border-shine">
            <SparklesIcon aria-hidden className="size-4 text-fuchsia-500" />
            {t("badge")}
          </span>
          <h1 className="mt-6 font-heading text-4xl font-extrabold tracking-tight text-balance sm:text-6xl xl:text-7xl">
            {t("titleStart")}{" "}
            <span className="animate-gradient-pan text-gradient-brand">
              {t("titleHighlight")}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground sm:text-xl">
            {t("description")}
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/signup" className={primaryCtaClassName}>
              {t("primaryCta")}
              <ArrowRightIcon aria-hidden className={ctaArrowClassName} />
            </Link>
            <Link
              href={{ pathname: "/", hash: "how-it-works" }}
              className={secondaryCtaClassName}
            >
              <PlayCircleIcon aria-hidden />
              {t("secondaryCta")}
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CircleCheckIcon
                  aria-hidden
                  className="size-4 text-emerald-500"
                />
                {t(`trust.${item}`)}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/** Ilustración: dos anuncios de ejemplo y el aviso de que uno está listo. */
function HeroVisual() {
  const t = useTranslations("Landing");

  return (
    <div
      aria-hidden
      className="relative mx-auto h-[26rem] w-full max-w-sm sm:h-[32rem] sm:max-w-md"
    >
      <div className="absolute inset-12 -z-10 rounded-full bg-linear-to-tr from-violet-500/40 via-fuchsia-500/30 to-orange-400/40 blur-3xl" />
      <div className="absolute top-2 left-1 w-48 -rotate-6 sm:w-56">
        <AdMockup
          className="animate-float"
          format="story"
          tone="sunset"
          icon={CroissantIcon}
          video
          label={t("samples.story.label")}
          title={t("samples.story.title")}
          copy={t("samples.story.copy")}
          cta={t("samples.story.cta")}
        />
      </div>
      <div className="absolute right-1 bottom-12 w-36 rotate-6 sm:bottom-14 sm:w-48">
        <AdMockup
          className="animate-float [animation-delay:-3.5s]"
          format="square"
          tone="citrus"
          icon={CoffeeIcon}
          label={t("samples.square.label")}
          title={t("samples.square.title")}
          copy={t("samples.square.copy")}
          cta={t("samples.square.cta")}
        />
      </div>
      <div className="absolute top-12 right-0 flex animate-float items-center gap-3 rounded-2xl border bg-background/90 p-3 pr-4 shadow-xl shadow-violet-900/10 backdrop-blur [animation-delay:-2s] sm:top-16">
        <span className="grid size-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
          <CheckIcon className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold">{t("hero.ready")}</span>
          <span className="text-xs text-muted-foreground">
            {t("hero.readyDetail")}
          </span>
        </span>
      </div>
      <div className="absolute bottom-0 left-4 flex items-center gap-1 rounded-full border bg-background/90 p-1 shadow-lg backdrop-blur sm:left-10">
        {["9:16", "1:1", "16:9"].map((ratio) => (
          <span
            key={ratio}
            className="rounded-full px-2.5 py-1 text-xs font-semibold first:bg-violet-600 first:text-white"
          >
            {ratio}
          </span>
        ))}
      </div>
    </div>
  );
}
