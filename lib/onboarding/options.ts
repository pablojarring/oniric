// Opciones del onboarding. Los textos visibles están en messages/*.json
// (namespace "Onboarding"); aquí solo viven los valores que se guardan.
//
// TODO(producto): validar las listas de países, industrias y usos.

/** Países de Latinoamérica (ISO 3166-1 alfa-2). Los nombres se traducen con Intl. */
export const countries = [
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "DO",
  "EC",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PY",
  "SV",
  "UY",
  "VE",
] as const;

export type Country = (typeof countries)[number];

export const industries = [
  "food",
  "retail",
  "beauty",
  "health",
  "professional_services",
  "real_estate",
  "education",
  "tourism",
  "automotive",
  "technology",
  "other",
] as const;

export type Industry = (typeof industries)[number];

/** Rangos de tamaño del equipo, en número de personas. */
export const teamSizes = [
  { value: "1", min: 1, max: 1 },
  { value: "2-5", min: 2, max: 5 },
  { value: "6-10", min: 6, max: 10 },
  { value: "11-50", min: 11, max: 50 },
  { value: "51+", min: 51, max: Infinity },
] as const;

export type TeamSize = (typeof teamSizes)[number]["value"];

export const teamSizeValues = teamSizes.map((size) => size.value) as [
  TeamSize,
  ...TeamSize[],
];

/** Quién crea los anuncios en la organización. */
export const teamTypes = ["owner", "marketing_team", "agency"] as const;

export type TeamType = (typeof teamTypes)[number];

/** Para qué quiere los videos (se puede elegir más de uno). */
export const videoPurposes = [
  "social_media",
  "whatsapp",
  "paid_ads",
  "website",
  "other",
] as const;

export type VideoPurpose = (typeof videoPurposes)[number];
