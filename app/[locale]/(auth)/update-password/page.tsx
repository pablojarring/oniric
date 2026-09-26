import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { requireUser } from "@/lib/auth/session";

// Se llega aquí desde el correo de recuperación, que ya abrió una sesión.
export default async function UpdatePasswordPage() {
  await requireUser();
  const t = await getTranslations("Auth.updatePassword");

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <UpdatePasswordForm />
    </AuthCard>
  );
}
