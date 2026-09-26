import { getTranslations } from "next-intl/server";

import { requireOrganization } from "@/lib/auth/session";

export default async function PymeHomePage() {
  const { organization } = await requireOrganization();
  const t = await getTranslations("PymeHome");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {t("title", { name: organization.name })}
      </h1>
      <p className="text-muted-foreground">{t("description")}</p>
    </div>
  );
}
