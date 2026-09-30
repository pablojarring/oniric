import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionHeading } from "@/components/marketing/section-heading";

const questions = [
  "design",
  "where",
  "cost",
  "fail",
  "people",
  "privacy",
] as const;

/** Preguntas frecuentes con <details>: se abren sin JavaScript. */
export function Faq() {
  const t = useTranslations("Landing.faq");

  return (
    <section id="faq" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          className="lg:sticky lg:top-28 lg:items-start lg:self-start lg:text-left"
        />
        <div className="flex flex-col gap-3">
          {questions.map((key) => (
            <details
              key={key}
              className="group rounded-2xl border bg-card px-5 shadow-xs transition-shadow open:shadow-md open:ring-1 open:ring-violet-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                {t(`items.${key}.question`)}
                <ChevronDownIcon
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="pb-5 text-muted-foreground">
                {t(`items.${key}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
