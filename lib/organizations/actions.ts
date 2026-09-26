"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { requireOrganization } from "@/lib/auth/session";
import { segmentForAdvancedMode } from "@/lib/segment";

import { NotOrganizationAdminError, setOrganizationSegment } from "./service";

export type AdvancedModeResult =
  { ok: true } | { ok: false; error: "notAdmin" };

/** "Modo avanzado" en configuración: cambia la organización a empresa o a pyme. */
export async function setAdvancedMode(
  enabled: boolean,
): Promise<AdvancedModeResult> {
  const { user, organization } = await requireOrganization();

  try {
    await setOrganizationSegment(getDb(), {
      userId: user.id,
      organizationId: organization.id,
      segment: segmentForAdvancedMode(enabled),
    });
  } catch (error) {
    if (error instanceof NotOrganizationAdminError) {
      return { ok: false, error: "notAdmin" };
    }
    throw error;
  }

  // El encabezado y las páginas de inicio dependen del segmento.
  revalidatePath("/", "layout");
  return { ok: true };
}
