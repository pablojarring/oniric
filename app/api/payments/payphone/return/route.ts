import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { getCheckoutGateway } from "@/lib/payments/gateway";
import { confirmPurchase } from "@/lib/payments/purchases";

// Vuelta desde la página de pago. Payphone agrega `id` y `clientTransactionId`.
// No hace falta sesión: la compra se confirma con la pasarela desde el
// servidor, así que los parámetros de la URL no alcanzan para acreditar nada.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const transactionId = params.get("id") ?? "";
  const clientTransactionId = params.get("clientTransactionId") ?? "";
  const target = new URL("/credits", request.url);

  const gateway = getCheckoutGateway();
  if (!gateway || !transactionId || !clientTransactionId) {
    target.searchParams.set("payment", "error");
    return NextResponse.redirect(target, 303);
  }

  const result = await confirmPurchase(getDb(), gateway, {
    transactionId,
    clientTransactionId,
  });
  if (result.purchase) {
    target.searchParams.set("purchase", result.purchase.id);
  } else {
    target.searchParams.set("payment", "error");
  }
  return NextResponse.redirect(target, 303);
}
