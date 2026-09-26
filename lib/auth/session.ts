import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { cache } from "react";

import { getDb } from "@/db";
import { users, type Segment, type User } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { redirect } from "@/i18n/navigation";
import {
  getCurrentMembership,
  type MembershipWithOrganization,
} from "@/lib/organizations/service";
import { segmentConfig } from "@/lib/segment";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUser } from "@/lib/users/service";

import { signupLocaleOf } from "./metadata";
import { PATHNAME_HEADER } from "./redirect";

export type AuthIdentity = {
  id: string;
  email: string;
  /** Idioma guardado en Supabase al registrarse, si existe. */
  signupLocale: Locale | null;
};

/** Identidad de Supabase Auth de la petición actual, verificada con getClaims(). */
export const getAuthIdentity = cache(async (): Promise<AuthIdentity | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !claims.email) return null;

  return {
    id: claims.sub,
    email: claims.email,
    signupLocale: signupLocaleOf(claims.user_metadata),
  };
});

/** Perfil del usuario con sesión, o `null`. Crea el perfil si todavía no existe. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const identity = await getAuthIdentity();
  if (!identity) return null;

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, identity.id));
  if (user) return user;

  return ensureUser(getDb(), {
    id: identity.id,
    email: identity.email,
    locale: identity.signupLocale ?? (await getLocale()),
  });
});

/** Exige sesión; si no hay, redirige al login y vuelve después a esta página. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (user) return user;

  const next = (await headers()).get(PATHNAME_HEADER);
  return redirect({
    href: { pathname: "/login", query: next ? { next } : {} },
    locale: await getLocale(),
  });
}

export type OrganizationContext = MembershipWithOrganization & { user: User };

/** Exige sesión y organización; sin organización, lleva al onboarding. */
export async function requireOrganization(): Promise<OrganizationContext> {
  const user = await requireUser();
  const membership = await getCurrentMembership(getDb(), user.id);
  if (membership) return { user, ...membership };

  return redirect({ href: "/onboarding", locale: await getLocale() });
}

/**
 * Para los layouts de (pyme) y (empresa): si la organización es del otro
 * segmento, redirige a su página de inicio.
 */
export async function requireSegmentArea(
  segment: Segment,
): Promise<OrganizationContext> {
  const context = await requireOrganization();
  const current = context.organization.segment;
  if (current === segment) return context;

  return redirect({
    href: segmentConfig[current].homePath,
    locale: await getLocale(),
  });
}

/** Adónde llevar al usuario después del login: onboarding o inicio de su segmento. */
export async function resolveHomePath(userId: string): Promise<string> {
  const membership = await getCurrentMembership(getDb(), userId);
  return membership
    ? segmentConfig[membership.organization.segment].homePath
    : "/onboarding";
}
