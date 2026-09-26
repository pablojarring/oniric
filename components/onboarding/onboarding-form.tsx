"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { completeOnboarding } from "@/lib/onboarding/actions";
import {
  industries,
  teamSizeValues,
  teamTypes,
  videoPurposes,
  type VideoPurpose,
} from "@/lib/onboarding/options";
import type { OnboardingField } from "@/lib/onboarding/schema";

export type CountryOption = { value: string; label: string };

// Los campos son controlados para que conserven lo elegido si el servidor
// devuelve errores (React reinicia los formularios no controlados).
export function OnboardingForm({ countries }: { countries: CountryOption[] }) {
  const t = useTranslations("Onboarding");
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    undefined,
  );
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [teamType, setTeamType] = useState("");
  const [purposes, setPurposes] = useState<VideoPurpose[]>([]);

  const hasError = (field: OnboardingField) =>
    state?.fieldErrors.includes(field) ?? false;
  const errorFor = (field: OnboardingField) =>
    hasError(field) ? <FieldError>{t(`errors.${field}`)}</FieldError> : null;

  function togglePurpose(purpose: VideoPurpose, checked: boolean) {
    setPurposes((current) =>
      checked
        ? [...current, purpose]
        : current.filter((item) => item !== purpose),
    );
  }

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field data-invalid={hasError("businessName")}>
          <FieldLabel htmlFor="businessName">
            {t("fields.businessName")}
          </FieldLabel>
          <Input
            id="businessName"
            name="businessName"
            autoComplete="organization"
            required
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            aria-invalid={hasError("businessName")}
          />
          {errorFor("businessName")}
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={hasError("country")}>
            <FieldLabel htmlFor="country">{t("fields.country")}</FieldLabel>
            <NativeSelect
              id="country"
              name="country"
              required
              className="w-full"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              aria-invalid={hasError("country")}
            >
              <NativeSelectOption value="" disabled>
                {t("fields.countryPlaceholder")}
              </NativeSelectOption>
              {countries.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {errorFor("country")}
          </Field>

          <Field data-invalid={hasError("industry")}>
            <FieldLabel htmlFor="industry">{t("fields.industry")}</FieldLabel>
            <NativeSelect
              id="industry"
              name="industry"
              required
              className="w-full"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              aria-invalid={hasError("industry")}
            >
              <NativeSelectOption value="" disabled>
                {t("fields.industryPlaceholder")}
              </NativeSelectOption>
              {industries.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {t(`options.industries.${value}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {errorFor("industry")}
          </Field>
        </div>

        <FieldSet data-invalid={hasError("teamSize")}>
          <FieldLegend id="teamSize-legend" variant="label">
            {t("fields.teamSize")}
          </FieldLegend>
          <RadioGroup
            name="teamSize"
            value={teamSize}
            onValueChange={(value) => setTeamSize(String(value))}
            aria-labelledby="teamSize-legend"
            className="grid-cols-2 sm:grid-cols-3"
          >
            {teamSizeValues.map((value) => (
              <Field key={value} orientation="horizontal">
                <RadioGroupItem id={`teamSize-${value}`} value={value} />
                <FieldLabel
                  htmlFor={`teamSize-${value}`}
                  className="font-normal"
                >
                  {t(`options.teamSizes.${value}`)}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          {errorFor("teamSize")}
        </FieldSet>

        <FieldSet data-invalid={hasError("teamType")}>
          <FieldLegend id="teamType-legend" variant="label">
            {t("fields.teamType")}
          </FieldLegend>
          <RadioGroup
            name="teamType"
            value={teamType}
            onValueChange={(value) => setTeamType(String(value))}
            aria-labelledby="teamType-legend"
          >
            {teamTypes.map((value) => (
              <Field key={value} orientation="horizontal">
                <RadioGroupItem id={`teamType-${value}`} value={value} />
                <FieldLabel
                  htmlFor={`teamType-${value}`}
                  className="font-normal"
                >
                  {t(`options.teamTypes.${value}`)}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          {errorFor("teamType")}
        </FieldSet>

        <FieldSet data-invalid={hasError("videoPurposes")}>
          <FieldLegend variant="label">{t("fields.videoPurposes")}</FieldLegend>
          <FieldDescription>{t("fields.videoPurposesHint")}</FieldDescription>
          <FieldGroup className="gap-3">
            {videoPurposes.map((value) => (
              <Field key={value} orientation="horizontal">
                <Checkbox
                  id={`videoPurposes-${value}`}
                  name="videoPurposes"
                  value={value}
                  checked={purposes.includes(value)}
                  onCheckedChange={(checked) => togglePurpose(value, checked)}
                />
                <FieldLabel
                  htmlFor={`videoPurposes-${value}`}
                  className="font-normal"
                >
                  {t(`options.videoPurposes.${value}`)}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
          {errorFor("videoPurposes")}
        </FieldSet>

        <Button type="submit" size="lg" disabled={pending}>
          {t("submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
