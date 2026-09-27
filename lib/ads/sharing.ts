import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { generationJobs, organizations, type GenerationJob } from "@/db/schema";
import type { Database } from "@/db/types";
import { getSiteUrl } from "@/lib/env";

// Enlaces públicos de los anuncios (`/s/<token>`). El token es aleatorio (128
// bits), solo existe mientras el dueño lo tenga activado y solo sirve para
// anuncios terminados.

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/**
 * URL pública del anuncio. Sin prefijo de idioma: quien la abre la ve en su
 * idioma (cookie o Accept-Language).
 */
export function shareUrlFor(token: string): string {
  return `${getSiteUrl()}/s/${token}`;
}

export class NotShareableError extends Error {
  constructor() {
    super("El anuncio no existe, es de otra organización o no terminó.");
  }
}

/** Activa el enlace público (o devuelve el que ya existe). */
export async function enableShareLink(
  db: Database,
  input: { organizationId: string; jobId: string; now?: Date },
): Promise<string> {
  const token = randomBytes(16).toString("base64url");
  const [job] = await db
    .update(generationJobs)
    .set({
      shareToken: sql`coalesce(${generationJobs.shareToken}, ${token})`,
      sharedAt: sql`coalesce(${generationJobs.sharedAt}, ${(input.now ?? new Date()).toISOString()}::timestamptz)`,
    })
    .where(
      and(
        eq(generationJobs.id, input.jobId),
        eq(generationJobs.organizationId, input.organizationId),
        eq(generationJobs.status, "succeeded"),
      ),
    )
    .returning({ shareToken: generationJobs.shareToken });
  if (!job?.shareToken) throw new NotShareableError();
  return job.shareToken;
}

/** Desactiva el enlace público: el token deja de funcionar para siempre. */
export async function disableShareLink(
  db: Database,
  input: { organizationId: string; jobId: string },
): Promise<void> {
  await db
    .update(generationJobs)
    .set({ shareToken: null, sharedAt: null })
    .where(
      and(
        eq(generationJobs.id, input.jobId),
        eq(generationJobs.organizationId, input.organizationId),
      ),
    );
}

/** Anuncio compartido por su token, con el nombre del negocio; null si no existe. */
export async function getSharedAd(
  db: Database,
  token: string,
): Promise<{ job: GenerationJob; businessName: string } | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const [row] = await db
    .select({ job: generationJobs, businessName: organizations.name })
    .from(generationJobs)
    .innerJoin(
      organizations,
      eq(organizations.id, generationJobs.organizationId),
    )
    .where(
      and(
        eq(generationJobs.shareToken, token),
        eq(generationJobs.status, "succeeded"),
      ),
    );
  return row ?? null;
}
