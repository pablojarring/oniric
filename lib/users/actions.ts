"use server";

import { hasLocale } from "next-intl";

import { getDb } from "@/db";
import { routing } from "@/i18n/routing";
import { getAuthIdentity } from "@/lib/auth/session";

import { updateUserLocale } from "./service";

/** Guarda el idioma elegido en el selector, si hay sesión. */
export async function saveLocalePreference(locale: string): Promise<void> {
  if (!hasLocale(routing.locales, locale)) return;

  const identity = await getAuthIdentity();
  if (!identity) return;

  await updateUserLocale(getDb(), identity.id, locale);
}
