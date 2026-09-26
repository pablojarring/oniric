import { AppShell } from "@/components/app-shell";
import { requireSegmentArea } from "@/lib/auth/session";
import { segmentConfig } from "@/lib/segment";

// Rutas del modo guiado (pyme). Una organización empresa se redirige a su workspace.
export default async function PymeLayout({
  children,
}: LayoutProps<"/[locale]">) {
  await requireSegmentArea("pyme");
  return <AppShell homePath={segmentConfig.pyme.homePath}>{children}</AppShell>;
}
