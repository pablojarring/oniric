import type { CheckoutGateway } from "./checkout";
import { mockCheckoutGateway } from "./mock-checkout";
import { createPayphoneGateway } from "./payphone";

type Env = Record<string, string | undefined>;

/**
 * Pasarela activa, o `null` si no hay ninguna configurada (las compras en línea
 * quedan desactivadas):
 *
 * - `PAYMENT_GATEWAY=mock`: pasarela de prueba, para desarrollo y tests. Se
 *   ignora en la producción de Vercel, porque acreditaría créditos gratis.
 * - `PAYPHONE_TOKEN` y `PAYPHONE_STORE_ID`: Payphone. Si la aplicación de
 *   Payphone está en modo de pruebas, los pagos se aprueban sin cobrar.
 */
export function resolveCheckoutGateway(env: Env): CheckoutGateway | null {
  if (env.PAYMENT_GATEWAY === "mock" && env.VERCEL_ENV !== "production") {
    return mockCheckoutGateway;
  }
  if (env.PAYPHONE_TOKEN && env.PAYPHONE_STORE_ID) {
    return createPayphoneGateway({
      token: env.PAYPHONE_TOKEN,
      storeId: env.PAYPHONE_STORE_ID,
    });
  }
  return null;
}

export function getCheckoutGateway(): CheckoutGateway | null {
  return resolveCheckoutGateway(process.env);
}
