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
import { updatePassword } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/schema";

import { AuthErrorAlert } from "./form-alert";

export function UpdatePasswordForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(
    updatePassword,
    undefined,
  );
  const error = state && "error" in state ? state.error : undefined;

  return (
    <form action={formAction}>
      <FieldGroup>
        <AuthErrorAlert error={error} />
        <Field>
          <FieldLabel htmlFor="password">{t("newPassword")}</FieldLabel>
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
        <Field>
          <FieldLabel htmlFor="confirmPassword">
            {t("confirmPassword")}
          </FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {t("updatePassword.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
