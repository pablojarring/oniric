import {
  BadgePercentIcon,
  ClapperboardIcon,
  MessageCircleIcon,
  type LucideIcon,
} from "lucide-react";

import type { AdMockupProps } from "@/components/marketing/ad-mockup";
import type { AspectRatio } from "@/lib/providers/generation-provider";
import type { TemplateId } from "@/lib/templates";

/** Color e ícono de cada plantilla en sus vistas de ejemplo. */
export const templateVisuals: Record<
  TemplateId,
  { tone: AdMockupProps["tone"]; icon: LucideIcon }
> = {
  promoInstagram: { tone: "berry", icon: ClapperboardIcon },
  whatsappStatus: { tone: "sunset", icon: MessageCircleIcon },
  dailyOffer: { tone: "citrus", icon: BadgePercentIcon },
};

/** Formato de la vista de ejemplo para cada relación de aspecto. */
export const mockupFormats: Record<AspectRatio, AdMockupProps["format"]> = {
  "9:16": "story",
  "1:1": "square",
  "16:9": "landscape",
};
