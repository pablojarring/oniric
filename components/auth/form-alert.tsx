import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AuthFormError } from "@/lib/auth/errors";

export function AuthErrorAlert({ error }: { error?: AuthFormError }) {
  const t = useTranslations("Auth.errors");
  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertDescription>{t(error)}</AlertDescription>
    </Alert>
  );
}

export function SuccessAlert({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Alert role="status">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
