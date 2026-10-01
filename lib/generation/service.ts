import { and, asc, count, eq, gt, inArray, sql } from "drizzle-orm";

import {
  generationJobs,
  organizations,
  type GenerationJob,
  type GenerationStatus,
} from "@/db/schema";
import type { Database } from "@/db/types";
import type { AdBrief } from "@/lib/ads/types";
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
} from "@/lib/providers/generation-provider";
import type { FileStorage } from "@/lib/storage";

import { OutputRejectedError, storeOutputs } from "./outputs";
import type { StoredOutput } from "./types";

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

/** El precio cambió entre la cotización que vio el cliente y el envío. */
export class PriceChangedError extends Error {
  constructor(readonly priceCredits: number) {
    super(`El precio cambió a ${priceCredits} créditos.`);
  }
}

export type RateLimit = { maxJobs: number; windowSeconds: number };

/**
 * Máximo de generaciones por organización (CLAUDE.md §7). Frena el abuso y los
 * errores de integración; el saldo ya impide gastar de más.
 *
 * TODO(producto): valor definitivo y si cambia por segmento (empresa genera
 * por lotes en la fase 2).
 */
export const GENERATION_RATE_LIMIT: RateLimit = {
  maxJobs: 20,
  windowSeconds: 60 * 60,
};

export class RateLimitExceededError extends Error {
  constructor(readonly limit: RateLimit) {
    super(
      `Límite de ${limit.maxJobs} generaciones cada ${limit.windowSeconds} s alcanzado.`,
    );
  }
}

export type ProviderResolver = (providerId: string) => GenerationProvider;

/** Lo que necesita la sincronización: el proveedor de cada job y dónde copiar los resultados. */
export type SyncDeps = {
  resolveProvider: ProviderResolver;
  /** Bucket `ad-outputs`. */
  outputs: FileStorage;
};

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
 * proveedor. Lanza InsufficientCreditsError si no alcanza el saldo,
 * RateLimitExceededError si la organización superó el límite y
 * PriceChangedError si el precio no es el esperado; en esos casos no crea nada.
 * Si el envío falla, devuelve el job fallido con los créditos devueltos.
 */
export async function startGeneration(
  db: Database,
  provider: GenerationProvider,
  input: {
    organizationId: string;
    userId: string;
    request: GenerationRequest;
    /** Precio que vio el cliente antes de confirmar. */
    expectedPriceCredits?: number;
    /** Datos del asistente pyme. */
    ad?: { templateId: string; brief: AdBrief; inputImagePath: string | null };
    rateLimit?: RateLimit;
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
  if (
    input.expectedPriceCredits !== undefined &&
    input.expectedPriceCredits !== quote.priceCredits
  ) {
    throw new PriceChangedError(quote.priceCredits);
  }

  const rateLimit = input.rateLimit ?? GENERATION_RATE_LIMIT;
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
        templateId: input.ad?.templateId,
        brief: input.ad?.brief,
        inputImagePath: input.ad?.inputImagePath,
      })
      .returning();
    if (!created) throw new Error("No se pudo crear el job.");

    await reserveCredits(tx, {
      organizationId: input.organizationId,
      jobId: created.id,
      credits: quote.priceCredits,
      now: input.now,
    });

    // La reserva bloqueó la billetera de la organización, así que las
    // generaciones simultáneas de la misma organización se cuentan en orden.
    const [recent] = await tx
      .select({ jobs: count() })
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.organizationId, input.organizationId),
          gt(
            generationJobs.createdAt,
            sql`now() - make_interval(secs => ${rateLimit.windowSeconds})`,
          ),
        ),
      );
    if ((recent?.jobs ?? 0) > rateLimit.maxJobs) {
      throw new RateLimitExceededError(rateLimit);
    }
    return created;
  });

  let providerJobId: string;
  try {
    ({ providerJobId } = await provider.submit(request, {
      reference: job.id,
    }));
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

/**
 * Marca el job como exitoso y cobra la reserva, en una sola transacción. Los
 * resultados ya deben estar copiados en nuestro almacenamiento.
 */
async function completeJob(
  db: Database,
  jobId: string,
  outputs: StoredOutput[],
  now = new Date(),
): Promise<GenerationJob> {
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
 *
 * Si la copia de los resultados falla, lanza el error y el job sigue en curso:
 * la próxima sincronización lo reintenta. Si un resultado nunca se va a poder
 * guardar (demasiado grande o de un tipo no soportado), el job falla y se
 * reembolsa.
 *
 * TODO(fase 3): dar el job por fallido (y reembolsar) si la copia sigue
 * fallando cuando los archivos del proveedor están por vencer.
 */
export async function syncJob(
  db: Database,
  deps: SyncDeps,
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

  const provider = deps.resolveProvider(job.provider);
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
    case "succeeded": {
      const outputs = await provider.fetchOutput(job.providerJobId);
      // Nunca se cobra una generación sin resultado.
      if (outputs.length === 0) return failJob(db, jobId, "no_outputs", now);
      // Primero se copia (fuera de la transacción, es tráfico de red) y
      // después se cobra.
      try {
        const stored = await storeOutputs(deps.outputs, job, outputs);
        return completeJob(db, jobId, stored, now);
      } catch (error) {
        if (error instanceof OutputRejectedError) {
          return failJob(db, jobId, error.reason, now);
        }
        throw error;
      }
    }
    case "failed":
      return failJob(db, jobId, status.error, now);
  }
}

/** Polling de respaldo: sincroniza los jobs en curso más antiguos. */
export async function syncActiveJobs(
  db: Database,
  deps: SyncDeps,
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
      await syncJob(db, deps, id, options.now);
    } catch (error) {
      errors += 1;
      console.error(`No se pudo sincronizar el job ${id}`, error);
    }
  }
  return { checked: jobs.length, errors };
}
