import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { grantPlatformAdmin } from "./support/admin";
import { signInWithOrganization } from "./support/flows";

// Con PAYMENT_GATEWAY=mock (CI y desarrollo), el pago se aprueba solo y la
// pasarela devuelve al cliente a la ruta de vuelta, igual que Payphone.
test.describe("recarga de créditos", () => {
  test("compra un paquete, recibe los créditos y el admin ve la compra", async ({
    page,
  }) => {
    const businessName = `Tienda ${randomUUID().slice(0, 8)}`;
    const user = await signInWithOrganization(page, {
      teamSize: "2-5",
      teamType: "owner",
      businessName,
    });
    await expect(page).toHaveURL("/home");
    await expect(page.getByTestId("credit-balance")).toHaveText("0 créditos");

    await page.getByRole("link", { name: "Recargar créditos" }).click();
    await expect(page).toHaveURL("/credits");
    await expect(
      page.getByRole("heading", { name: "Recarga créditos" }),
    ).toBeVisible();

    // 500 créditos por US$5 con IVA incluido, con el desglose y lo que rinden
    // (163 créditos por estado de WhatsApp, 244 por promo, 17 por imagen).
    const starter = page.getByTestId("package-starter");
    await expect(starter.getByText("500 créditos")).toBeVisible();
    await expect(starter.getByText(/(US\$|USD)\s?5[.,]00/)).toBeVisible();
    await expect(
      starter.getByText(
        /Subtotal (US\$|USD)\s?4[.,]35 \+ IVA (US\$|USD)\s?0[.,]65/,
      ),
    ).toBeVisible();
    await expect(
      starter.getByText(
        "Te alcanza para 3 estados de WhatsApp, 2 promos de 15 s o 29 imágenes.",
      ),
    ).toBeVisible();
    const business = page.getByTestId("package-business");
    await expect(business.getByText("Más elegido")).toBeVisible();
    await expect(business.getByText("+300 de regalo")).toBeVisible();

    await starter.getByRole("button", { name: "Comprar" }).click();

    await expect(page).toHaveURL(/\/credits\?purchase=[0-9a-f-]{36}$/);
    await expect(page.getByText("¡Pago recibido!")).toBeVisible();
    await expect(
      page.getByText("Acreditamos 500 créditos a tu cuenta."),
    ).toBeVisible();
    await expect(page.getByTestId("credits-balance")).toHaveText(
      "Tu saldo: 500 créditos",
    );
    await page.goto("/home");
    await expect(page.getByTestId("credit-balance")).toHaveText("500 créditos");

    // El admin ve la compra con el desglose para emitir la factura.
    grantPlatformAdmin(user.email);
    await page.goto("/admin/purchases");
    const row = page.getByTestId("purchase-row").filter({
      hasText: businessName,
    });
    await expect(row).toContainText("500 créditos");
    await expect(row).toContainText(/4[.,]35/);
    await expect(row).toContainText(/0[.,]65/);
    await expect(row).toContainText("Pagada");
  });

  test("si la vuelta de la pasarela llega sin datos, avisa que no se completó", async ({
    page,
  }) => {
    await signInWithOrganization(page, { teamSize: "2-5", teamType: "owner" });
    await expect(page).toHaveURL("/home");

    await page.goto("/api/payments/payphone/return");

    await expect(page).toHaveURL("/credits?payment=error");
    await expect(page.getByText("El pago no se completó")).toBeVisible();
  });
});
