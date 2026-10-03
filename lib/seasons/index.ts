import type { Country } from "@/lib/onboarding/options";
import type { TemplateId } from "@/lib/templates";

// Calendario comercial: las fechas que más venden en cada país, con la
// plantilla y la ambientación sugeridas para su anuncio. Los nombres, consejos
// y copys están en messages/*.json (namespace "Seasons").
//
// TODO(producto): validar la lista de fechas y su anticipación. Hoy solo hay
// calendario para Ecuador; los demás países no muestran fechas.

export const seasonIds = [
  "valentines",
  "carnival",
  "holyWeek",
  "backToSchoolCoast",
  "mothersDay",
  "childrensDay",
  "fathersDay",
  "guayaquilFoundation",
  "backToSchoolHighlands",
  "guayaquilIndependence",
  "dayOfTheDead",
  "blackFriday",
  "quitoFestivities",
  "christmas",
  "newYearsEve",
] as const;

export type SeasonId = (typeof seasonIds)[number];

/** Día de la semana como en `Date.getUTCDay()`: 0 es domingo. */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Cómo se calcula la fecha cada año. Los meses van de 1 a 12. */
export type SeasonRule =
  | { kind: "fixed"; month: number; day: number }
  /** El n-ésimo día de la semana del mes, más `offsetDays` (Black Friday). */
  | {
      kind: "nthWeekday";
      month: number;
      weekday: Weekday;
      n: number;
      offsetDays?: number;
    }
  /** Días antes (negativo) o después del domingo de Pascua. */
  | { kind: "easter"; offsetDays: number };

export type Season = {
  id: SeasonId;
  rule: SeasonRule;
  /**
   * La fecha cambia cada año por decisión oficial (inicio de clases): se
   * muestra solo el mes, sin cuenta regresiva exacta.
   */
  approximate?: boolean;
  /** Días antes de la fecha desde los que conviene publicar. */
  leadDays: number;
  /** Plantilla que se propone para el anuncio. */
  templateId: TemplateId;
  /** Ambientación para el modelo, en inglés. */
  scene: string;
};

export const seasons: Record<SeasonId, Season> = {
  valentines: {
    id: "valentines",
    rule: { kind: "fixed", month: 2, day: 14 },
    leadDays: 14,
    templateId: "promoInstagram",
    scene:
      "Valentine's Day theme: soft red and pink accents, warm romantic light, subtle hearts in the background.",
  },
  // Lunes de Carnaval: 48 días antes de Pascua.
  carnival: {
    id: "carnival",
    rule: { kind: "easter", offsetDays: -48 },
    leadDays: 14,
    templateId: "whatsappStatus",
    scene:
      "Ecuadorian Carnival theme: playful confetti and colorful festive accents, joyful summer energy.",
  },
  // Viernes Santo: temporada de fanesca y feriado largo.
  holyWeek: {
    id: "holyWeek",
    rule: { kind: "easter", offsetDays: -2 },
    leadDays: 10,
    templateId: "dailyOffer",
    scene:
      "Holy Week holiday theme in Ecuador: calm warm tones and a cozy family table atmosphere.",
  },
  // TODO(producto): confirmar cada año el inicio de clases del régimen Costa
  // con el Ministerio de Educación (suele ser entre abril y mayo).
  backToSchoolCoast: {
    id: "backToSchoolCoast",
    rule: { kind: "nthWeekday", month: 5, weekday: 1, n: 1 },
    approximate: true,
    leadDays: 21,
    templateId: "dailyOffer",
    scene:
      "Back-to-school theme: notebooks, pencils and bright morning light, fresh optimistic mood.",
  },
  // Segundo domingo de mayo.
  mothersDay: {
    id: "mothersDay",
    rule: { kind: "nthWeekday", month: 5, weekday: 0, n: 2 },
    leadDays: 21,
    templateId: "promoInstagram",
    scene:
      "Mother's Day theme: soft flowers, pastel tones and warm natural light, tender and elegant mood.",
  },
  childrensDay: {
    id: "childrensDay",
    rule: { kind: "fixed", month: 6, day: 1 },
    leadDays: 10,
    templateId: "whatsappStatus",
    scene:
      "Children's Day theme: bright playful colors, balloons and a cheerful mood.",
  },
  // Tercer domingo de junio.
  fathersDay: {
    id: "fathersDay",
    rule: { kind: "nthWeekday", month: 6, weekday: 0, n: 3 },
    leadDays: 14,
    templateId: "promoInstagram",
    scene:
      "Father's Day theme: warm earthy tones, a relaxed family moment, classic and cozy mood.",
  },
  guayaquilFoundation: {
    id: "guayaquilFoundation",
    rule: { kind: "fixed", month: 7, day: 25 },
    leadDays: 10,
    templateId: "whatsappStatus",
    scene:
      "Guayaquil festivities theme: light blue and white accents, festive riverside city vibe.",
  },
  // TODO(producto): confirmar cada año el inicio de clases del régimen Sierra
  // y Amazonía (suele ser la primera semana de septiembre).
  backToSchoolHighlands: {
    id: "backToSchoolHighlands",
    rule: { kind: "nthWeekday", month: 9, weekday: 1, n: 1 },
    approximate: true,
    leadDays: 21,
    templateId: "dailyOffer",
    scene:
      "Back-to-school theme: notebooks, pencils and bright morning light, fresh optimistic mood.",
  },
  guayaquilIndependence: {
    id: "guayaquilIndependence",
    rule: { kind: "fixed", month: 10, day: 9 },
    leadDays: 10,
    templateId: "whatsappStatus",
    scene:
      "Guayaquil Independence festivities: light blue and white accents, proud festive city vibe.",
  },
  dayOfTheDead: {
    id: "dayOfTheDead",
    rule: { kind: "fixed", month: 11, day: 2 },
    leadDays: 14,
    templateId: "whatsappStatus",
    scene:
      "Ecuadorian Día de Difuntos season: warm purple and golden tones inspired by colada morada and guaguas de pan, cozy family mood.",
  },
  // El viernes después del cuarto jueves de noviembre.
  blackFriday: {
    id: "blackFriday",
    rule: { kind: "nthWeekday", month: 11, weekday: 4, n: 4, offsetDays: 1 },
    leadDays: 14,
    templateId: "dailyOffer",
    scene:
      "Black Friday sale theme: dark backdrop with vivid accent lighting, bold premium shopping feel.",
  },
  quitoFestivities: {
    id: "quitoFestivities",
    rule: { kind: "fixed", month: 12, day: 6 },
    leadDays: 14,
    templateId: "whatsappStatus",
    scene:
      "Fiestas de Quito theme: festive blue and red accents, joyful colonial city celebration.",
  },
  christmas: {
    id: "christmas",
    rule: { kind: "fixed", month: 12, day: 25 },
    leadDays: 30,
    templateId: "promoInstagram",
    scene:
      "Christmas theme: warm string lights, subtle pine and red accents, cozy festive mood.",
  },
  newYearsEve: {
    id: "newYearsEve",
    rule: { kind: "fixed", month: 12, day: 31 },
    leadDays: 10,
    templateId: "whatsappStatus",
    scene:
      "New Year's Eve theme: golden sparkles and warm night lights, celebration mood.",
  },
};

