import { timingSafeEqual } from "node:crypto";

/**
 * Valida el encabezado `Authorization: Bearer <CRON_SECRET>` que envía el
 * programador de tareas (p. ej. Vercel Cron). Sin secreto configurado, rechaza.
 */
export function isAuthorizedCronRequest(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
