import { describe, expect, it } from "vitest";

import { defaultLocale, locales, type Locale } from "./config";
import { loadMessages, mergeMessages } from "./messages";

type MessageTree = { [key: string]: string | MessageTree };

// Idiomas activos que se permiten con traducción parcial (el resto de claves se
// muestra en español). Un idioma nuevo puede activarse así mientras se completa.
const partialLocales: Locale[] = [];

function flatten(messages: MessageTree, prefix = ""): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[path, value] as [string, string]]
      : flatten(value, path);
  });
}

async function readMessageFile(locale: Locale): Promise<[string, string][]> {
  const messages: MessageTree = (await import(`../messages/${locale}.json`))
    .default;
  return flatten(messages);
}

const keys = (entries: [string, string][]) =>
  entries.map(([path]) => path).sort();

describe("archivos de traducción", () => {
  const translated = locales.filter((locale) => locale !== defaultLocale);

  it.each(translated.filter((locale) => !partialLocales.includes(locale)))(
    "%s tiene las mismas claves que el idioma por defecto",
    async (locale) => {
      expect(keys(await readMessageFile(locale))).toEqual(
        keys(await readMessageFile(defaultLocale)),
      );
    },
  );

  it.each(translated)(
    "%s no tiene claves que no existan en el idioma por defecto",
    async (locale) => {
      const reference = new Set(keys(await readMessageFile(defaultLocale)));
      const orphans = keys(await readMessageFile(locale)).filter(
        (path) => !reference.has(path),
      );

      expect(orphans).toEqual([]);
    },
  );

  it.each(locales)("%s no tiene textos vacíos", async (locale) => {
    const empty = (await readMessageFile(locale))
      .filter(([, value]) => value.trim() === "")
      .map(([path]) => path);

    expect(empty).toEqual([]);
  });
});

describe("mergeMessages", () => {
  it("usa la traducción cuando existe y el texto base cuando falta", () => {
    const base = {
      HomePage: { title: "Hola", tagline: "Texto base" },
      Footer: { legal: "Aviso legal" },
    };
    const overrides = { HomePage: { title: "Olá" } };

    expect(mergeMessages(base, overrides)).toEqual({
      HomePage: { title: "Olá", tagline: "Texto base" },
      Footer: { legal: "Aviso legal" },
    });
  });

  it("no modifica los objetos originales", () => {
    const base = { HomePage: { title: "Hola" } };
    mergeMessages(base, { HomePage: { title: "Olá" } });

    expect(base).toEqual({ HomePage: { title: "Hola" } });
  });
});

describe("loadMessages", () => {
  it("carga los textos del idioma pedido", async () => {
    const messages = await loadMessages("pt");

    expect(messages.Landing.hero.titleHighlight).toBe("prontos em minutos");
  });

  it("carga el idioma por defecto sin combinar", async () => {
    const messages = await loadMessages(defaultLocale);

    expect(messages.Landing.hero.titleHighlight).toBe("listos en minutos");
  });
});