/** Fechas de cada país y su zona horaria (para saber qué día es "hoy"). */
const calendars: Partial<
  Record<Country, { timeZone: string; seasons: readonly SeasonId[] }>
> = {
  EC: { timeZone: "America/Guayaquil", seasons: seasonIds },
};

export function isSeasonId(value: unknown): value is SeasonId {
  return seasonIds.includes(value as SeasonId);
}

export function hasSeasonCalendar(country: Country): boolean {
  return calendars[country] !== undefined;
}

/** La fecha está en el calendario del país. */
export function isSeasonInCalendar(
  country: Country,
  seasonId: SeasonId,
): boolean {
  return calendars[country]?.seasons.includes(seasonId) ?? false;
}

const DAY_MS = 86_400_000;

/** Medianoche UTC del día, para contar días sin saltos de horario. */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Domingo de Pascua (algoritmo gregoriano de Meeus, Jones y Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

/** Fecha de la temporada en un año, a medianoche UTC. */
export function seasonDate(season: Season, year: number): Date {
  const { rule } = season;
  switch (rule.kind) {
    case "fixed":
      return utcDate(year, rule.month, rule.day);
    case "easter":
      return addDays(easterSunday(year), rule.offsetDays);
    case "nthWeekday": {
      const first = utcDate(year, rule.month, 1);
      const untilWeekday = (rule.weekday - first.getUTCDay() + 7) % 7;
      return addDays(
        first,
        untilWeekday + (rule.n - 1) * 7 + (rule.offsetDays ?? 0),
      );
    }
  }
}

/** El día de hoy en la zona horaria dada, a medianoche UTC. */
export function todayIn(timeZone: string, now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return utcDate(part("year"), part("month"), part("day"));
}

export type UpcomingSeason = {
  season: Season;
  /** Próxima fecha (hoy incluido), a medianoche UTC. */
  date: Date;
  /** Días que faltan: 0 es hoy. */
  daysUntil: number;
  /** Ya es momento de publicar (faltan `leadDays` días o menos). */
  active: boolean;
};

/**
 * Próximas fechas del calendario del país, de la más cercana a la más lejana.
 * Cada fecha aparece una vez (su próxima ocurrencia, dentro de un año). Sin
 * calendario para el país, devuelve una lista vacía.
 */
export function upcomingSeasons(
  country: Country,
  now: Date,
  options: { limit?: number } = {},
): UpcomingSeason[] {
  const calendar = calendars[country];
  if (!calendar) return [];

  const today = todayIn(calendar.timeZone, now);
  const year = today.getUTCFullYear();
  const upcoming = calendar.seasons.map((id) => {
    const season = seasons[id];
    let date = seasonDate(season, year);
    if (date < today) date = seasonDate(season, year + 1);
    const daysUntil = Math.round((date.getTime() - today.getTime()) / DAY_MS);
    return { season, date, daysUntil, active: daysUntil <= season.leadDays };
  });
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return options.limit === undefined
    ? upcoming
    : upcoming.slice(0, options.limit);
}
