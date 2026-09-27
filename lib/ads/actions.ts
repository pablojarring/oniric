"use server";

import { getLocale } from "next-intl/server";

import { getDb } from "@/db";
import type { GenerationStatus } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { requireOrganization } from "@/lib/auth/session";
import { syncJob } from "@/lib/generation/service";
import { getGenerationProvider, getProviderById } from "@/lib/providers";
import { hasFeature } from "@/lib/segment";
import { getProductPhotoStorage } from "@/lib/uploads/supabase-storage";

import { parseAdForm } from "./schema";
import { createAd, getOrganizationJob, type CreateAdError } from "./service";
import { adFields, type AdField } from "./types";

export type CreateAdState =
  | { error: { code: "invalid"; fields: AdField[] } }
  | { error: CreateAdError }
  | undefined;

/** Paso 3 del asistente: "Generar". Si todo va bien, lleva a la página del anuncio. */
export async function createAdAction(
  _state: CreateAdState,
  formData: FormData,
): Promise<CreateAdState> {
  const { user, organization } = await requireOrganization();
  if (!hasFeature(organization.segment, "guidedWizard")) {
    throw new Error("El asistente guiado es del modo pyme.");
  }

  const parsed = parseAdForm(formData);
  if (!parsed.success) {
    // Solo los campos que el cliente puede corregir; un precio esperado
    // inválido viene de un formulario alterado y queda como error genérico.
    const fields = adFields.filter((field) =>
      parsed.error.issues.some((issue) => issue.path[0] === field),
    );
    return { error: { code: "invalid", fields } };
  }

  const result = await createAd(
    getDb(),
    { provider: getGenerationProvider(), storage: getProductPhotoStorage() },
    { organizationId: organization.id, userId: user.id, form: parsed.data },
  );
  if (!result.ok) return { error: result.error };

  redirect({ href: `/ads/${result.job.id}`, locale: await getLocale() });
}

/**
 * Consulta el estado del anuncio al proveedor. La página lo llama mientras el
 * job está en curso; `syncJob` es idempotente, así que no importa si el cron
 * lo sincroniza al mismo tiempo.
 */
export async function refreshAdStatus(
  jobId: string,
): Promise<GenerationStatus | null> {
  const { organization } = await requireOrganization();
  const db = getDb();

  const job = await getOrganizationJob(db, organization.id, jobId);
  if (!job) return null;
  if (job.status === "succeeded" || job.status === "failed") return job.status;

  return (await syncJob(db, getProviderById, job.id)).status;
}
