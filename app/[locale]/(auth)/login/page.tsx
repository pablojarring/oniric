import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { OrSeparator } from "@/components/auth/or-separator";
import type { Locale } from "@/i18n/config";
import { Link, redirect } from "@/i18n/navigation";
import { authLinkError, searchParam } from "@/lib/auth/page-params";
import { getCurrentUser, resolveHomePath } from "@/lib/auth/session";
import { isGoogleAuthEnabled } from "@/lib/env";

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale } = (await params) as { locale: Locale };
  const user = await getCurrentUser();
  if (user) redirect({ href: await resolveHomePath(user.id), locale });

  const query = await searchParams;
  const next = searchParam(query.next);
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("login.title")}
      description={t("login.description")}
      footer={
        <p>
          {t("login.noAccount")}{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("login.signupLink")}
          </Link>
        </p>
      }
    >
      <LoginForm next={next} initialError={authLinkError(query.error)} />
      {isGoogleAuthEnabled() && (
        <>
          <OrSeparator />
          <GoogleButton next={next} />
        </>
      )}
    </AuthCard>
  );
}
