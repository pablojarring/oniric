import { and, asc, eq, inArray } from "drizzle-orm";

import {
  generationJobs,
  organizations,
  type GenerationJob,
  type GenerationStatus,
} from "@/db/schema";
import type { Database } from "@/db/types";
import { priceGeneration } from "@/lib/billing/pricing";
import {
  refundReservation,
  reserveCredits,
  settleReservation,
} from "@/lib/billing/wallet";
import type {
  GenerationProvider,
  GenerationRequest,
  ModelInfo,
  OutputFile,
} from "@/lib/providers/generation-provider";

// Flujo de una generación (CLAUDE.md §3.2):
// estimar → precio en créditos → reservar → enviar (pending) → webhook o
// polling → succeeded: cobrar / failed: reembolsar, en la misma transacción.

const activeStatuses: GenerationStatus[] = ["pending", "running"];

/** Un job que no llegó al proveedor en este tiempo se da por fallido y se reembolsa. */
export const SUBMIT_TIMEOUT_MS = 10 * 60 * 1000;

export type InvalidRequestReason =
  "unknownModel" | "unsupportedAspectRatio" | "invalidDuration" | "emptyPrompt";

export class InvalidGenerationRequestError extends Error {
  constructor(readonly reason: InvalidRequestReason) {
    super(`Solicitud de generación inválida: ${reason}`);
  }
}

export type ProviderResolver = (providerId: string) => GenerationProvider;

async function validateRequest(
  provider: GenerationProvider,
  request: GenerationRequest,
): Promise<ModelInfo> {
  const model = (await provider.listModels()).find(
    (candidate) => candidate.id === request.modelId,
  );
  if (!model) throw new InvalidGenerationRequestError("unknownModel");
  if (!model.aspectRatios.includes(request.aspectRatio)) {
    throw new InvalidGenerationRequestError("unsupportedAspectRatio");
  }
  if (
    model.mediaType === "video" &&
    !model.durationsSeconds?.includes(request.durationSeconds ?? -1)
  ) {
    throw new InvalidGenerationRequestError("invalidDuration");
  }
  if (request.prompt.trim() === "") {
    throw new InvalidGenerationRequestError("emptyPrompt");
  }
  return model;
}

/**
 * Crea un job: valida, calcula el precio, reserva los créditos y lo envía al
 * proveedor. Lanza InsufficientCreditsError si no alcanza el saldo (y no crea
 * nada). Si el envío falla, devuelve el job fallido con los créditos devueltos.
 */
export async function startGeneration(
  db: Database,
  provider: GenerationProvider,
  input: {
    organizationId: string;
    userId: string;
    request: GenerationRequest;
    now?: Date;
  },
): Promise<GenerationJob> {
  const { request } = input;
  await validateRequest(provider, request);

  const [organization] = await db
    .select({ segment: organizations.segment })
    .from(organizations)
    .where(eq(organizations.id, input.organizationId));
  if (!organization) throw new Error("La organización no existe.");

  const { costUsd } = await provider.estimate(request);
  const quote = await priceGeneration(db, {
    provider: provider.id,
    modelId: request.modelId,
    segment: organization.segment,
    costUsd,
  });

  const job = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(generationJobs)
      .values({
        organizationId: input.organizationId,
        createdBy: input.userId,
        provider: provider.id,
        modelId: request.modelId,
        request,
        ...quote,
      })
      .returning();
    if (!created) throw new Error("No se pudo crear el job.");

    await reserveCredits(tx, {
      organizationId: input.organizationId,
      jobId: created.id,
      credits: quote.priceCredits,
      now: input.now,
    });
    return created;
  });

  let providerJobId: string;
  try {
    ({ providerJobId } = await provider.submit(request));
  } catch (error) {
    console.error(`No se pudo enviar el job ${job.id} al proveedor`, error);
    return failJob(db, job.id, "submit_failed", input.now);
  }

  const [submitted] = await db
    .update(generationJobs)
    .set({ providerJobId })
    .where(eq(generationJobs.id, job.id))
    .returning();
  return submitted ?? job;
}

