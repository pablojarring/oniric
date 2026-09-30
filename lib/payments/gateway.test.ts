import { describe, expect, it } from "vitest";

import { resolveCheckoutGateway } from "./gateway";

describe("resolveCheckoutGateway", () => {
  it("usa Payphone con token y tienda", () => {
    expect(
      resolveCheckoutGateway({ PAYPHONE_TOKEN: "t", PAYPHONE_STORE_ID: "s" })
        ?.id,
    ).toBe("payphone");
  });

  it("sin configuración, las compras quedan desactivadas", () => {
    expect(resolveCheckoutGateway({})).toBeNull();
    expect(resolveCheckoutGateway({ PAYPHONE_TOKEN: "t" })).toBeNull();
  });

  it("usa la pasarela de prueba si se pide, fuera de producción", () => {
    expect(resolveCheckoutGateway({ PAYMENT_GATEWAY: "mock" })?.id).toBe(
      "mock",
    );
    expect(
      resolveCheckoutGateway({
        PAYMENT_GATEWAY: "mock",
        VERCEL_ENV: "preview",
      })?.id,
    ).toBe("mock");
  });

  it("nunca usa la pasarela de prueba en la producción de Vercel", () => {
    expect(
      resolveCheckoutGateway({
        PAYMENT_GATEWAY: "mock",
        VERCEL_ENV: "production",
      }),
    ).toBeNull();
    expect(
      resolveCheckoutGateway({
        PAYMENT_GATEWAY: "mock",
        VERCEL_ENV: "production",
        PAYPHONE_TOKEN: "t",
        PAYPHONE_STORE_ID: "s",
      })?.id,
    ).toBe("payphone");
  });
});
