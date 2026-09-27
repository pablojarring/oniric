import { expect, test, type Browser } from "@playwright/test";

import { grantPlatformAdmin } from "./support/admin";
import { signInWithOrganization } from "./support/flows";

async function newPyme(browser: Browser) {
  const context = await browser.newContext({ locale: "es-EC" });
  const page = await context.newPage();
  const user = await signInWithOrganization(page, {
    teamSize: "2-5",
    teamType: "owner",
  });
  await expect(page).toHaveURL("/home");
  return { context, page, user };
}

test.describe("panel de admin", () => {
  test("no existe para quien no es admin de la plataforma", async ({
    page,
  }) => {
    await signInWithOrganization(page, { teamSize: "2-5", teamType: "owner" });
    await expect(page).toHaveURL("/home");
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);

    for (const path of ["/admin", "/admin/organizations", "/admin/pricing"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test("acredita créditos a mano y la organización los ve", async ({
    browser,
  }) => {
    const admin = await newPyme(browser);
    const customer = await newPyme(browser);
    grantPlatformAdmin(admin.user.email);

    await admin.page.reload();
    await admin.page.getByRole("link", { name: "Admin" }).click();
    await expect(admin.page).toHaveURL("/admin/organizations");

    await admin.page
      .getByRole("searchbox", { name: /Nombre del negocio o correo/ })
      .fill(customer.user.email);
    await admin.page.getByRole("button", { name: "Buscar" }).click();
    await admin.page
      .getByRole("link", { name: "Panadería La Esquina" })
      .click();
    await expect(admin.page.getByTestId("admin-available")).toHaveText(
      "0 créditos",
    );

    // La referencia es obligatoria.
    await admin.page.getByLabel("Créditos").fill("500");
    await expect(admin.page.getByText("Equivale a USD 5.00.")).toBeVisible();
    await admin.page
      .getByLabel("Referencia del pago o motivo")
      .fill("Transferencia 123");
    await admin.page.getByRole("button", { name: "Acreditar" }).click();

    await expect(
      admin.page.getByText("Listo: acreditamos 500 créditos."),
    ).toBeVisible();
    await expect(admin.page.getByTestId("admin-available")).toHaveText(
      "500 créditos",
    );
    await expect(
      admin.page.getByText(
        `[manual] Transferencia 123 · por ${admin.user.email}`,
      ),
    ).toBeVisible();
    // El formulario queda vacío para no repetir la acreditación sin querer.
    await expect(admin.page.getByLabel("Créditos")).toHaveValue("");

    await customer.page.reload();
    await expect(customer.page.getByTestId("credit-balance")).toHaveText(
      "500 créditos",
    );

    await admin.context.close();
    await customer.context.close();
  });

  test("cambia el margen de un modelo y lo restablece", async ({ browser }) => {
    const admin = await newPyme(browser);
    grantPlatformAdmin(admin.user.email);
    const { page } = admin;

    await page.goto("/admin/pricing");
    await expect(
      page.getByRole("heading", { name: "Márgenes por modelo" }),
    ).toBeVisible();

    // mock-video-pro no lo usa ninguna plantilla: no afecta a otros tests.
    const row = page.getByRole("listitem").filter({
      has: page.getByRole("form", { name: "Video pro (mock), Pyme" }),
    });
    const form = row.getByRole("form", { name: "Video pro (mock), Pyme" });
    // 5 s × 0,12 = 0,60 USD → 84 créditos con el 25 % por defecto.
    await expect(row.getByText("Por defecto · 5 s: 84 créditos")).toBeVisible();

    await form.getByLabel("Margen (%)").fill("20");
    await form.getByRole("button", { name: "Guardar" }).click();
    await expect(
      form.getByText("El margen debe estar entre 25 % y 90 %"),
    ).toBeVisible();

    await form.getByLabel("Margen (%)").fill("40");
    await form.getByRole("button", { name: "Guardar" }).click();
    // 0,60 × 1,05 ÷ 0,60 = 1,05 USD → 105 créditos.
    await expect(
      row.getByText("Personalizado · 5 s: 105 créditos"),
    ).toBeVisible();

    await row
      .getByRole("button", { name: "Restablecer: Video pro (mock), Pyme" })
      .click();
    await expect(row.getByText("Por defecto · 5 s: 84 créditos")).toBeVisible();

    await admin.context.close();
  });
});
