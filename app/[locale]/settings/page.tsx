import { cn } from "cn";
import { Building2Icon, SlidersHorizontalIcon, UserIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { appCardClassName } from "@/components/app/ui";
import { AdvancedModeSwitch } from "@/components/settings/advanced-mode-switch";
import { localeInfo, type Locale } from "@/i18n/config";
import { requireOrganization } from "@/lib/auth/session";
import { isAdvancedMode } from "@/lib/segment";

export default async function SettingsPage() {
  const context = await requireOrganization();
  const { organization, membership, user } = context;
  const [t, tOnboarding, locale] = await Promise.all([
    getTranslations("Settings"),
    getTranslations("Onboarding"),
    getLocale() as Promise<Locale>,
  ]);
  const regionNames = new Intl.DisplayNames([localeInfo[locale].formatLocale], {
    type: "region",
  });

  return (
    <AppShell context={context}>
      <PageHeader
        title={t("title")}
        description={t("description", { name: organization.name })}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsCard icon={Building2Icon} title={t("business.title")}>
          <dl className="grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <Detail label={t("business.name")} value={organization.name} />
            <Detail
              label={t("business.country")}
              value={
                regionNames.of(organization.country) ?? organization.country
              }
            />
            <Detail
              label={t("business.industry")}
              value={tOnboarding(`options.industries.${organization.industry}`)}
            />
          </dl>
        </SettingsCard>
        <SettingsCard icon={UserIcon} title={t("account.title")}>
          <dl className="grid gap-4 text-sm">
            <Detail label={t("account.email")} value={user.email} />
          </dl>
        </SettingsCard>
        <SettingsCard
          icon={SlidersHorizontalIcon}
          title={t("mode.title")}
          className="lg:col-span-2"
        >
          <AdvancedModeSwitch
            enabled={isAdvancedMode(organization.segment)}
            canEdit={membership.role === "admin"}
          />
        </SettingsCard>
      </div>
    </AppShell>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: typeof UserIcon;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        appCardClassName,
        "flex flex-col gap-4 p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          <Icon aria-hidden className="size-4.5" />
        </span>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
