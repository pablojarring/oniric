"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/schema";

import { AuthErrorAlert, SuccessAlert } from "./form-alert";

export function SignupForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(signUp, undefined);

  if (state && "status" in state) {
    return (
      <SuccessAlert title={t("signup.checkEmailTitle")}>
        {t("signup.checkEmail", { email: state.email })}
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
        <Field>
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            aria-describedby="password-hint"
          />
          <FieldDescription id="password-hint">
            {t("passwordHint", { min: MIN_PASSWORD_LENGTH })}
          </FieldDescription>
        </Field>
        <Button type="submit" disabled={pending}>
          {t("signup.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
