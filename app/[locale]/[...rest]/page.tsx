import { notFound } from "next/navigation";

// Cualquier ruta desconocida dentro de un idioma muestra app/[locale]/not-found.tsx.
export default function CatchAll() {
  notFound();
}
