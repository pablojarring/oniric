import { z } from "zod";

import {
  countries,
  industries,
  teamSizeValues,
  teamTypes,
  videoPurposes,
} from "./options";

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  country: z.enum(countries),
  industry: z.enum(industries),
  teamSize: z.enum(teamSizeValues),
  teamType: z.enum(teamTypes),
  videoPurposes: z.array(z.enum(videoPurposes)).min(1),
});

export type OnboardingAnswers = z.infer<typeof onboardingSchema>;

export type OnboardingField = keyof OnboardingAnswers;

/** Lee el formulario del onboarding (los checkboxes llegan repetidos). */
export function parseOnboardingForm(formData: FormData) {
  return onboardingSchema.safeParse({
    businessName: formData.get("businessName"),
    country: formData.get("country"),
    industry: formData.get("industry"),
    teamSize: formData.get("teamSize"),
    teamType: formData.get("teamType"),
    videoPurposes: formData.getAll("videoPurposes"),
  });
}
