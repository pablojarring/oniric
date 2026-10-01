import { eq } from "drizzle-orm";
import { z } from "zod";

import { generationJobs } from "@/db/schema";
import type { Database } from "@/db/types";
import {
  HIGGSFIELD_PROVIDER_ID,
  verifyWebhookSignature,
} from "@/lib/providers/higgsfield";

// Webhook de Higgsfield (docs.higgsfield.ai/docs/how-to/webhooks). Higgsfield
// no firma sus envíos, así que:
// - la URL que le pasamos lleva el id del job y una firma HMAC con nuestro
//   secreto (lib/providers/higgsfield.ts), y
// - el contenido nunca se usa para cobrar ni reembolsar: solo dispara una
//   sincronización, que consulta el estado a la API con nuestras credenciales.

const envelope = z.object({
  request_id: z.string().min(1),
  status: z.enum([
    "queued",
    "in_progress",
    "completed",
    "failed",
    "nsfw",
    "canceled",
  ]),
  error: z.string().nullable().optional(),
  payload: z.unknown().optional(),
});

/**
 * Qué responder y si sincronizar el job. Higgsfield reintenta los 5xx y los
 * cortes de red; los 4xx son definitivos. Los envíos repetidos de un job
 * válido se aceptan (la sincronización es idempotente).
 */
export type WebhookOutcome =
  { status: 200; syncJobId: string | null } | { status: 400 | 401 | 404 | 409 };

export async function handleHiggsfieldWebhook(
  db: Database,
  input: {
    secret: string | undefined;
    jobId: string | null;
    signature: string | null;
    body: unknown;
  },
): Promise<WebhookOutcome> {
  const { secret, jobId, signature } = input;
  if (
    !secret ||
    !jobId ||
    !signature ||
    !verifyWebhookSignature(secret, jobId, signature)
  ) {
    return { status: 401 };
  }

  const parsed = envelope.safeParse(input.body);
  if (!parsed.success || !z.uuid().safeParse(jobId).success) {
    return { status: 400 };
  }

  const [job] = await db
    .select({
      provider: generationJobs.provider,
      providerJobId: generationJobs.providerJobId,
    })
    .from(generationJobs)
    .where(eq(generationJobs.id, jobId));
  if (!job || job.provider !== HIGGSFIELD_PROVIDER_ID) return { status: 404 };

  // Todavía no guardamos el id de Higgsfield (el envío sigue en curso): el
  // polling lo va a sincronizar.
  if (!job.providerJobId) return { status: 200, syncJobId: null };
  if (job.providerJobId !== parsed.data.request_id) return { status: 409 };

  return { status: 200, syncJobId: jobId };
}
