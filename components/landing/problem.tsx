import { PiggyBankIcon, TimerIcon, WandSparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionHeading } from "@/components/marketing/section-heading";

const reasons = [
  ["agency", PiggyBankIcon, "from-violet-600 to-fuchsia-500"],
  ["time", TimerIcon, "from-fuchsia-500 to-orange-400"],
  ["skills", WandSparklesIcon, "from-orange-400 to-rose-500"],
] as const;

export function Problem() {
  const t = useTranslations("Landing.problem");

  return (
    <section className="px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <ul className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
        {reasons.map(([key, Icon, gradient]) => (
          <li
            key={key}
            className="group relative reveal overflow-hidden rounded-3xl border bg-card p-7 shadow-sm transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10"
          >
            <div
              aria-hidden
              className="absolute -top-24 -right-24 size-48 rounded-full bg-fuchsia-400/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
            />
            <span
              className={`grid size-12 place-items-center rounded-2xl bg-linear-to-br text-white shadow-lg shadow-fuchsia-500/20 ${gradient}`}
            >
              <Icon aria-hidden className="size-6" />
            </span>
            <h3 className="mt-5 font-heading text-xl font-bold">
              {t(`items.${key}.title`)}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {t(`items.${key}.description`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
