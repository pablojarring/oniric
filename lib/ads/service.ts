import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { generationJobs, type GenerationJob, type Segment } from "@/db/schema";
import type { Database } from "@/db/types";
import { priceGeneration } from "@/lib/billing/pricing";
import { InsufficientCreditsError } from "@/lib/billing/wallet";
import {
  PriceChangedError,
  RateLimitExceededError,
  startGeneration,
} from "@/lib/generation/service";
import { moderateText } from "@/lib/moderation";
import type {
  AspectRatio,
  GenerationProvider,
  GenerationRequest,
} from "@/lib/providers/generation-provider";
import {
  adTemplates,
  buildPrompt,
  modelForTemplate,
  type AdTemplate,
  type TemplateId,
} from "@/lib/templates";
import { validateImage } from "@/lib/uploads/images";
import {
  INPUT_IMAGE_URL_TTL_SECONDS,
  type PhotoStorage,
} from "@/lib/uploads/storage";

import type { AdForm } from "./schema";
import type { AdBrief } from "./types";

// Anuncios del asistente pyme: de lo que completa el cliente a un job de
// generación. La plantilla decide el modelo y los parámetros (CLAUDE.md §4).

function templateRequest(
  template: AdTemplate,
  provider: GenerationProvider,
  aspectRatio: AspectRatio,
  prompt: string,
  inputImageUrl?: string,
): GenerationRequest {
  return {
    modelId: modelForTemplate(template, provider.id),
    prompt,
    aspectRatio,
    durationSeconds: template.durationSeconds,
    inputImageUrl,
  };
}

export type TemplatePrices = Record<
  TemplateId,
  Partial<Record<AspectRatio, number>>
>;

/** Precio en créditos de cada plantilla y formato, para mostrarlo antes de generar. */
export async function quoteTemplates(
  db: Database,
  provider: GenerationProvider,
  segment: Segment,
): Promise<TemplatePrices> {
  const entries = await Promise.all(
    Object.values(adTemplates).map(async (template) => {
      const prices: Partial<Record<AspectRatio, number>> = {};
      for (const aspectRatio of template.aspectRatios) {
        const request = templateRequest(template, provider, aspectRatio, "");
        const { costUsd } = await provider.estimate(request);
        const quote = await priceGeneration(db, {
          provider: provider.id,
          modelId: request.modelId,
          segment,
          costUsd,
        });
        prices[aspectRatio] = quote.priceCredits;
      }
      return [template.id, prices] as const;
    }),
  );
  return Object.fromEntries(entries) as TemplatePrices;
}

export type CreateAdError =
  | { code: "moderation" }
  | { code: "photoTooLarge" }
  | { code: "photoUnsupportedType" }
  | { code: "insufficientCredits"; required: number; available: number }
  | { code: "rateLimited" }
  | { code: "priceChanged"; priceCredits: number };

export type CreateAdResult =
  { ok: true; job: GenerationJob } | { ok: false; error: CreateAdError };

/**
 * Crea el anuncio: modera los textos, valida y sube la foto, arma el prompt de
 * la plantilla y arranca la generación (que reserva los créditos). Si no se
 * puede generar, borra la foto subida.
 */
export async function createAd(
  db: Database,
  deps: { provider: GenerationProvider; storage: PhotoStorage },
  input: {
    organizationId: string;
    userId: string;
    form: AdForm;
    now?: Date;
  },
): Promise<CreateAdResult> {
  const { form } = input;
  const template = adTemplates[form.templateId];
  const offer = template.requiresOffer ? form.offer : "";

  const moderation = moderateText([
    form.productName,
    form.description,
    offer,
    form.adCopy,
  ]);
  if (!moderation.allowed) return { ok: false, error: { code: "moderation" } };

  let photo: { bytes: Uint8Array; mimeType: string; path: string } | null =
    null;
  if (form.photo) {
    const image = await validateImage(form.photo);
    if (!image.ok) {
      return {
        ok: false,
        error: {
          code:
            image.error === "tooLarge"
              ? "photoTooLarge"
              : "photoUnsupportedType",
        },
      };
    }
    photo = {
      bytes: image.bytes,
      mimeType: image.mimeType,
      path: `${input.organizationId}/${randomUUID()}.${image.extension}`,
    };
  }

  const brief: AdBrief = {
    productName: form.productName,
    ...(form.description && { description: form.description }),
    ...(offer && { offer }),
    adCopy: form.adCopy,
    photoConsent: photo !== null && form.photoConsent,
  };
  const prompt = buildPrompt(template, { ...brief, hasProductPhoto: !!photo });

  let inputImageUrl: string | undefined;
  if (photo) {
    await deps.storage.upload(photo.path, photo.bytes, photo.mimeType);
    inputImageUrl = await deps.storage.createSignedUrl(
      photo.path,
      INPUT_IMAGE_URL_TTL_SECONDS,
    );
  }

  try {
    const job = await startGeneration(db, deps.provider, {
      organizationId: input.organizationId,
      userId: input.userId,
      request: templateRequest(
        template,
        deps.provider,
        form.aspectRatio,
        prompt,
        inputImageUrl,
      ),
      expectedPriceCredits: form.expectedPriceCredits,
      ad: {
        templateId: template.id,
        brief,
        inputImagePath: photo?.path ?? null,
      },
      now: input.now,
    });
    return { ok: true, job };
  } catch (error) {
    if (photo) {
      await deps.storage.remove(photo.path).catch((cleanupError: unknown) => {
        console.error(`No se pudo borrar la foto ${photo.path}`, cleanupError);
      });
    }
    if (error instanceof InsufficientCreditsError) {
      return {
        ok: false,
        error: {
          code: "insufficientCredits",
          required: error.required,
          available: error.available,
        },
      };
    }
    if (error instanceof RateLimitExceededError) {
      return { ok: false, error: { code: "rateLimited" } };
    }
    if (error instanceof PriceChangedError) {
      return {
        ok: false,
        error: { code: "priceChanged", priceCredits: error.priceCredits },
      };
    }
    throw error;
  }
}

/** Job de la organización, o null si no existe o es de otra organización. */
export async function getOrganizationJob(
  db: Database,
  organizationId: string,
  jobId: string,
): Promise<GenerationJob | null> {
  if (!z.uuid().safeParse(jobId).success) return null;
  const [job] = await db
    .select()
    .from(generationJobs)
    .where(
      and(
        eq(generationJobs.id, jobId),
        eq(generationJobs.organizationId, organizationId),
      ),
    );
  return job ?? null;
}
