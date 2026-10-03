import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { PageHeader } from "@/components/app/page-header";
import { CreativeSession } from "@/components/creative/creative-session";
import { DirectorSteps } from "@/components/creative/director-steps";
import { toSessionData } from "@/components/creative/session-data";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { requireOrganization } from "@/lib/auth/session";
import { MAX_QUESTIONS } from "@/lib/creative/limits";
import {
  type CreativeContext,
  CreativeFlowError,
  getCreativeSession,
} from "@/lib/creative/service";
import { hasFeature } from "@/lib/segment";

/** Una sesión del director creativo, en el paso donde quedó. */
export default async function DirectorSessionPage({
  params,
}: PageProps<"/[locale]/director/[id]">) {
  const { id } = await params;
  const { user, organization } = await requireOrganization();
  if (!hasFeature(organization.segment, "creativeDirector")) notFound();

  const session = await findSession({ user, organization }, id);
  if (!session) notFound();
  const t = await getTranslations("Director.session");

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/director"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t(`titles.${session.status}`)}
        description={t(`descriptions.${session.status}`)}
      />
      <DirectorSteps status={session.status} />
      <CreativeSession
        session={toSessionData(session)}
        maxQuestions={MAX_QUESTIONS}
      />
    </div>
  );
}

async function findSession(context: CreativeContext, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  try {
    return await getCreativeSession(getDb(), context, id);
  } catch (error) {
    if (error instanceof CreativeFlowError && error.code === "notFound") {
      return null;
    }
    throw error;
  }
}
