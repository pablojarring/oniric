"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";
import { refreshAdStatus } from "@/lib/ads/actions";

const POLL_INTERVAL_MS = 3_000;

/**
 * Mientras el anuncio está en curso, consulta su estado cada pocos segundos y
 * recarga la página cuando cambia.
 */
export function AdStatusPoller({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const current = await refreshAdStatus(jobId);
        if (cancelled) return;
        if (current && current !== status) {
          router.refresh();
          return;
        }
      } catch (error) {
        // Un fallo de red no detiene el polling: se reintenta en el siguiente ciclo.
        console.error(error);
      }
      if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, status, router]);

  return null;
}
