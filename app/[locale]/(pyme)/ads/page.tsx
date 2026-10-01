import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LayoutGridIcon,
  PlusIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AdCard } from "@/components/ads/ad-card";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import {
  appPrimaryClassName,
  appSecondaryClassName,
} from "@/components/app/ui";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { signThumbnails } from "@/lib/ads/files";
import { listOrganizationJobs } from "@/lib/ads/service";
import { requireOrganization } from "@/lib/auth/session";
import { buckets } from "@/lib/storage";
import { getStorage } from "@/lib/storage/supabase";

const PAGE_SIZE = 24;

/** Galería: todos los anuncios de la organización, por páginas. */
export default async function AdGalleryPage({
  searchParams,
}: PageProps<"/[locale]/ads">) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(String(pageParam ?? "1"), 10) || 1);

  const { organization } = await requireOrganization();
  const [{ jobs, hasMore }, t] = await Promise.all([
    listOrganizationJobs(getDb(), organization.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getTranslations("AdGallery"),
  ]);
  const thumbnails = await signThumbnails(getStorage(buckets.adOutputs), jobs);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("title")}
        description={t("description", { name: organization.name })}
        actions={
          <Link href="/create" className={appPrimaryClassName}>
            <PlusIcon aria-hidden />
            {t("create")}
          </Link>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={LayoutGridIcon}
          title={t("emptyTitle")}
          description={t("empty")}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <AdCard job={job} thumbnailUrl={thumbnails.get(job.id)} />
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <nav className="flex justify-between gap-4">
          {page > 1 ? (
            <Link
              href={{ pathname: "/ads", query: { page: page - 1 } }}
              className={appSecondaryClassName}
            >
              <ArrowLeftIcon aria-hidden />
              {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link
              href={{ pathname: "/ads", query: { page: page + 1 } }}
              className={appSecondaryClassName}
            >
              {t("older")}
              <ArrowRightIcon aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
