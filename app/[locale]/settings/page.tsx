import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { AdvancedModeSwitch } from "@/components/settings/advanced-mode-switch";
import { Card, CardContent } from "@/components/ui/card";
import { requireOrganization } from "@/lib/auth/session";
import { isAdvancedMode, segmentConfig } from "@/lib/segment";

export default async function SettingsPage() {
  const { organization, membership, user } = await requireOrganization();
  const t = await getTranslations("Settings");

  return (
    <AppShell
      homePath={segmentConfig[organization.segment].homePath}
      isPlatformAdmin={user.isPlatformAdmin}
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">
          {t("description", { name: organization.name })}
        </p>
      </div>
      <Card>
        <CardContent>
          <AdvancedModeSwitch
            enabled={isAdvancedMode(organization.segment)}
            canEdit={membership.role === "admin"}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
