"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "cn";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRouter } from "@/i18n/navigation";
import { createAdAction, type CreateAdState } from "@/lib/ads/actions";
import type { TemplatePrices } from "@/lib/ads/service";
import { adFieldLimits, type AdField } from "@/lib/ads/types";
import { creditsToUsd, formatUsd } from "@/lib/format";
import type { AspectRatio } from "@/lib/providers/generation-provider";
import { adTemplates, templateIds, type TemplateId } from "@/lib/templates";
import { imageTypes, MAX_IMAGE_BYTES } from "@/lib/uploads/images";

const steps = ["product", "template", "review"] as const;
type Step = 0 | 1 | 2;
const lastStep: Step = 2;

/** Paso del asistente donde se corrige cada campo. */
const fieldStep: Record<AdField, Step> = {
  productName: 0,
  photo: 0,
  photoConsent: 0,
  description: 0,
  templateId: 1,
  aspectRatio: 1,
  offer: 1,
  adCopy: 2,
};

const acceptedImageTypes = Object.keys(imageTypes).join(",");

// Un solo formulario para los 3 pasos: los pasos ocultos siguen montados para
// que la foto elegida y los textos viajen juntos al enviar. Se envía con
// startTransition en vez de `action` para que React no reinicie el formulario
// (y la foto) si el servidor devuelve un error.
export function AdWizard({
  businessName,
  prices,
  availableCredits,
}: {
  businessName: string;
  prices: TemplatePrices;
  availableCredits: number;
}) {
  const t = useTranslations("AdWizard");
  const tTemplates = useTranslations("Templates");
  const locale = useLocale();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createAdAction,
    undefined,
  );

  const [step, setStep] = useState<Step>(0);
  const [errors, setErrors] = useState<AdField[]>([]);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [templateId, setTemplateId] = useState<TemplateId | "">("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | "">("");
  const [offer, setOffer] = useState("");
  const [editedCopy, setEditedCopy] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const template = templateId ? adTemplates[templateId] : null;
  const price =
    template && aspectRatio ? prices[template.id][aspectRatio] : undefined;
  const missingCredits = price ? Math.max(price - availableCredits, 0) : 0;

  const suggestedCopy = template
    ? tTemplates(`items.${template.id}.copy`, {
        product: productName.trim(),
        business: businessName,
        offer: offer.trim(),
      })
    : "";
  const adCopy = editedCopy ?? suggestedCopy;

  const photoPreview = useMemo(
    () => (photo ? URL.createObjectURL(photo) : null),
    [photo],
  );
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  // Respuesta del servidor: marca los campos y vuelve al primer paso con error.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.error.code === "invalid") {
      setErrors(state.error.fields);
      setStep(firstStepWithError(state.error.fields));
    }
  }

  // El saldo o el precio cambiaron: se recargan los datos de la página.
  useEffect(() => {
    const code = state?.error.code;
    if (code === "insufficientCredits" || code === "priceChanged") {
      router.refresh();
    }
  }, [state, router]);

  function validate(upTo: Step): AdField[] {
    const invalid: AdField[] = [];
    const name = productName.trim();
    if (name.length < 2 || name.length > adFieldLimits.productName) {
      invalid.push("productName");
    }
    if (
      photo &&
      (photo.size > MAX_IMAGE_BYTES || !(photo.type in imageTypes))
    ) {
      invalid.push("photo");
    }
    if (photo && !photoConsent) invalid.push("photoConsent");
    if (!photo && description.trim() === "") invalid.push("description");
    if (upTo >= 1) {
      if (!template) invalid.push("templateId");
      else {
        if (!aspectRatio || !template.aspectRatios.includes(aspectRatio)) {
          invalid.push("aspectRatio");
        }
        if (template.requiresOffer && offer.trim() === "") {
          invalid.push("offer");
        }
      }
    }
    if (upTo >= 2) {
      const copy = adCopy.trim();
      if (copy === "" || copy.length > adFieldLimits.adCopy) {
        invalid.push("adCopy");
      }
    }
    return invalid;
  }

  function goNext() {
    const invalid = validate(step);
    setErrors(invalid);
    if (invalid.length > 0) {
      setStep(firstStepWithError(invalid));
      return;
    }
    setStep((current) =>
      current < lastStep ? ((current + 1) as Step) : current,
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter en un campo de los primeros pasos avanza en lugar de enviar.
    if (step < lastStep) {
      goNext();
      return;
    }
    const invalid = validate(lastStep);
    setErrors(invalid);
    if (invalid.length > 0) {
      setStep(firstStepWithError(invalid));
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  function selectTemplate(id: TemplateId) {
    setTemplateId(id);
    setAspectRatio(adTemplates[id].defaultAspectRatio);
    setEditedCopy(null);
  }

  function removePhoto() {
    if (photoInput.current) photoInput.current.value = "";
    setPhoto(null);
    setPhotoConsent(false);
  }

  const hasError = (field: AdField) => errors.includes(field);
  const errorFor = (field: AdField) =>
    hasError(field) ? <FieldError>{t(`errors.${field}`)}</FieldError> : null;
  const formatCredits = (count: number) =>
    t("summary.creditsWithUsd", {
      count,
      usd: formatUsd(creditsToUsd(count), locale),
    });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <ol className="grid grid-cols-3 gap-3 text-sm">
        {steps.map((name, index) => (
          <li
            key={name}
            aria-current={index === step ? "step" : undefined}
            className="flex flex-col gap-2"
          >
            <span
              aria-hidden
              className={cn(
                "h-1 rounded-full",
                index <= step ? "bg-primary" : "bg-muted",
              )}
            />
            <span
              className={
                index === step ? "font-medium" : "text-muted-foreground"
              }
            >
              {index + 1}. {t(`steps.${name}`)}
            </span>
          </li>
        ))}
      </ol>
      {/* Anuncia el cambio de paso a los lectores de pantalla. */}
      <p className="sr-only" aria-live="polite">
        {t("stepOf", {
          current: step + 1,
          total: steps.length,
          name: t(`steps.${steps[step]}`),
        })}
      </p>

      <ServerError state={state} />

      {/* Paso 1: producto, foto o descripción. */}
      <FieldGroup hidden={step !== 0}>
        <Field data-invalid={hasError("productName")}>
          <FieldLabel htmlFor="productName">
            {t("fields.productName")}
          </FieldLabel>
          <Input
            id="productName"
            name="productName"
            maxLength={adFieldLimits.productName}
            placeholder={t("fields.productNamePlaceholder")}
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            aria-invalid={hasError("productName")}
          />
          {errorFor("productName")}
        </Field>

        <Field data-invalid={hasError("photo")}>
          <FieldLabel htmlFor="photo">{t("fields.photo")}</FieldLabel>
          <Input
            ref={photoInput}
            id="photo"
            name="photo"
            type="file"
            accept={acceptedImageTypes}
            onChange={(event) => {
              setPhoto(event.target.files?.[0] ?? null);
              setPhotoConsent(false);
            }}
            aria-invalid={hasError("photo")}
          />
          <FieldDescription>{t("fields.photoHelp")}</FieldDescription>
          {errorFor("photo")}
          {photoPreview && (
            <div className="flex items-end gap-4">
              <Image
                src={photoPreview}
                alt={t("fields.photoPreview")}
                width={128}
                height={128}
                unoptimized
                className="size-32 rounded-lg border object-cover"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removePhoto}
              >
                {t("fields.removePhoto")}
              </Button>
            </div>
          )}
        </Field>

        {photo && (
          <Field
            orientation="horizontal"
            data-invalid={hasError("photoConsent")}
          >
            <Checkbox
              id="photoConsent"
              name="photoConsent"
              value="on"
              checked={photoConsent}
              onCheckedChange={setPhotoConsent}
              aria-invalid={hasError("photoConsent")}
            />
            <FieldContent>
              <FieldLabel htmlFor="photoConsent" className="font-normal">
                {t("fields.photoConsent")}
              </FieldLabel>
              {errorFor("photoConsent")}
            </FieldContent>
          </Field>
        )}

        <Field data-invalid={hasError("description")}>
          <FieldLabel htmlFor="description">
            {t("fields.description")}
          </FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            maxLength={adFieldLimits.description}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={hasError("description")}
          />
          <FieldDescription>{t("fields.descriptionHelp")}</FieldDescription>
          {errorFor("description")}
        </Field>
      </FieldGroup>

      {/* Paso 2: plantilla, formato y oferta. */}
      <FieldGroup hidden={step !== 1}>
        <FieldSet data-invalid={hasError("templateId")}>
          <FieldLegend id="templateId-legend" variant="label">
            {t("fields.template")}
          </FieldLegend>
          <RadioGroup
            name="templateId"
            value={templateId}
            onValueChange={(value) => selectTemplate(value as TemplateId)}
            aria-labelledby="templateId-legend"
            className="sm:grid-cols-3"
          >
            {templateIds.map((id) => {
              const item = adTemplates[id];
              const itemPrice = prices[id][item.defaultAspectRatio];
              return (
                <FieldLabel key={id} htmlFor={`template-${id}`}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{tTemplates(`items.${id}.name`)}</FieldTitle>
                      <FieldDescription>
                        {tTemplates(`items.${id}.description`)}
                      </FieldDescription>
                      <FieldDescription>
                        {tTemplates(`mediaTypes.${item.mediaType}`)}
                        {item.durationSeconds &&
                          ` · ${t("templateCard.duration", { seconds: item.durationSeconds })}`}
                        {itemPrice !== undefined &&
                          ` · ${t("templateCard.price", { count: itemPrice })}`}
                      </FieldDescription>
                    </FieldContent>
                    <RadioGroupItem id={`template-${id}`} value={id} />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
          {errorFor("templateId")}
        </FieldSet>

        {template && (
          <FieldSet data-invalid={hasError("aspectRatio")}>
            <FieldLegend id="aspectRatio-legend" variant="label">
              {t("fields.format")}
            </FieldLegend>
            <RadioGroup
              name="aspectRatio"
              value={aspectRatio}
              onValueChange={(value) => setAspectRatio(value as AspectRatio)}
              aria-labelledby="aspectRatio-legend"
            >
              {template.aspectRatios.map((ratio) => (
                <Field key={ratio} orientation="horizontal">
                  <RadioGroupItem id={`aspectRatio-${ratio}`} value={ratio} />
                  <FieldLabel
                    htmlFor={`aspectRatio-${ratio}`}
                    className="font-normal"
                  >
                    {tTemplates(`formats.${ratio}`)}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
            {errorFor("aspectRatio")}
          </FieldSet>
        )}

        {template?.requiresOffer && (
          <Field data-invalid={hasError("offer")}>
            <FieldLabel htmlFor="offer">{t("fields.offer")}</FieldLabel>
            <Input
              id="offer"
              name="offer"
              maxLength={adFieldLimits.offer}
              placeholder={t("fields.offerPlaceholder")}
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              aria-invalid={hasError("offer")}
            />
            {errorFor("offer")}
          </Field>
        )}
      </FieldGroup>

      {/* Paso 3: revisar el texto y el precio, y generar. */}
      <FieldGroup hidden={step !== 2}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryItem
            label={t("summary.product")}
            value={productName.trim()}
          />
          {template && (
            <SummaryItem
              label={t("summary.template")}
              value={tTemplates(`items.${template.id}.name`)}
            />
          )}
          {aspectRatio && (
            <SummaryItem
              label={t("summary.format")}
              value={tTemplates(`formats.${aspectRatio}`)}
            />
          )}
          {price !== undefined && (
            <SummaryItem
              label={t("summary.price")}
              value={formatCredits(price)}
            />
          )}
          <SummaryItem
            label={t("summary.balance")}
            value={formatCredits(availableCredits)}
          />
        </dl>

        <Field data-invalid={hasError("adCopy")}>
          <FieldLabel htmlFor="adCopy">{t("fields.adCopy")}</FieldLabel>
          <Textarea
            id="adCopy"
            name="adCopy"
            rows={3}
            maxLength={adFieldLimits.adCopy}
            value={adCopy}
            onChange={(event) => setEditedCopy(event.target.value)}
            aria-invalid={hasError("adCopy")}
          />
          <FieldDescription>{t("fields.adCopyHelp")}</FieldDescription>
          {errorFor("adCopy")}
          {editedCopy !== null && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="self-start px-0"
              onClick={() => setEditedCopy(null)}
            >
              {t("fields.resetCopy")}
            </Button>
          )}
        </Field>

        {missingCredits > 0 && (
          <Alert>
            <AlertTitle>{t("insufficient.title")}</AlertTitle>
            <AlertDescription>
              {t("insufficient.description", { missing: missingCredits })}
            </AlertDescription>
            <Link
              href="/credits"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "mt-2 justify-self-start",
              })}
            >
              {t("insufficient.recharge")}
            </Link>
          </Alert>
        )}
      </FieldGroup>

      {price !== undefined && (
        <input type="hidden" name="expectedPriceCredits" value={price} />
      )}

      <div className="flex justify-between gap-4">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((step - 1) as Step)}
          >
            {t("back")}
          </Button>
        ) : (
          <span />
        )}
        {/* Keys distintas: si React reusara el mismo <button>, el clic en
            "Siguiente" del paso 2 lo convertiría en submit y enviaría el
            formulario. */}
        {step < lastStep ? (
          <Button key="next" type="button" onClick={goNext}>
            {t("next")}
          </Button>
        ) : (
          <Button
            key="submit"
            type="submit"
            disabled={pending || missingCredits > 0}
          >
            {pending ? t("generating") : t("generate")}
          </Button>
        )}
      </div>
    </form>
  );
}

function firstStepWithError(fields: AdField[]): Step {
  return fields.reduce<Step>(
    (first, field) => Math.min(first, fieldStep[field]) as Step,
    lastStep,
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ServerError({ state }: { state: CreateAdState }) {
  const t = useTranslations("AdWizard.errors");
  if (!state) return null;

  const { error } = state;
  let message: string;
  switch (error.code) {
    case "insufficientCredits":
      message = t("insufficientCredits", {
        missing: error.required - error.available,
      });
      break;
    case "priceChanged":
      message = t("priceChanged", { count: error.priceCredits });
      break;
    default:
      message = t(error.code);
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
