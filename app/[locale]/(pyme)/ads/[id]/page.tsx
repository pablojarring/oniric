import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { AdOutput } from "@/components/ads/ad-output";
import { AdStatusPoller } from "@/components/ads/ad-status-poller";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { getOrganizationJob } from "@/lib/ads/service";
import { requireOrganization } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { isTemplateId } from "@/lib/templates";

export default async function AdPage({
  params,
}: PageProps<"/[locale]/ads/[id]">) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const job = await getOrganizationJob(getDb(), organization.id, id);
  if (!job) notFound();

  const [t, tTemplates, locale] = await Promise.all([
    getTranslations("AdPage"),
    getTranslations("Templates"),
    getLocale(),
  ]);
  const templateName =
    job.templateId && isTemplateId(job.templateId)
      ? tTemplates(`items.${job.templateId}.name`)
      : job.modelId;
  const title = job.brief?.productName ?? templateName;
  const inProgress = job.status === "pending" || job.status === "running";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/home"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {t("backHome")}
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground" data-testid="ad-status">
          {t(`status.${job.status}`)}
        </p>
      </div>

      {inProgress && (
        <Alert>
          <AlertTitle>{t("inProgress.title")}</AlertTitle>
          <AlertDescription>{t("inProgress.description")}</AlertDescription>
          <AdStatusPoller jobId={job.id} status={job.status} />
        </Alert>
      )}

      {job.status === "succeeded" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-semibold">
            {t("succeeded.title")}
          </h2>
          {job.outputs?.map((output) => (
            <AdOutput
              key={output.url}
              output={output}
              alt={t("outputAlt", { product: title })}
            />
          ))}
        </section>
      )}

      {job.status === "failed" && (
        <Alert variant="destructive">
          <AlertTitle>{t("failed.title")}</AlertTitle>
          <AlertDescription>
            {t("failed.description", { count: job.priceCredits })}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label={t("details.template")} value={templateName} />
            <Detail
              label={t("details.format")}
              value={tTemplates(`formats.${job.request.aspectRatio}`)}
            />
            <Detail
              label={t("details.price")}
              value={t("details.credits", { count: job.priceCredits })}
            />
            <Detail
              label={t("details.createdAt")}
              value={formatDateTime(job.createdAt, locale)}
            />
            {job.brief && (
              <div className="flex flex-col gap-0.5 sm:col-span-2">
                <dt className="text-muted-foreground">{t("details.copy")}</dt>
                <dd className="whitespace-pre-line">{job.brief.adCopy}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {!inProgress && (
        <Link
          href="/create"
          className={buttonVariants({ className: "self-start" })}
        >
          {job.status === "failed" ? t("failed.retry") : t("createAnother")}
        </Link>
      )}
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
