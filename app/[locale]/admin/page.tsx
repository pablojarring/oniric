import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { requirePlatformAdmin } from "@/lib/auth/session";

export default async function AdminPage() {
  await requirePlatformAdmin();
  redirect({ href: "/admin/organizations", locale: await getLocale() });
}