/** Bloquea el job; devuelve null si ya terminó (otro proceso lo cerró primero). */
async function lockActiveJob(tx: Database, jobId: string) {
  const [job] = await tx
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.id, jobId))
    .for("update");
  if (!job) throw new Error(`El job ${jobId} no existe.`);
  return activeStatuses.includes(job.status) ? job : null;
}

/** Marca el job como exitoso y cobra la reserva, en una sola transacción. */
async function completeJob(
  db: Database,
  jobId: string,
  outputs: OutputFile[],
  now = new Date(),
): Promise<GenerationJob> {
  // TODO(fase 3): descargar los outputs a almacenamiento propio antes de
  // cobrar (Higgsfield borra los archivos a los ~7 días).
  return db.transaction(async (tx) => {
    const job = await lockActiveJob(tx, jobId);
    if (!job) return getJobOrThrow(tx, jobId);

    const [completed] = await tx
      .update(generationJobs)
      .set({ status: "succeeded", outputs, completedAt: now })
      .where(eq(generationJobs.id, jobId))
      .returning();
    await settleReservation(tx, {
      organizationId: job.organizationId,
      jobId,
    });
    return completed ?? job;
  });
}

/** Marca el job como fallido y reembolsa completa la reserva, en una sola transacción. */
async function failJob(
  db: Database,
  jobId: string,
  error: string,
  now = new Date(),
): Promise<GenerationJob> {
  return db.transaction(async (tx) => {
    const job = await lockActiveJob(tx, jobId);
    if (!job) return getJobOrThrow(tx, jobId);

    const [failed] = await tx
      .update(generationJobs)
      .set({ status: "failed", error, completedAt: now })
      .where(eq(generationJobs.id, jobId))
      .returning();
    await refundReservation(tx, {
      organizationId: job.organizationId,
      jobId,
    });
    return failed ?? job;
  });
}

async function getJobOrThrow(db: Database, jobId: string) {
  const [job] = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.id, jobId));
  if (!job) throw new Error(`El job ${jobId} no existe.`);
  return job;
}

/**
 * Consulta al proveedor y actualiza el job. Es idempotente: puede llamarse
 * desde el polling, un webhook o la UI sin cobrar ni reembolsar dos veces.
 */
export async function syncJob(
  db: Database,
  resolveProvider: ProviderResolver,
  jobId: string,
  now: Date = new Date(),
): Promise<GenerationJob> {
  const job = await getJobOrThrow(db, jobId);
  if (!activeStatuses.includes(job.status)) return job;

  if (!job.providerJobId) {
    // El proceso murió entre la reserva y el envío.
    const stale = now.getTime() - job.createdAt.getTime() > SUBMIT_TIMEOUT_MS;
    return stale ? failJob(db, jobId, "submit_timeout", now) : job;
  }

  const provider = resolveProvider(job.provider);
  const status = await provider.getStatus(job.providerJobId);

  switch (status.state) {
    case "pending":
      return job;
    case "running": {
      if (job.status === "running") return job;
      const [running] = await db
        .update(generationJobs)
        .set({ status: "running" })
        .where(
          and(
            eq(generationJobs.id, jobId),
            eq(generationJobs.status, "pending"),
          ),
        )
        .returning();
      return running ?? getJobOrThrow(db, jobId);
    }
    case "succeeded":
      return completeJob(
        db,
        jobId,
        await provider.fetchOutput(job.providerJobId),
        now,
      );
    case "failed":
      return failJob(db, jobId, status.error, now);
  }
}

/** Polling de respaldo: sincroniza los jobs en curso más antiguos. */
export async function syncActiveJobs(
  db: Database,
  resolveProvider: ProviderResolver,
  options: { now?: Date; limit?: number } = {},
): Promise<{ checked: number; errors: number }> {
  const jobs = await db
    .select({ id: generationJobs.id })
    .from(generationJobs)
    .where(inArray(generationJobs.status, activeStatuses))
    .orderBy(asc(generationJobs.createdAt))
    .limit(options.limit ?? 50);

  let errors = 0;
  for (const { id } of jobs) {
    try {
      await syncJob(db, resolveProvider, id, options.now);
    } catch (error) {
      errors += 1;
      console.error(`No se pudo sincronizar el job ${id}`, error);
    }
  }
  return { checked: jobs.length, errors };
}
