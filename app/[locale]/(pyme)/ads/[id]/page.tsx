import { cn } from "cn";
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  DownloadIcon,
  LoaderCircleIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { AdOutput } from "@/components/ads/ad-output";
import { AdShare } from "@/components/ads/ad-share";
import { AdStatusBadge } from "@/components/ads/ad-status-badge";
import { AdStatusPoller } from "@/components/ads/ad-status-poller";
import { CopyTextButton } from "@/components/ads/copy-text-button";
import {
  appCardClassName,
  appPrimaryClassName,
  appSecondaryClassName,
} from "@/components/app/ui";
import { getDb } from "@/db";
import type { GenerationStatus } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { signOutputs } from "@/lib/ads/files";
import { getOrganizationJob } from "@/lib/ads/service";
import { shareUrlFor } from "@/lib/ads/sharing";
import { requireOrganization } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import type { AspectRatio } from "@/lib/providers/generation-provider";
import { buckets } from "@/lib/storage";
import { getStorage } from "@/lib/storage/supabase";
import { isSeasonId } from "@/lib/seasons";
import { isTemplateId } from "@/lib/templates";

const aspectClassNames: Record<AspectRatio, string> = {
  "9:16": "aspect-9/16 h-[60vh] max-h-[560px]",
  "1:1": "aspect-square w-full max-w-md",
  "16:9": "aspect-video w-full max-w-2xl",
};

const progressSteps = ["queued", "creating", "ready"] as const;

/** Paso del progreso en el que está cada estado. */
const progressIndex: Record<GenerationStatus, number> = {
  pending: 0,
  running: 1,
  succeeded: 2,
  failed: 1,
};

export default async function AdPage({
  params,
}: PageProps<"/[locale]/ads/[id]">) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const job = await getOrganizationJob(getDb(), organization.id, id);
  if (!job) notFound();

  const [t, tTemplates, tSeasons, locale, outputs] = await Promise.all([
    getTranslations("AdPage"),
    getTranslations("Templates"),
    getTranslations("Seasons"),
    getLocale() as Promise<Locale>,
    job.status === "succeeded"
      ? signOutputs(getStorage(buckets.adOutputs), job)
      : [],
  ]);
  const templateName =
    job.templateId && isTemplateId(job.templateId)
      ? tTemplates(`items.${job.templateId}.name`)
      : job.modelId;
  const title = job.brief?.productName ?? templateName;
  const inProgress = job.status === "pending" || job.status === "running";
  const aspectRatio = job.request.aspectRatio;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/ads"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {t("backToGallery")}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <AdStatusBadge status={job.status} data-testid="ad-status" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section
          className={cn(
            appCardClassName,
            "relative isolate grid min-h-80 place-items-center gap-6 overflow-hidden p-4 sm:p-8",
          )}
        >
          <div aria-hidden className="absolute inset-0 -z-10 bg-dots" />
          {job.status === "succeeded" &&
            outputs.map((output) => (
              <AdOutput
                key={output.path}
                output={output}
                url={output.url}
                alt={t("outputAlt", { product: title })}
                className="max-h-[70vh] w-auto rounded-2xl shadow-2xl shadow-violet-900/20"
              />
            ))}
          {inProgress && (
            <div
              aria-hidden
              className={cn(
                "relative grid place-items-center overflow-hidden rounded-2xl bg-linear-to-br from-violet-500 via-fuchsia-500 to-orange-400 shadow-2xl shadow-violet-900/20",
                aspectClassNames[aspectRatio],
              )}
            >
              <div className="absolute inset-0 animate-pulse bg-white/20 motion-reduce:animate-none" />
              <LoaderCircleIcon className="relative size-10 animate-spin text-white motion-reduce:animate-none" />
            </div>
          )}
          {job.status === "failed" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <span className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <CircleAlertIcon aria-hidden className="size-7" />
              </span>
              <p className="max-w-xs text-sm">{t("failed.stage")}</p>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          {job.status === "succeeded" && (
            <div className={cn(appCardClassName, "flex flex-col gap-4 p-5")}>
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-xl font-semibold">
                  {t("succeeded.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("succeeded.description")}
                </p>
              </div>
              {outputs.map((output, index) => (
                <a
                  key={output.path}
                  href={output.downloadUrl}
                  className={cn(appPrimaryClassName, "w-full")}
                >
                  <DownloadIcon aria-hidden />
                  {outputs.length > 1
                    ? t("downloadNumbered", { number: index + 1 })
                    : t("download")}
                </a>
              ))}
              <Link
                href="/create"
                className={cn(appSecondaryClassName, "w-full")}
              >
                <PlusIcon aria-hidden />
                {t("createAnother")}
              </Link>
            </div>
          )}

          {inProgress && (
            <div className={cn(appCardClassName, "flex flex-col gap-4 p-5")}>
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-xl font-semibold">
                  {t("inProgress.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("inProgress.description")}
                </p>
              </div>
              <ol className="flex flex-col gap-3">
                {progressSteps.map((step, index) => {
                  const current = progressIndex[job.status];
                  const done = index < current;
                  const active = index === current;
                  return (
                    <li
                      key={step}
                      className={cn(
                        "flex items-center gap-3 text-sm",
                        !done && !active && "text-muted-foreground",
                        active && "font-semibold",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full border",
                          done &&
                            "border-transparent bg-emerald-500 text-white",
                          active &&
                            "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200",
                        )}
                      >
                        {done ? (
                          <CheckIcon aria-hidden className="size-4" />
                        ) : active ? (
                          <LoaderCircleIcon
                            aria-hidden
                            className="size-4 animate-spin motion-reduce:animate-none"
                          />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </span>
                      {t(`progress.${step}`)}
                    </li>
                  );
                })}
              </ol>
              <AdStatusPoller jobId={job.id} status={job.status} />
            </div>
          )}

          {job.status === "failed" && (
            <div
              className={cn(
                appCardClassName,
                "flex flex-col gap-4 border-red-200 bg-red-50/50 p-5 dark:border-red-500/30 dark:bg-red-500/5",
              )}
            >
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-xl font-semibold">
                  {t("failed.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("failed.description", { count: job.priceCredits })}
                </p>
              </div>
              <Link
                href="/create"
                className={cn(appPrimaryClassName, "w-full")}
              >
                <RotateCcwIcon aria-hidden />
                {t("failed.retry")}
              </Link>
            </div>
          )}

          {job.status === "succeeded" && (
            <AdShare
              jobId={job.id}
              initialUrl={job.shareToken ? shareUrlFor(job.shareToken) : null}
              message={job.brief?.adCopy}
            />
          )}

          {job.brief && (
            <div className={cn(appCardClassName, "flex flex-col gap-3 p-5")}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold">
                  {t("details.copy")}
                </h2>
                <CopyTextButton text={job.brief.adCopy} />
              </div>
              <p className="rounded-2xl bg-muted/60 p-4 text-sm whitespace-pre-line">
                {job.brief.adCopy}
              </p>
            </div>
          )}

          <div className={cn(appCardClassName, "p-5")}>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Detail label={t("details.template")} value={templateName} />
              <Detail
                label={t("details.format")}
                value={tTemplates(`formatsShort.${aspectRatio}`)}
              />
              <Detail
                label={t("details.price")}
                value={t("details.credits", { count: job.priceCredits })}
              />
              <Detail
                label={t("details.createdAt")}
                value={formatDateTime(job.createdAt, locale)}
              />
              {isSeasonId(job.brief?.seasonId) && (
                <Detail
                  label={t("details.season")}
                  value={tSeasons(`items.${job.brief.seasonId}.name`)}
                />
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
