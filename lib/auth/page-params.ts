import type { AuthFormError } from "./errors";

/** Primer valor de un parámetro de búsqueda. */
export function searchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Errores que llegan en la URL desde app/api/auth/*. Cualquier otro valor se ignora.
const linkErrors = ["invalidLink", "oauth"] as const satisfies AuthFormError[];

export function authLinkError(
  value: string | string[] | undefined,
): AuthFormError | undefined {
  const error = searchParam(value);
  return linkErrors.find((known) => known === error);
}
