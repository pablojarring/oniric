import { describe, expect, it } from "vitest";

import {
  defaultLocale,
  localeInfo,
  locales,
  plannedLocales,
  type LocaleInfo,
} from "./config";

const allLocales: [string, LocaleInfo][] = [
  ...Object.entries(localeInfo),
  ...Object.entries(plannedLocales),
];

describe("registro de idiomas", () => {
  it("usa español como idioma por defecto", () => {
    expect(defaultLocale).toBe("es");
    expect(locales).toContain(defaultLocale);
  });

  it("tiene datos para cada idioma activo", () => {
    expect(Object.keys(localeInfo).sort()).toEqual([...locales].sort());
  });

  it("no repite idiomas activos en la lista de candidatos", () => {
    for (const code of Object.keys(plannedLocales)) {
      expect(locales).not.toContain(code);
    }
  });

  it.each(allLocales)("%s usa un código BCP 47 canónico", (code) => {
    expect(Intl.getCanonicalLocales(code)).toEqual([code]);
  });

  it.each(allLocales)(
    "%s formatea con un locale que Intl soporta",
    (_code, { formatLocale }) => {
      expect(Intl.NumberFormat.supportedLocalesOf(formatLocale)).toEqual([
        formatLocale,
      ]);
      expect(Intl.DateTimeFormat.supportedLocalesOf(formatLocale)).toEqual([
        formatLocale,
      ]);
    },
  );

  it.each(allLocales)("%s tiene nombre nativo", (_code, { nativeName }) => {
    expect(nativeName.trim()).not.toBe("");
  });
});
