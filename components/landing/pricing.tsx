import {
  CheckIcon,
  ClipboardCheckIcon,
  LayersIcon,
  PaletteIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { primaryCtaClassName } from "@/components/marketing/cta";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Link } from "@/i18n/navigation";

const points = ["preview", "refund", "noContract", "expiry"] as const;

const teamItems = [
  ["roles", UsersIcon],
  ["brand", PaletteIcon],
  ["batch", LayersIcon],
  ["approvals", ClipboardCheckIcon],
] as const;

// TODO(producto): paquetes de créditos y sus precios, cuando estén definidos.
export function Pricing() {
  const t = useTranslations("Landing.pricing");

  return (
    <section
      id="pricing"
      className="scroll-mt-16 border-y bg-muted/40 px-4 py-24 sm:px-6"
    >
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Dos elementos: la animación de entrada y la del borde no pueden compartir `animation`. */}
        <div className="reveal">
          <div className="flex h-full animate-shine flex-col rounded-3xl p-8 shadow-xl shadow-violet-500/10 border-shine sm:p-10">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-gradient-brand font-heading text-5xl font-extrabold tracking-tight sm:text-6xl">
                {t("creditPrice")}
              </span>
              <span className="text-lg font-medium text-muted-foreground">
                {t("creditUnit")}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("creditNote")}
            </p>
            <ul className="mt-8 grid gap-4">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700">
                    <CheckIcon aria-hidden className="size-3.5" />
                  </span>
                  {t(`points.${point}`)}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className={`${primaryCtaClassName} mt-10 w-full`}
            >
              {t("cta")}
            </Link>
          </div>
        </div>
        <div className="flex reveal flex-col rounded-3xl border border-dashed border-violet-300 bg-background/60 p-8 sm:p-10">
          <span className="self-start rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            {t("teams.badge")}
          </span>
          <h3 className="mt-4 font-heading text-2xl font-bold">
            {t("teams.title")}
          </h3>
          <p className="mt-2 text-muted-foreground">{t("teams.description")}</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {teamItems.map(([key, Icon]) => (
              <li
                key={key}
                className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium"
              >
                <Icon aria-hidden className="size-4 text-violet-600" />
                {t(`teams.items.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
