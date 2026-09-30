"use server";

import { getTranslations } from "next-intl/server";

import { getDb } from "@/db";
import { requireOrganization } from "@/lib/auth/session";
import { getCreditPackage, isCreditPackageId } from "@/lib/billing/packages";
import { getSiteUrl } from "@/lib/env";
import { hasFeature } from "@/lib/segment";

import { CheckoutGatewayError } from "./checkout";
import { getCheckoutGateway } from "./gateway";
import { CheckoutRateLimitError, startCheckout } from "./purchases";

export type BuyCreditsState =
  | { error: "unavailable" | "invalid" | "rateLimit" | "gateway" }
  /** Página de pago: el cliente navega a ella con una recarga completa. */
  | { redirectUrl: string }
  | undefined;

/**
 * Inicia la compra de un paquete y devuelve la página de pago. No usa
 * `redirect()`: la navegación del cliente a otra página (o a la ruta de vuelta,
 * con la pasarela de prueba) tiene que ser una recarga completa.
 */
export async function buyCreditsAction(
  _previous: BuyCreditsState,
  formData: FormData,
): Promise<BuyCreditsState> {
  const { user, organization } = await requireOrganization();
  if (!hasFeature(organization.segment, "buyCredits")) {
    return { error: "unavailable" };
  }
  const packageId = formData.get("packageId");
  if (!isCreditPackageId(packageId)) return { error: "invalid" };
  const gateway = getCheckoutGateway();
  if (!gateway) return { error: "unavailable" };

  const t = await getTranslations("Credits");
  try {
    const { redirectUrl } = await startCheckout(getDb(), gateway, {
      organizationId: organization.id,
      userId: user.id,
      packageId,
      email: user.email,
      reference: t("reference", {
        count: getCreditPackage(packageId).credits,
      }),
      siteUrl: getSiteUrl(),
    });
    return { redirectUrl };
  } catch (error) {
    if (error instanceof CheckoutRateLimitError) return { error: "rateLimit" };
    if (error instanceof CheckoutGatewayError) {
      console.error("No se pudo iniciar el pago", error);
      return { error: "gateway" };
    }
    throw error;
  }
}
