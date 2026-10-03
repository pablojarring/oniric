import { describe, expect, it } from "vitest";

import { countries } from "@/lib/onboarding/options";
import { adTemplates } from "@/lib/templates";

import {
  easterSunday,
  hasSeasonCalendar,
  isSeasonId,
  isSeasonInCalendar,
  seasonDate,
  seasonIds,
  seasons,
  todayIn,
  upcomingSeasons,
} from ".";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("easterSunday", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2030, "2030-04-21"],
    [2038, "2038-04-25"],
  ])("Pascua %i", (year, iso) => {
    expect(easterSunday(year)).toEqual(day(iso));
  });
});

describe("seasonDate", () => {
  it.each([
    ["carnival", 2026, "2026-02-16"],
    ["carnival", 2027, "2027-02-08"],
    ["holyWeek", 2026, "2026-04-03"],
    ["mothersDay", 2026, "2026-05-10"],
    ["mothersDay", 2027, "2027-05-09"],
    ["fathersDay", 2026, "2026-06-21"],
    ["blackFriday", 2025, "2025-11-28"],
    ["blackFriday", 2026, "2026-11-27"],
    ["backToSchoolHighlands", 2026, "2026-09-07"],
    ["dayOfTheDead", 2026, "2026-11-02"],
    ["christmas", 2026, "2026-12-25"],
  ] as const)("%s de %i", (id, year, iso) => {
    expect(seasonDate(seasons[id], year)).toEqual(day(iso));
  });

  it("cada fecha propone una plantilla existente y una ambientación", () => {
    for (const id of seasonIds) {
      expect(adTemplates[seasons[id].templateId]).toBeDefined();
      expect(seasons[id].scene.length).toBeGreaterThan(20);
      expect(seasons[id].leadDays).toBeGreaterThan(0);
    }
  });
});

describe("todayIn", () => {
  it("usa el día de la zona horaria, no el de UTC", () => {
    // 03:00 UTC del 9 de octubre son las 22:00 del 8 en Guayaquil.
    expect(
      todayIn("America/Guayaquil", new Date("2026-10-09T03:00:00Z")),
    ).toEqual(day("2026-10-08"));
    expect(
      todayIn("America/Guayaquil", new Date("2026-10-09T05:00:00Z")),
    ).toEqual(day("2026-10-09"));
  });
});

describe("upcomingSeasons", () => {
  it("ordena las próximas fechas de Ecuador desde hoy", () => {
    const upcoming = upcomingSeasons("EC", new Date("2026-10-01T15:00:00Z"), {
      limit: 3,
    });
    expect(
      upcoming.map(({ season, date, daysUntil, active }) => [
        season.id,
        date.toISOString().slice(0, 10),
        daysUntil,
        active,
      ]),
    ).toEqual([
      ["guayaquilIndependence", "2026-10-09", 8, true],
      ["dayOfTheDead", "2026-11-02", 32, false],
      ["blackFriday", "2026-11-27", 57, false],
    ]);
  });

  it("incluye la fecha el mismo día y la pasa al año siguiente después", () => {
    const onTheDay = upcomingSeasons("EC", new Date("2026-12-25T23:00:00Z"));
    expect(onTheDay[0]).toMatchObject({
      season: { id: "christmas" },
      daysUntil: 0,
      active: true,
    });

    // 26 de diciembre en Guayaquil: Navidad queda para 2027.
    const after = upcomingSeasons("EC", new Date("2026-12-26T12:00:00Z"));
    const christmas = after.find(({ season }) => season.id === "christmas");
    expect(christmas?.date).toEqual(day("2027-12-25"));
    expect(after.at(-1)?.season.id).toBe("christmas");
  });

  it("devuelve cada fecha una vez, dentro del próximo año", () => {
    const upcoming = upcomingSeasons("EC", new Date("2026-03-01T12:00:00Z"));
    expect(upcoming).toHaveLength(seasonIds.length);
    expect(new Set(upcoming.map(({ season }) => season.id)).size).toBe(
      seasonIds.length,
    );
    for (const { daysUntil } of upcoming) {
      expect(daysUntil).toBeGreaterThanOrEqual(0);
      expect(daysUntil).toBeLessThan(366);
    }
  });

  it("sin calendario para el país no hay fechas", () => {
    expect(upcomingSeasons("MX", new Date())).toEqual([]);
  });
});

describe("calendarios", () => {
  it("solo Ecuador tiene calendario por ahora", () => {
    expect(countries.filter(hasSeasonCalendar)).toEqual(["EC"]);
    expect(isSeasonInCalendar("EC", "carnival")).toBe(true);
    expect(isSeasonInCalendar("PE", "carnival")).toBe(false);
  });

  it("reconoce los ids de las fechas", () => {
    expect(isSeasonId("mothersDay")).toBe(true);
    expect(isSeasonId("halloween")).toBe(false);
    expect(isSeasonId(undefined)).toBe(false);
  });
});
