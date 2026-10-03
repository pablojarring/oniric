import {
  BackpackIcon,
  BalloonIcon,
  BadgePercentIcon,
  CupSodaIcon,
  Flower2Icon,
  GiftIcon,
  HeartIcon,
  LandmarkIcon,
  PartyPopperIcon,
  SailboatIcon,
  SoupIcon,
  SparklesIcon,
  TreePineIcon,
  type LucideIcon,
} from "lucide-react";

import type { SeasonId } from "@/lib/seasons";

/** Ícono de cada fecha comercial. */
export const seasonIcons: Record<SeasonId, LucideIcon> = {
  valentines: HeartIcon,
  carnival: PartyPopperIcon,
  holyWeek: SoupIcon,
  backToSchoolCoast: BackpackIcon,
  mothersDay: Flower2Icon,
  childrensDay: BalloonIcon,
  fathersDay: GiftIcon,
  guayaquilFoundation: SailboatIcon,
  backToSchoolHighlands: BackpackIcon,
  guayaquilIndependence: SailboatIcon,
  dayOfTheDead: CupSodaIcon,
  blackFriday: BadgePercentIcon,
  quitoFestivities: LandmarkIcon,
  christmas: TreePineIcon,
  newYearsEve: SparklesIcon,
};
