"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { setAdSharing } from "@/lib/ads/actions";

/** Activa, copia, comparte o desactiva el enlace público de un anuncio. */
export function AdShare({
  jobId,
  initialUrl,
}: {
  jobId: string;
  initialUrl: string | null;
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

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold">{t("title")}</h2>
      {url ? (
        <Field>
          <FieldLabel htmlFor="share-url">{t("link")}</FieldLabel>
          <Input
            id="share-url"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copy}>
              {copied ? t("copied") : t("copy")}
            </Button>
            {canShareNatively && (
              <Button type="button" variant="outline" onClick={shareNatively}>
                {t("native")}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => update(false)}
            >
              {t("disable")}
            </Button>
          </div>
        </Field>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => update(true)}
          >
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
