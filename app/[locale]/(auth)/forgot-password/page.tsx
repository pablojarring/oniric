import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Link } from "@/i18n/navigation";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("Auth.forgotPassword");

  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
