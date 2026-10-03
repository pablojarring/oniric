"use client";

import { cn } from "cn";
import {
  BadgePercentIcon,
  CheckIcon,
  CoinsIcon,
  ImagePlusIcon,
  LightbulbIcon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
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

import {
  formatShapes,
  mockupFormats,
  templateVisuals,
} from "@/components/ads/template-visuals";
import { appCardClassName, appPrimaryClassName } from "@/components/app/ui";
import { AdMockup, type AdMockupProps } from "@/components/marketing/ad-mockup";
import { seasonIcons } from "@/components/seasons/season-visuals";
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
import type { Locale } from "@/i18n/config";
import { Link, useRouter } from "@/i18n/navigation";
import { createAdAction, type CreateAdState } from "@/lib/ads/actions";
import type { TemplatePrices } from "@/lib/ads/service";
import { adFieldLimits, type AdField } from "@/lib/ads/types";
import { creditsToUsd, formatUsd } from "@/lib/format";
import type { AspectRatio } from "@/lib/providers/generation-provider";
import type { SeasonId } from "@/lib/seasons";
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

/** Largo máximo del texto en la vista previa, para que entre en el anuncio. */
const PREVIEW_COPY_LENGTH = 90;

const tileTones: Record<AdMockupProps["tone"], string> = {
  sunset: "from-orange-400 via-fuchsia-500 to-violet-700",
  berry: "from-fuchsia-500 via-violet-600 to-indigo-800",
  citrus: "from-amber-300 via-orange-500 to-rose-600",
};

// Un solo formulario para los 3 pasos: los pasos ocultos siguen montados para
// que la foto elegida y los textos viajen juntos al enviar. Se envía con
// startTransition en vez de `action` para que React no reinicie el formulario
// (y la foto) si el servidor devuelve un error.
export function AdWizard({
  businessName,
  prices,
  availableCredits,
  initialTemplateId,
  initialSeasonId,
}: {
  businessName: string;
  prices: TemplatePrices;
  availableCredits: number;
  /** Plantilla elegida desde el inicio (`/create?template=…`). */
  initialTemplateId?: TemplateId;
  /** Fecha comercial elegida en el calendario (`/create?season=…`). */
  initialSeasonId?: SeasonId;
}) {
  const t = useTranslations("AdWizard");
  const tTemplates = useTranslations("Templates");
  const tSeasons = useTranslations("Seasons");
  const locale = useLocale() as Locale;
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
  const [dragging, setDragging] = useState(false);
  const [templateId, setTemplateId] = useState<TemplateId | "">(
    initialTemplateId ?? "",
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | "">(
    initialTemplateId ? adTemplates[initialTemplateId].defaultAspectRatio : "",
  );
  const [offer, setOffer] = useState("");
  const [editedCopy, setEditedCopy] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<SeasonId | null>(
    initialSeasonId ?? null,
  );
  const photoInput = useRef<HTMLInputElement>(null);

  const template = templateId ? adTemplates[templateId] : null;
  const price =
    template && aspectRatio ? prices[template.id][aspectRatio] : undefined;
  const missingCredits = price ? Math.max(price - availableCredits, 0) : 0;

  // Con una fecha comercial, el copy sugerido es el de la fecha (con la oferta
  // en las plantillas que la piden); si no, el de la plantilla.
  const copyValues = {
    product: productName.trim(),
    business: businessName,
    offer: offer.trim(),
  };
  const suggestedCopy = !template
    ? ""
    : seasonId
      ? tSeasons(
          `items.${seasonId}.${template.requiresOffer ? "copyOffer" : "copy"}`,
          copyValues,
        )
      : tTemplates(`items.${template.id}.copy`, copyValues);
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

  function choosePhoto(file: File | null) {
    setPhoto(file);
    setPhotoConsent(false);
  }

  function removePhoto() {
    if (photoInput.current) photoInput.current.value = "";
    choosePhoto(null);
  }

  // Soltar una foto sobre el recuadro la pone en el campo del formulario.
  function dropPhoto(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const { files } = event.dataTransfer;
    if (files.length === 0 || !photoInput.current) return;
    photoInput.current.files = files;
    choosePhoto(files[0] ?? null);
  }

  const hasError = (field: AdField) => errors.includes(field);
  const errorFor = (field: AdField) =>
    hasError(field) ? <FieldError>{t(`errors.${field}`)}</FieldError> : null;
  const formatCredits = (count: number) =>
    t("summary.creditsWithUsd", {
      count,
      usd: formatUsd(creditsToUsd(count), locale),
    });

  const previewCopy =
    adCopy.length > PREVIEW_COPY_LENGTH
      ? `${adCopy.slice(0, PREVIEW_COPY_LENGTH).trimEnd()}…`
      : adCopy;
  const previewRatio = aspectRatio || template?.defaultAspectRatio || "9:16";
  const preview = (
    <WizardPreview
      format={mockupFormats[previewRatio]}
      tone={template ? templateVisuals[template.id].tone : "berry"}
      icon={template ? templateVisuals[template.id].icon : SparklesIcon}
      label={
        template ? tTemplates(`items.${template.id}.name`) : t("preview.label")
      }
      title={productName.trim() || t("preview.product")}
      copy={previewCopy || t("preview.copy")}
      cta={t("preview.cta")}
      video={template?.mediaType === "video"}
      image={photoPreview ?? undefined}
    />
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
    >
      <div className={cn(appCardClassName, "flex flex-col gap-8 p-5 sm:p-8")}>
        <ol className="flex items-center gap-2">
          {steps.map((name, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li
                key={name}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2",
                  index < lastStep && "flex-1",
                )}
              >
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => setStep(index as Step)}
                  className="flex shrink-0 items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-8 place-items-center rounded-full border text-sm font-semibold transition-colors",
                      done && "border-transparent bg-gradient-brand text-white",
                      active &&
                        "border-2 border-violet-600 text-violet-700 dark:text-violet-300",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    {done ? <CheckIcon className="size-4" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium max-sm:sr-only",
                      !active && "text-muted-foreground",
                    )}
                  >
                    {t(`steps.${name}`)}
                  </span>
                </button>
                {index < lastStep && (
                  <span
                    aria-hidden
                    className={cn(
                      "h-0.5 flex-1 rounded-full bg-border transition-colors",
                      done && "bg-violet-500",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {/* Anuncia el cambio de paso a los lectores de pantalla. */}
        <p className="sr-only" aria-live="polite">
          {t("stepOf", {
            current: step + 1,
            total: steps.length,
            name: t(`steps.${steps[step]}`),
          })}
        </p>

        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-xl font-semibold sm:text-2xl">
            {t(`stepTitles.${steps[step]}.title`)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(`stepTitles.${steps[step]}.description`)}
          </p>
        </div>

        {seasonId && (
          <SeasonNotice
            icon={seasonIcons[seasonId]}
            title={t("season.title", {
              name: tSeasons(`items.${seasonId}.name`),
            })}
            description={t("season.description")}
            removeLabel={t("season.remove")}
            onRemove={() => setSeasonId(null)}
          />
        )}

        <ServerError state={state} />

        {/* Paso 1: producto, foto o descripción. */}
        <FieldGroup hidden={step !== 0} className="gap-6">
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
              className="h-11 rounded-xl px-3.5"
            />
            {errorFor("productName")}
          </Field>

          <Field data-invalid={hasError("photo")}>
            <FieldLabel htmlFor="photo">{t("fields.photo")}</FieldLabel>
            <input
              ref={photoInput}
              id="photo"
              name="photo"
              type="file"
              accept={acceptedImageTypes}
              onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
              aria-invalid={hasError("photo")}
              aria-describedby="photo-help"
              className="peer sr-only"
            />
            {photoPreview ? (
              <div className="flex items-center gap-4 rounded-2xl border bg-muted/40 p-3">
                <Image
                  src={photoPreview}
                  alt={t("fields.photoPreview")}
                  width={80}
                  height={80}
                  unoptimized
                  className="size-20 rounded-xl border object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium">
                    {photo?.name}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <label
                      htmlFor="photo"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "cursor-pointer",
                      })}
                    >
                      <ImagePlusIcon aria-hidden />
                      {t("fields.changePhoto")}
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removePhoto}
                    >
                      <Trash2Icon aria-hidden />
                      {t("fields.removePhoto")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                htmlFor="photo"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={dropPhoto}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-500/5",
                  dragging &&
                    "border-violet-500 bg-violet-50 dark:bg-violet-500/10",
                  hasError("photo") && "border-destructive",
                )}
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                  <ImagePlusIcon aria-hidden className="size-6" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {t("fields.photoDrop")}
                </span>
              </label>
            )}
            <FieldDescription id="photo-help">
              {t("fields.photoHelp")}
            </FieldDescription>
            {errorFor("photo")}
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
              placeholder={t("fields.descriptionPlaceholder")}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={hasError("description")}
              className="min-h-24 rounded-xl px-3.5 py-2.5"
            />
            <FieldDescription>{t("fields.descriptionHelp")}</FieldDescription>
            {errorFor("description")}
          </Field>

          <p className="flex items-start gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
            <LightbulbIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-amber-500"
            />
            {t("tip")}
          </p>
        </FieldGroup>

        {/* Paso 2: plantilla, formato y oferta. */}
        <FieldGroup hidden={step !== 1} className="gap-8">
          <FieldSet data-invalid={hasError("templateId")}>
            <FieldLegend id="templateId-legend" variant="label">
              {t("fields.template")}
            </FieldLegend>
            <RadioGroup
              name="templateId"
              value={templateId}
              onValueChange={(value) => selectTemplate(value as TemplateId)}
              aria-labelledby="templateId-legend"
              className="gap-3 sm:grid-cols-3"
            >
              {templateIds.map((id) => {
                const item = adTemplates[id];
                const visual = templateVisuals[id];
                const itemPrice = prices[id][item.defaultAspectRatio];
                const Icon = visual.icon;
                return (
                  <FieldLabel
                    key={id}
                    htmlFor={`template-${id}`}
                    className="gap-0 overflow-hidden rounded-2xl! transition-shadow hover:shadow-md has-data-checked:border-violet-500 has-data-checked:shadow-lg has-data-checked:shadow-violet-500/15"
                  >
                    <div
                      aria-hidden
                      className={cn(
                        "relative grid h-24 w-full place-items-center bg-linear-to-br text-white",
                        tileTones[visual.tone],
                      )}
                    >
                      <span className="grid size-12 place-items-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur-sm">
                        <Icon className="size-6" strokeWidth={1.8} />
                      </span>
                    </div>
                    <Field orientation="horizontal" className="p-4!">
                      <FieldContent>
                        <FieldTitle>
                          {tTemplates(`items.${id}.name`)}
                        </FieldTitle>
                        <FieldDescription>
                          {tTemplates(`items.${id}.description`)}
                        </FieldDescription>
                        <FieldDescription className="font-medium text-foreground/80">
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
                className="gap-3 sm:grid-cols-3"
              >
                {template.aspectRatios.map((ratio) => (
                  <FieldLabel
                    key={ratio}
                    htmlFor={`aspectRatio-${ratio}`}
                    className="rounded-2xl! has-data-checked:border-violet-500"
                  >
                    <Field
                      orientation="horizontal"
                      className="items-center! p-3.5!"
                    >
                      <span
                        aria-hidden
                        className="grid h-10 w-12 shrink-0 place-items-center"
                      >
                        <span
                          className={cn(
                            "rounded-[5px] border-2 border-current text-violet-600 dark:text-violet-300",
                            formatShapes[ratio],
                          )}
                        />
                      </span>
                      <FieldContent>
                        <FieldTitle>
                          {tTemplates(`formatsShort.${ratio}`)}
                        </FieldTitle>
                        <FieldDescription>
                          {tTemplates(`formatUses.${ratio}`)}
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem
                        id={`aspectRatio-${ratio}`}
                        value={ratio}
                      />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
              {errorFor("aspectRatio")}
            </FieldSet>
          )}

          {template?.requiresOffer && (
            <Field data-invalid={hasError("offer")}>
              <FieldLabel htmlFor="offer">{t("fields.offer")}</FieldLabel>
              <div className="relative">
                <BadgePercentIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="offer"
                  name="offer"
                  maxLength={adFieldLimits.offer}
                  placeholder={t("fields.offerPlaceholder")}
                  value={offer}
                  onChange={(event) => setOffer(event.target.value)}
                  aria-invalid={hasError("offer")}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
              {errorFor("offer")}
            </Field>
          )}
        </FieldGroup>

        {/* Paso 3: revisar el texto y el precio, y generar. */}
        <FieldGroup hidden={step !== 2} className="gap-6">
          <div className="grid place-items-center rounded-2xl border bg-muted/40 p-6 lg:hidden">
            {preview}
          </div>

          <dl className="grid gap-x-6 gap-y-4 rounded-2xl border p-5 text-sm sm:grid-cols-3">
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
                value={tTemplates(`formatsShort.${aspectRatio}`)}
              />
            )}
          </dl>

          <div className="grid gap-3 rounded-2xl bg-amber-50/70 p-5 text-sm sm:grid-cols-3 dark:bg-amber-400/5">
            {price !== undefined && (
              <SummaryItem
                label={t("summary.price")}
                value={formatCredits(price)}
                emphasis
              />
            )}
            <SummaryItem
              label={t("summary.balance")}
              value={formatCredits(availableCredits)}
            />
            {price !== undefined && missingCredits === 0 && (
              <SummaryItem
                label={t("summary.remaining")}
                value={t("summary.credits", {
                  count: availableCredits - price,
                })}
              />
            )}
          </div>

          <Field data-invalid={hasError("adCopy")}>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="adCopy">{t("fields.adCopy")}</FieldLabel>
              <span
                aria-hidden
                className="text-xs text-muted-foreground tabular-nums"
              >
                {adCopy.length}/{adFieldLimits.adCopy}
              </span>
            </div>
            <Textarea
              id="adCopy"
              name="adCopy"
              rows={3}
              maxLength={adFieldLimits.adCopy}
              value={adCopy}
              onChange={(event) => setEditedCopy(event.target.value)}
              aria-invalid={hasError("adCopy")}
              className="min-h-24 rounded-xl px-3.5 py-2.5"
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
                <RotateCcwIcon aria-hidden />
                {t("fields.resetCopy")}
              </Button>
            )}
          </Field>

          {missingCredits > 0 && (
            <Alert className="rounded-2xl border-amber-300 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10">
              <CoinsIcon aria-hidden className="text-amber-600" />
              <AlertTitle>{t("insufficient.title")}</AlertTitle>
              <AlertDescription>
                {t("insufficient.description", { missing: missingCredits })}
              </AlertDescription>
              <Link
                href="/credits"
                className={cn(
                  appPrimaryClassName,
                  "mt-3 h-9 justify-self-start px-4",
                )}
              >
                {t("insufficient.recharge")}
              </Link>
            </Alert>
          )}
        </FieldGroup>

        {price !== undefined && (
          <input type="hidden" name="expectedPriceCredits" value={price} />
        )}
        {seasonId && <input type="hidden" name="seasonId" value={seasonId} />}

        <div className="flex items-center justify-between gap-4 border-t pt-6">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
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
            <Button
              key="next"
              type="button"
              onClick={goNext}
              className={appPrimaryClassName}
            >
              {t("next")}
            </Button>
          ) : (
            <Button
              key="submit"
              type="submit"
              disabled={pending || missingCredits > 0}
              className={appPrimaryClassName}
            >
              <SparklesIcon aria-hidden />
              {pending ? t("generating") : t("generate")}
            </Button>
          )}
        </div>
      </div>

      <aside className="hidden flex-col gap-3 lg:sticky lg:top-20 lg:flex">
        <p className="text-sm font-semibold">{t("preview.title")}</p>
        <div className="relative isolate grid min-h-96 place-items-center overflow-hidden rounded-3xl border bg-muted/40 p-6">
          <div aria-hidden className="absolute inset-0 -z-10 bg-dots" />
          {preview}
        </div>
        <p className="text-xs text-pretty text-muted-foreground">
          {t("preview.note")}
        </p>
      </aside>
    </form>
  );
}

/** Aviso de que el anuncio se ambienta en una fecha comercial. */
function SeasonNotice({
  icon: Icon,
  title,
  description,
  removeLabel,
  onRemove,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-500/30 dark:bg-violet-500/10"
      data-testid="season-notice"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="shrink-0 rounded-full max-sm:size-8 max-sm:px-0"
      >
        <XIcon aria-hidden />
        <span className="max-sm:sr-only">{removeLabel}</span>
      </Button>
    </div>
  );
}

/** Vista de ejemplo del anuncio con los datos que el cliente va cargando. */
function WizardPreview(props: AdMockupProps) {
  const widths: Record<AdMockupProps["format"], string> = {
    story: "w-48",
    square: "w-60",
    landscape: "w-72",
  };
  return (
    <div aria-hidden>
      <AdMockup {...props} className={widths[props.format]} />
    </div>
  );
}

function firstStepWithError(fields: AdField[]): Step {
  return fields.reduce<Step>(
    (first, field) => Math.min(first, fieldStep[field]) as Step,
    lastStep,
  );
}

function SummaryItem({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", emphasis && "text-base font-bold")}>
        {value}
      </dd>
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
    <Alert variant="destructive" className="rounded-2xl">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
