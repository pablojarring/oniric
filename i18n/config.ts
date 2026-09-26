/**
 * Registro de idiomas de la interfaz. Ver docs/idiomas.md.
 *
 * Para activar un idioma: agrega su código a `locales`, sus datos a
 * `localeInfo` y un archivo `messages/<código>.json`. Las claves que falten en
 * ese archivo se muestran en español (ver i18n/messages.ts).
 */

export const locales = ["es", "pt"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export type LocaleInfo = {
  /** Nombre del idioma en el propio idioma (endónimo), tal como se muestra en el selector. */
  nativeName: string;
  /**
   * Locale de `Intl` para formatear números, fechas y moneda. Es necesario
   * porque `Intl` no tiene datos para varias lenguas originarias (p. ej. `gn`)
   * y en ese caso formatea en silencio con el locale del sistema.
   */
  formatLocale: string;
};

export const localeInfo: Record<Locale, LocaleInfo> = {
  es: { nativeName: "Español", formatLocale: "es-419" },
  pt: { nativeName: "Português", formatLocale: "pt-BR" },
};

/**
 * Lenguas originarias candidatas, todavía no activas.
 *
 * TODO(producto): decidir cuáles se activan y en qué orden. Cada una necesita
 * una traducción hecha o revisada por hablantes nativos antes de activarse; los
 * códigos y endónimos también deben validarse con ellos.
 */
export const plannedLocales = {
  "qu-EC": { nativeName: "Kichwa", formatLocale: "es-EC" },
  jiv: { nativeName: "Shuar chicham", formatLocale: "es-EC" },
  qu: { nativeName: "Runasimi", formatLocale: "es-PE" },
  gn: { nativeName: "Avañeʼẽ", formatLocale: "es-PY" },
  ay: { nativeName: "Aymar aru", formatLocale: "es-BO" },
  nah: { nativeName: "Nāhuatl", formatLocale: "es-MX" },
  yua: { nativeName: "Maaya tʼaan", formatLocale: "es-MX" },
  quc: { nativeName: "Kʼicheʼ", formatLocale: "es-GT" },
  arn: { nativeName: "Mapudungun", formatLocale: "es-CL" },
} satisfies Record<string, LocaleInfo>;
