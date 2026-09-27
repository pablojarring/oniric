"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { requirePlatformAdmin } from "@/lib/auth/session";
import {
  InvalidManualCreditError,
  manualPaymentProvider,
} from "@/lib/payments/manual";
import { listProviders } from "@/lib/providers";

import {
  InvalidPricingError,
  parsePercentToBps,
  resetModelPricing,
  segments,
  setModelPricing,
} from "./pricing";

// Acciones del panel de admin. Cada una verifica el rol de admin de la
// plataforma por su cuenta: las server actions se pueden llamar directamente.

const pricingKeySchema = z.object({
  provider: z.string().min(1),
  modelId: z.string().min(1),
  segment: z.enum(segments),
});

function pricingKey(formData: FormData) {
  return pricingKeySchema.safeParse({
    provider: formData.get("provider"),
    modelId: formData.get("modelId"),
    segment: formData.get("segment"),
  });
}

export type PricingFormState =
  | { ok: true }
  | { ok: false; error: "model" | "marginBps" | "minPriceCredits" }
  | undefined;

export async function savePricing(
  _state: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const admin = await requirePlatformAdmin();
  const key = pricingKey(formData);
  if (!key.success) return { ok: false, error: "model" };

  const marginBps = parsePercentToBps(String(formData.get("margin") ?? ""));
  if (marginBps === null) return { ok: false, error: "marginBps" };
  const minPriceCredits = Number(formData.get("minPriceCredits"));

  try {
    await setModelPricing(getDb(), listProviders(), {
      ...key.data,
      marginBps,
      minPriceCredits,
      actorUserId: admin.id,
    });
  } catch (error) {
    if (error instanceof InvalidPricingError) {
      return { ok: false, error: error.field };
    }
    throw error;
  }
  revalidatePath("/admin/pricing");
  return { ok: true };
}

export async function resetPricing(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const key = pricingKey(formData);
  if (!key.success) return;
  await resetModelPricing(getDb(), key.data);
  revalidatePath("/admin/pricing");
}

export type CreditFormState =
  | { ok: true; credits: number }
  | { ok: false; error: "credits" | "reference" }
  | undefined;

/** Acreditación manual (pago por transferencia, cortesía). */
export async function creditOrganization(
  _state: CreditFormState,
  formData: FormData,
): Promise<CreditFormState> {
  const admin = await requirePlatformAdmin();
  const organizationId = z.uuid().safeParse(formData.get("organizationId"));
  if (!organizationId.success) throw new Error("Organización inválida.");

  const credits = Number(formData.get("credits"));
  try {
    await manualPaymentProvider.fulfill(getDb(), {
      organizationId: organizationId.data,
      credits,
      reference: String(formData.get("reference") ?? ""),
      actorUserId: admin.id,
    });
  } catch (error) {
    if (error instanceof InvalidManualCreditError) {
      return { ok: false, error: error.field };
    }
    throw error;
  }
  revalidatePath(`/admin/organizations/${organizationId.data}`);
  return { ok: true, credits };
}
