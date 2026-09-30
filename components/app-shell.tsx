import { AppHeader } from "@/components/app-header";
import { MobileTabBar } from "@/components/app/app-nav";
import { getDb } from "@/db";
import type { OrganizationContext } from "@/lib/auth/session";
import { getBalance } from "@/lib/billing/wallet";
import { segmentConfig } from "@/lib/segment";

/**
 * Estructura de las páginas con sesión y organización: encabezado con el menú
 * del segmento y, si puede comprar créditos, el saldo.
 */
export async function AppShell({
  context,
  children,
}: {
  context: OrganizationContext;
  children: React.ReactNode;
}) {
  const { homePath, navigation } = segmentConfig[context.organization.segment];
  const balance = navigation.includes("credits")
    ? (await getBalance(getDb(), context.organization.id)).available
    : undefined;

  return (
    <div className="relative isolate flex flex-1 flex-col">
      {/* Resplandor de la marca detrás del encabezado. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,color-mix(in_oklch,var(--color-violet-500)_14%,transparent),transparent)]"
      />
      <AppHeader
        homePath={homePath}
        isPlatformAdmin={context.user.isPlatformAdmin}
        sections={navigation}
        balance={balance}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-8 pb-28 sm:px-6 sm:pt-10 lg:pb-16">
        {children}
      </main>
      {navigation.length > 0 && <MobileTabBar sections={navigation} />}
    </div>
  );
}
