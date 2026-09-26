import { AppHeader } from "@/components/app-header";

/** Estructura de las páginas con sesión y organización. */
export function AppShell({
  homePath,
  children,
}: {
  homePath: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader homePath={homePath} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
        {children}
      </main>
    </>
  );
}
