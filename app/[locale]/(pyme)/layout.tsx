import { AppShell } from "@/components/app-shell";
import { requireSegmentArea } from "@/lib/auth/session";

// Rutas del modo guiado (pyme). Una organización empresa se redirige a su workspace.
export default async function PymeLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const context = await requireSegmentArea("pyme");
  return <AppShell context={context}>{children}</AppShell>;
}
