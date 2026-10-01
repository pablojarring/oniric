"use client";

import { CoinsIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { getAvailableCredits } from "@/lib/billing/actions";

/**
 * Saldo en el encabezado; lleva a recargar. El encabezado vive en el layout y
 * no se vuelve a renderizar al navegar, así que el saldo se consulta de nuevo
 * en cada cambio de página (después de generar o de comprar, cambia).
 */
export function BalanceChip({ initial }: { initial: number }) {
  const t = useTranslations("Nav");
  const format = useFormatter();
  const pathname = usePathname();
  const [balance, setBalance] = useState(initial);
  const [lastInitial, setLastInitial] = useState(initial);

  // Un router.refresh() trae un saldo nuevo desde el servidor.
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setBalance(initial);
  }

  useEffect(() => {
    let cancelled = false;
    getAvailableCredits()
      .then((available) => {
        if (!cancelled) setBalance(available);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Link
      href="/credits"
      aria-label={t("balanceLabel", { count: balance })}
      data-testid="header-balance"
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-3 text-sm font-semibold text-amber-900 tabular-nums transition-colors outline-none hover:bg-amber-100 focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
    >
      <CoinsIcon aria-hidden className="size-4 text-amber-500" />
      {/* En el celular, solo el número: el nombre accesible lo dice completo. */}
      <span className="sm:hidden">{format.number(balance)}</span>
      <span className="max-sm:hidden">{t("balance", { count: balance })}</span>
    </Link>
  );
}
