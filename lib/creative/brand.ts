import type { BrandElement, CreativeBrief } from "./schemas";

// Lo propio de la marca que sale en el brief. Sin dependencias del servidor:
// también lo usan las pantallas.

/** Personajes de la marca que pueden protagonizar el anuncio (no personas). */
export function brandCharacters(brief: CreativeBrief): BrandElement[] {
  return brief.brandElements.filter(
    (element) => element.kind === "character" || element.kind === "pet",
  );
}
