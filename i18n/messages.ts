import type { Messages } from "next-intl";

import { defaultLocale, type Locale } from "./config";

type MessageTree = { [key: string]: string | MessageTree };

/**
 * Combina `overrides` sobre `base`: las claves traducidas reemplazan a las del
 * idioma base y las que faltan se conservan del base.
 */
export function mergeMessages<T extends MessageTree>(
  base: T,
  overrides: MessageTree,
): T {
  const result: MessageTree = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = result[key];
    result[key] =
      typeof value === "object" && typeof baseValue === "object"
        ? mergeMessages(baseValue, value)
        : value;
  }

  return result as T;
}

/**
 * Carga los textos de un idioma. Las claves que falten se muestran en el idioma
 * por defecto, así un idioma puede activarse con una traducción parcial.
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const base: Messages = (await import(`../messages/${defaultLocale}.json`))
    .default;

  if (locale === defaultLocale) {
    return base;
  }

  const localized: MessageTree = (await import(`../messages/${locale}.json`))
    .default;

  return mergeMessages(base, localized);
}
