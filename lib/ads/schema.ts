import { z } from "zod";

import { aspectRatios } from "@/lib/providers/generation-provider";
import { seasonIds } from "@/lib/seasons";
import { adTemplates, templateIds } from "@/lib/templates";

import { adFieldLimits } from "./types";

const adFormSchema = z
  .object({
    templateId: z.enum(templateIds),
    aspectRatio: z.enum(aspectRatios),
    productName: z.string().trim().min(2).max(adFieldLimits.productName),
    description: z.string().trim().max(adFieldLimits.description),
    offer: z.string().trim().max(adFieldLimits.offer),
    adCopy: z.string().trim().min(1).max(adFieldLimits.adCopy),
    photo: z.instanceof(Blob).nullable(),
    photoConsent: z.boolean(),
    expectedPriceCredits: z.coerce.number().int().positive(),
    seasonId: z.enum(seasonIds).optional(),
  })
  .superRefine((form, context) => {
    const template = adTemplates[form.templateId];
    const issue = (path: string) =>
      context.addIssue({ code: "custom", path: [path], message: path });

    if (!template.aspectRatios.includes(form.aspectRatio)) {
      issue("aspectRatio");
    }
    if (template.requiresOffer && form.offer === "") issue("offer");
    // Paso 1: foto del producto o descripción del servicio.
    if (!form.photo && form.description === "") issue("description");
    if (form.photo && !form.photoConsent) issue("photoConsent");
  });

export type AdForm = z.infer<typeof adFormSchema>;

export type { AdField } from "./types";

/** El input de archivo vacío llega como un archivo sin nombre ni bytes. */
function photoFrom(value: FormDataEntryValue | null): Blob | null {
  return value instanceof Blob && value.size > 0 ? value : null;
}

export function parseAdForm(formData: FormData) {
  const text = (name: string) => formData.get(name) ?? "";
  return adFormSchema.safeParse({
    templateId: formData.get("templateId"),
    aspectRatio: formData.get("aspectRatio"),
    productName: text("productName"),
    description: text("description"),
    offer: text("offer"),
    adCopy: text("adCopy"),
    photo: photoFrom(formData.get("photo")),
    photoConsent: formData.get("photoConsent") === "on",
    expectedPriceCredits: formData.get("expectedPriceCredits"),
    seasonId: formData.get("seasonId") || undefined,
  });
}
