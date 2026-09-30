import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { expireAllDueLots } from "@/lib/billing/wallet";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { getSyncDeps } from "@/lib/generation/runtime";
import { syncActiveJobs } from "@/lib/generation/service";

// Tarea programada: polling de respaldo de los jobs en curso (los webhooks de
// Higgsfield llegan en la fase 3) y vencimiento de créditos.
// Frecuencia en vercel.json: diaria, el máximo del plan Hobby.
// TODO(producto): definir la frecuencia al pasar a Vercel Pro.
export async function GET(request: NextRequest) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const jobs = await syncActiveJobs(db, getSyncDeps());
  const expiredLots = await expireAllDueLots(db);

  return NextResponse.json({ jobs, expiredLots });
}
