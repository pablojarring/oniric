"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copia el texto del anuncio para pegarlo al publicar. */
export function CopyTextButton({ text }: { text: string }) {
  const t = useTranslations("AdPage");
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      {copied ? t("copyText.copied") : t("copyText.copy")}
    </Button>
  );
}
