"use server";

import { redirect as redirectTo } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getDb } from "@/db";
import type { User } from "@/db/schema";
import { setLocaleCookie } from "@/i18n/locale-cookie";
import { getPathname, redirect } from "@/i18n/navigation";
import { getSiteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUser } from "@/lib/users/service";

import { toAuthFormError, type AuthFormError } from "./errors";
import { signupLocaleOf } from "./metadata";
import { safeNextPath } from "./redirect";
import { credentialsSchema, emailSchema, passwordSchema } from "./schema";
import { resolveHomePath } from "./session";

export type AuthFormState =
  | { error: AuthFormError; email?: string }
  | { status: "checkEmail" | "resetSent"; email: string }
  | undefined;

async function localizedUrl(pathname: string): Promise<string> {
  const locale = await getLocale();
  return `${getSiteUrl()}${getPathname({ href: pathname, locale })}`;
}

/** Lleva al usuario a `next` (si es interno) o al inicio que le corresponde, en su idioma. */
async function redirectAfterLogin(user: User, next: FormDataEntryValue | null) {
  await setLocaleCookie(user.locale);

  const nextPath = safeNextPath(next, getSiteUrl());
  if (nextPath) redirectTo(nextPath);

  redirect({ href: await resolveHomePath(user.id), locale: user.locale });
}

export async function signIn(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = credentialsSchema.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalidCredentials", email };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: toAuthFormError(error), email };

  const user = await ensureUser(getDb(), {
    id: data.user.id,
    email: data.user.email ?? parsed.data.email,
    locale: signupLocaleOf(data.user.user_metadata) ?? (await getLocale()),
  });
  await redirectAfterLogin(user, formData.get("next"));
}

export async function signUp(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  if (!emailSchema.safeParse(email).success) {
    return { error: "invalidEmail", email };
  }
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: "weakPassword", email };

  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: password.data,
    options: {
      // El correo de confirmación vuelve al onboarding en el idioma actual.
      emailRedirectTo: await localizedUrl("/onboarding"),
      data: { locale },
    },
  });
  if (error) return { error: toAuthFormError(error), email };

  // Si la confirmación por correo está desactivada, ya hay sesión.
  if (data.session && data.user) {
    const user = await ensureUser(getDb(), { id: data.user.id, email, locale });
    await redirectAfterLogin(user, null);
  }

  // Supabase no revela si el correo ya estaba registrado.
  return { status: "checkEmail", email };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const locale = await getLocale();
  const callback = new URL("/api/auth/callback", getSiteUrl());
  callback.searchParams.set("locale", locale);
  const next = safeNextPath(formData.get("next"), getSiteUrl());
  if (next) callback.searchParams.set("next", next);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });

  if (error || !data.url) {
    return redirect({
      href: { pathname: "/login", query: { error: "oauth" } },
      locale,
    });
  }
  redirectTo(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale: await getLocale() });
}

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  if (!emailSchema.safeParse(email).success) {
    return { error: "invalidEmail", email };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await localizedUrl("/update-password"),
  });
  if (error && toAuthFormError(error) === "rateLimited") {
    return { error: "rateLimited", email };
  }

  // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
  return { status: "resetSent", email };
}

export async function updatePassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: "weakPassword" };
  if (formData.get("confirmPassword") !== password.data) {
    return { error: "passwordMismatch" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.updateUser({
    password: password.data,
  });
  if (error) return { error: toAuthFormError(error) };

  redirect({
    href: await resolveHomePath(data.user.id),
    locale: await getLocale(),
  });
}
