import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ctaArrowClassName } from "@/components/marketing/cta";
import { Link } from "@/i18n/navigation";

const buttonClassName =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-white/50 [&_svg]:size-4";

/** Banda final sobre fondo oscuro con el llamado a crear la cuenta. */
export function FinalCta() {
  const t = useTranslations("Landing.cta");

  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="relative isolate mx-auto max-w-6xl reveal overflow-hidden rounded-[2rem] bg-zinc-950 px-6 py-16 text-center text-white sm:px-12 sm:py-24">
        <div
          aria-hidden
          className="absolute -top-32 left-1/4 -z-10 size-96 animate-aurora rounded-full bg-violet-600/50 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-20 -bottom-40 -z-10 size-96 animate-aurora rounded-full bg-fuchsia-600/40 blur-3xl [animation-delay:-6s]"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-20 -z-10 size-80 animate-aurora rounded-full bg-pink-500/30 blur-3xl [animation-delay:-12s]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1px)] mask-radial-from-30% mask-radial-to-80% bg-size-[22px_22px]"
        />
        <h2 className="mx-auto max-w-3xl font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {t("title")}{" "}
          <span className="bg-linear-to-r from-violet-300 via-fuchsia-300 to-orange-200 bg-clip-text text-transparent">
            {t("titleHighlight")}
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-balance text-white/75">
          {t("description")}
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className={`group ${buttonClassName} bg-white text-zinc-950 shadow-lg shadow-fuchsia-500/20 transition-[translate,background-color] hover:-translate-y-0.5 hover:bg-white/90`}
          >
            {t("primary")}
            <ArrowRightIcon aria-hidden className={ctaArrowClassName} />
          </Link>
          <Link
            href="/login"
            className={`${buttonClassName} border border-white/20 transition-colors hover:bg-white/10`}
          >
            {t("secondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
