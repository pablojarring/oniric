import { AppShell } from "@/components/app-shell";
import { requireSegmentArea } from "@/lib/auth/session";
import { segmentConfig } from "@/lib/segment";

// Rutas del workspace avanzado (empresa). Una organización pyme se redirige a su inicio.
export default async function EmpresaLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const { user } = await requireSegmentArea("empresa");
  return (
    <AppShell
      homePath={segmentConfig.empresa.homePath}
      isPlatformAdmin={user.isPlatformAdmin}
    >
      {children}
    </AppShell>
  );
}
