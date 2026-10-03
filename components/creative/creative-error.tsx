import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";

import type { CreativeUiError } from "./use-creative-action";

/** Mensaje para el dueño cuando una acción del director creativo falla. */
export function CreativeError({ error }: { error: CreativeUiError | null }) {
  const t = useTranslations("Director.errors");
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden />
      <AlertDescription>{t(error)}</AlertDescription>
    </Alert>
  );
}
