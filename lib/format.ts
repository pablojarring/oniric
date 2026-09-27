import { localeInfo, type Locale } from "@/i18n/config";
import { CREDIT_VALUE_MICRO_USD } from "@/lib/billing/config";

// Formato de montos con el locale de Intl de cada idioma (ver i18n/config.ts).

export function creditsToUsd(credits: number): number {
  return (credits * CREDIT_VALUE_MICRO_USD) / 1_000_000;
}

/** Precios en USD (CLAUDE.md §5: Ecuador está dolarizado). */
export function formatUsd(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(localeInfo[locale].formatLocale, {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeInfo[locale].formatLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
