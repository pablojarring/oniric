"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { creditOrganization } from "@/lib/admin/actions";
import { creditsToUsd, formatUsd } from "@/lib/format";
import {
  MAX_MANUAL_CREDITS,
  MAX_REFERENCE_LENGTH,
} from "@/lib/payments/manual";

/** Acreditación manual de créditos a una organización. */
export function CreditForm({ organizationId }: { organizationId: string }) {
  const t = useTranslations("Admin.credit");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    creditOrganization,
    undefined,
  );
  const [credits, setCredits] = useState("");
  const [reference, setReference] = useState("");

  // Después de acreditar se vacía el formulario, para no repetirlo sin querer.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.ok) {
      setCredits("");
      setReference("");
    }
  }

  const amount = Number(credits);
  const error = state?.ok === false ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      <FieldGroup>
        <Field data-invalid={error === "credits"}>
          <FieldLabel htmlFor="credits">{t("credits")}</FieldLabel>
          <Input
            id="credits"
            name="credits"
            type="number"
            min={1}
            max={MAX_MANUAL_CREDITS}
            step={1}
            required
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            aria-invalid={error === "credits"}
            className="max-w-48"
          />
          {Number.isInteger(amount) && amount > 0 && (
            <FieldDescription>
              {t("equivalent", {
                usd: formatUsd(creditsToUsd(amount), locale),
              })}
            </FieldDescription>
          )}
          {error === "credits" && (
            <FieldError>{t("errors.credits")}</FieldError>
          )}
        </Field>
        <Field data-invalid={error === "reference"}>
          <FieldLabel htmlFor="reference">{t("reference")}</FieldLabel>
          <Input
            id="reference"
            name="reference"
            required
            maxLength={MAX_REFERENCE_LENGTH}
            placeholder={t("referencePlaceholder")}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            aria-invalid={error === "reference"}
          />
          {error === "reference" && (
            <FieldError>{t("errors.reference")}</FieldError>
          )}
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("submitting") : t("submit")}
      </Button>
      {state?.ok && (
        <Alert>
          <AlertDescription>
            {t("success", { count: state.credits })}
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
