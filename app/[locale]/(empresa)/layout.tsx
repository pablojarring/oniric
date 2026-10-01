import { AppShell } from "@/components/app-shell";
import { requireSegmentArea } from "@/lib/auth/session";

// Rutas del workspace avanzado (empresa). Una organización pyme se redirige a su inicio.
export default async function EmpresaLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const context = await requireSegmentArea("empresa");
  return <AppShell context={context}>{children}</AppShell>;
}
