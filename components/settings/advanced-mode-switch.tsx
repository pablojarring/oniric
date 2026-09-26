"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { setAdvancedMode } from "@/lib/organizations/actions";

type Status = "idle" | "saved" | "error";

export function AdvancedModeSwitch({
  enabled,
  canEdit,
}: {
  enabled: boolean;
  canEdit: boolean;
}) {
  const t = useTranslations("Settings.advancedMode");
  const [checked, setChecked] = useState(enabled);
  const [status, setStatus] = useState<Status>("idle");
  const [isPending, startTransition] = useTransition();

  function onCheckedChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      const result = await setAdvancedMode(next).catch(() => null);
      if (result?.ok) {
        setStatus("saved");
      } else {
        setChecked(!next);
        setStatus("error");
      }
    });
  }

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor="advanced-mode">{t("label")}</FieldLabel>
        <FieldDescription>
          {canEdit ? t("description") : t("onlyAdmins")}
        </FieldDescription>
        <p role="status" className="text-sm text-muted-foreground">
          {status === "saved" && !isPending && t("saved")}
          {status === "error" && t("error")}
        </p>
      </FieldContent>
      <Switch
        id="advanced-mode"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={!canEdit || isPending}
      />
    </Field>
  );
}
