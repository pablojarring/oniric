import { describe, expect, it } from "vitest";

import { defaultLocale, locales } from "./config";

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ""): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[path, value] as [string, string]]
      : flatten(value, path);
  });
}

async function loadMessages(locale: string): Promise<[string, string][]> {
  const messages: Messages = (await import(`../messages/${locale}.json`))
    .default;
  return flatten(messages);
}

describe("archivos de traducción", () => {
  it("usa español como idioma por defecto", () => {
    expect(defaultLocale).toBe("es");
  });

  it.each(locales.filter((locale) => locale !== defaultLocale))(
    "%s tiene las mismas claves que el idioma por defecto",
    async (locale) => {
      const keys = async (l: string) =>
        (await loadMessages(l)).map(([path]) => path).sort();

      expect(await keys(locale)).toEqual(await keys(defaultLocale));
    },
  );

  it.each(locales)("%s no tiene textos vacíos", async (locale) => {
    const empty = (await loadMessages(locale))
      .filter(([, value]) => value.trim() === "")
      .map(([path]) => path);

    expect(empty).toEqual([]);
  });
});
