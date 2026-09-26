// El layout con <html> y <body> vive en app/[locale]/layout.tsx. Este layout
// raíz solo existe para que app/not-found.tsx funcione con rutas que no pasan
// por proxy.ts.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
