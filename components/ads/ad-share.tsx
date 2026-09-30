"use client";

import { Link2Icon, Link2OffIcon, SendIcon, Share2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, useTransition } from "react";

import { appCardClassName } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { setAdSharing } from "@/lib/ads/actions";

/** Activa, copia, comparte o desactiva el enlace público de un anuncio. */
export function AdShare({
  jobId,
  initialUrl,
  message,
}: {
  jobId: string;
  initialUrl: string | null;
  /** Texto del anuncio, para acompañar el enlace al enviarlo por WhatsApp. */
  message?: string;
}) {
  const t = useTranslations("AdPage.share");
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(enabled: boolean) {
    setFailed(false);
    setCopied(false);
    startTransition(async () => {
      const result = await setAdSharing(jobId, enabled).catch(() => null);
      if (result?.ok) setUrl(result.url);
      else setFailed(true);
    });
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  async function shareNatively() {
    if (!url) return;
    // Cancelar el diálogo del sistema no es un error.
    await navigator.share({ url }).catch(() => undefined);
  }

  // Solo el navegador sabe si tiene el diálogo de compartir del sistema; en el
  // servidor se asume que no, para que la hidratación coincida.
  const canShareNatively = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  const whatsappUrl = url
    ? `https://wa.me/?text=${encodeURIComponent(message ? `${message}\n${url}` : url)}`
    : null;

  return (
    <section className={`${appCardClassName} flex flex-col gap-4 p-5`}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          <Share2Icon aria-hidden className="size-4.5" />
        </span>
        <h2 className="font-heading text-lg font-semibold">{t("title")}</h2>
      </div>
      {url ? (
        <Field>
          <FieldLabel htmlFor="share-url">{t("link")}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="share-url"
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={copy}
            >
              <Link2Icon aria-hidden />
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white shadow-sm transition-colors outline-none hover:bg-[#1ebe5b] focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <SendIcon aria-hidden className="size-4" />
                {t("whatsapp")}
              </a>
            )}
            {canShareNatively && (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full"
                onClick={shareNatively}
              >
                <Share2Icon aria-hidden />
                {t("native")}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-full text-muted-foreground"
              disabled={pending}
              onClick={() => update(false)}
            >
              <Link2OffIcon aria-hidden />
              {t("disable")}
            </Button>
          </div>
        </Field>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-pretty text-muted-foreground">
            {t("description")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full"
            disabled={pending}
            onClick={() => update(true)}
          >
            <Link2Icon aria-hidden />
            {t("enable")}
          </Button>
        </div>
      )}
      {failed && (
        <FieldDescription className="text-destructive" role="alert">
          {t("error")}
        </FieldDescription>
      )}
    </section>
  );
}

function noopSubscribe() {
  return () => {};
}
