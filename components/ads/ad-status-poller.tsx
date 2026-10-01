"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";
import { refreshAdStatus } from "@/lib/ads/actions";

const FIRST_POLL_MS = 3_000;
const MAX_POLL_MS = 10_000;

/** Espera cada vez más larga, con un poco de azar (lo que recomienda Higgsfield). */
function nextDelay(delay: number): number {
  return Math.min(delay * 1.5, MAX_POLL_MS);
}

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
    let delay = FIRST_POLL_MS;

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
      if (!cancelled) {
        delay = nextDelay(delay);
        timer = setTimeout(poll, delay + Math.random() * 500);
      }
    }

    timer = setTimeout(poll, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, status, router]);

  return null;
}
