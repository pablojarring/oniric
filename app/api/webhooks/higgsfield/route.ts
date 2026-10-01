import { after, NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { getSyncDeps } from "@/lib/generation/runtime";
import { syncJob } from "@/lib/generation/service";
import { handleHiggsfieldWebhook } from "@/lib/generation/webhook";

// Aviso de Higgsfield cuando termina una generación. Responde enseguida (hay
// 10 segundos) y sincroniza el job después: la sincronización descarga los
// resultados a nuestro almacenamiento, lo que puede tardar más.
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const db = getDb();
  const outcome = await handleHiggsfieldWebhook(db, {
    secret: process.env.HIGGSFIELD_WEBHOOK_SECRET,
    jobId: request.nextUrl.searchParams.get("job"),
    signature: request.nextUrl.searchParams.get("sig"),
    body,
  });

  if (outcome.status === 200 && outcome.syncJobId) {
    const jobId = outcome.syncJobId;
    after(async () => {
      try {
        await syncJob(db, getSyncDeps(), jobId);
      } catch (error) {
        // El polling lo vuelve a intentar.
        console.error(
          `No se pudo sincronizar el job ${jobId} tras el webhook`,
          error,
        );
      }
    });
  }

  return NextResponse.json(
    { ok: outcome.status === 200 },
    { status: outcome.status },
  );
}
