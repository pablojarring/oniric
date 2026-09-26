"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { signIn } from "@/lib/auth/actions";
import type { AuthFormError } from "@/lib/auth/errors";

import { AuthErrorAlert } from "./form-alert";

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: AuthFormError;
}) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const error = state && "error" in state ? state.error : initialError;

  return (
    <form action={formAction}>
      {next && <input type="hidden" name="next" value={next} />}
      <FieldGroup>
        <AuthErrorAlert error={error} />
        <Field>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            // Remonta el campo para mostrar el correo que devolvió el servidor.
            key={state?.email}
            defaultValue={state?.email}
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("login.forgotPassword")}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {t("login.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
