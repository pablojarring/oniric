import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { OrSeparator } from "@/components/auth/or-separator";
import { SignupForm } from "@/components/auth/signup-form";
import type { Locale } from "@/i18n/config";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser, resolveHomePath } from "@/lib/auth/session";
import { isGoogleAuthEnabled } from "@/lib/env";

export default async function SignupPage({
  params,
}: PageProps<"/[locale]/signup">) {
  const { locale } = (await params) as { locale: Locale };
  const user = await getCurrentUser();
  if (user) redirect({ href: await resolveHomePath(user.id), locale });

  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("signup.title")}
      description={t("signup.description")}
      footer={
        <p>
          {t("signup.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("signup.loginLink")}
          </Link>
        </p>
      }
    >
      <SignupForm />
      {isGoogleAuthEnabled() && (
        <>
          <OrSeparator />
          <GoogleButton />
        </>
      )}
    </AuthCard>
  );
}
