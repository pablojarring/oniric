import { AdminNav } from "@/components/admin/admin-nav";
import { AppHeader } from "@/components/app-header";
import { requirePlatformAdmin } from "@/lib/auth/session";

// Panel de admin de la plataforma (equipo de Oniric). Cada página y acción
// vuelve a verificar el rol: el layout no alcanza para proteger una ruta.
export default async function AdminLayout({
  children,
}: LayoutProps<"/[locale]/admin">) {
  await requirePlatformAdmin();

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <AdminNav />
        {children}
      </main>
    </>
  );
}
