"use client";

import { useState, useTransition } from "react";

import type { CreativeActionResult } from "@/lib/creative/actions";
import type { CreativeErrorCode } from "@/lib/creative/service";

export type CreativeUiError = CreativeErrorCode | "unexpected";

/**
 * Corre una acción del director creativo en una transición: la página se
 * refresca con la sesión nueva al terminar, y si falla queda el código del
 * error para mostrarlo.
 */
export function useCreativeAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<CreativeUiError | null>(null);

  function run(
    action: () => Promise<CreativeActionResult>,
    onSuccess?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(
        () => ({ ok: false, error: "unexpected" }) as const,
      );
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  return { pending, error, run };
}
