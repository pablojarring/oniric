"use server";

import { getLocale } from "next-intl/server";

import { getDb } from "@/db";
import { redirect } from "@/i18n/navigation";
import { requireUser, resolveHomePath } from "@/lib/auth/session";
import {
  AlreadyOnboardedError,
  createOrganizationForOwner,
} from "@/lib/organizations/service";

import { parseOnboardingForm, type OnboardingField } from "./schema";

export type OnboardingFormState =
  { fieldErrors: OnboardingField[] } | undefined;

export async function completeOnboarding(
  _state: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await requireUser();

  const parsed = parseOnboardingForm(formData);
  if (!parsed.success) {
    const fields = parsed.error.issues.map(
      (issue) => issue.path[0] as OnboardingField,
    );
    return { fieldErrors: [...new Set(fields)] };
  }

  try {
    await createOrganizationForOwner(getDb(), user.id, parsed.data);
  } catch (error) {
    // Un doble envío no es un error: el usuario ya tiene su organización.
    if (!(error instanceof AlreadyOnboardedError)) throw error;
  }

  redirect({ href: await resolveHomePath(user.id), locale: await getLocale() });
}
