import {
  BriefcaseIcon,
  CoffeeIcon,
  CroissantIcon,
  DumbbellIcon,
  Flower2Icon,
  HammerIcon,
  PawPrintIcon,
  ScissorsIcon,
  ShirtIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Marquee } from "@/components/marketing/marquee";

const industries = [
  ["restaurants", UtensilsCrossedIcon],
  ["bakeries", CroissantIcon],
  ["cafes", CoffeeIcon],
  ["fashion", ShirtIcon],
  ["beauty", ScissorsIcon],
  ["hardware", HammerIcon],
  ["gyms", DumbbellIcon],
  ["vets", PawPrintIcon],
  ["florists", Flower2Icon],
  ["services", BriefcaseIcon],
] as const;

export function Industries() {
  const t = useTranslations("Landing.industries");

  return (
    <section className="border-y bg-muted/40 py-10">
      <h2 className="px-4 text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase">
        {t("title")}
      </h2>
      <Marquee
        className="mt-6"
        items={industries.map(([key, Icon]) => (
          <span
            key={key}
            className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium whitespace-nowrap shadow-xs"
          >
            <Icon aria-hidden className="size-4 text-violet-600" />
            {t(`items.${key}`)}
          </span>
        ))}
      />
    </section>
  );
}
