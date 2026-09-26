"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth/actions";

import { AuthErrorAlert, SuccessAlert } from "./form-alert";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    undefined,
  );

  if (state && "status" in state) {
    return (
      <SuccessAlert title={t("forgotPassword.sentTitle")}>
        {t("forgotPassword.sent", { email: state.email })}
      </SuccessAlert>
    );
  }

  return (
    <form action={formAction}>
      <FieldGroup>
        <AuthErrorAlert error={state?.error} />
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
        <Button type="submit" disabled={pending}>
          {t("forgotPassword.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
