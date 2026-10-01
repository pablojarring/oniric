import { expect, test, type Page } from "@playwright/test";

import { grantCredits } from "./support/credits";
import { signInWithOrganization } from "./support/flows";

// El onboarding de prueba elige Ecuador, que tiene calendario comercial. Las
// fechas que se muestran dependen del día en que corre el test, así que solo
// se fija la fecha al entrar directo al asistente.

async function pymeWithCredits(page: Page, credits: number) {
  const user = await signInWithOrganization(page, {
    teamSize: "2-5",
    teamType: "owner",
  });
  await expect(page).toHaveURL("/home");
  grantCredits(user.email, credits);
  await page.reload();
}

const next = (page: Page) =>
  page.getByRole("button", { name: "Siguiente" }).click();

async function describeProduct(page: Page) {
  await page.getByLabel("¿Qué quieres anunciar?").fill("Rosas");
  await page
    .getByLabel("Describe tu producto o servicio")
    .fill("Ramos de rosas ecuatorianas");
  await next(page);
}

test.describe("calendario comercial", () => {
  test("el inicio muestra las próximas fechas y el calendario completo", async ({
    page,
  }) => {
    await pymeWithCredits(page, 500);

    await expect(
      page.getByRole("heading", { name: "Fechas que venden" }),
    ).toBeVisible();
    await expect(page.getByTestId("season-card")).toHaveCount(3);

    await page.getByRole("link", { name: "Ver calendario" }).click();
    await expect(page).toHaveURL("/calendar");
    await expect(
      page.getByRole("heading", { name: "Calendario comercial" }),
    ).toBeVisible();
    await expect(page.getByTestId("season-card")).toHaveCount(15);

    // Cada fecha lleva al asistente con su ambientación.
    await page.getByTestId("season-card").first().click();
    await expect(page).toHaveURL(/\/create\?season=\w+$/);
    await expect(page.getByTestId("season-notice")).toContainText(
      "Anuncio para",
    );
  });

  test("crea un anuncio para el Día de la Madre", async ({ page }) => {
    await pymeWithCredits(page, 500);
    await page.goto("/create?season=mothersDay");

    await expect(page.getByTestId("season-notice")).toContainText(
      "Anuncio para Día de la Madre",
    );
    await describeProduct(page);

    // La fecha propone su plantilla.
    await expect(
      page.getByRole("radio", { name: /Promo 15s para Instagram/ }),
    ).toBeChecked();
    await next(page);

    await expect(page.getByLabel("Texto del anuncio")).toHaveValue(
      "Este Día de la Madre, sorpréndela con Rosas de Panadería La Esquina 💐 ¡Escríbenos y separa el tuyo!",
    );
    await page.getByRole("button", { name: "Generar anuncio" }).click();

    await expect(page).toHaveURL(/\/ads\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Fecha comercial")).toBeVisible();
    await expect(
      page.getByText("Día de la Madre", { exact: true }),
    ).toBeVisible();
  });

  test("con oferta usa el copy de la oferta y se puede quitar la fecha", async ({
    page,
  }) => {
    await pymeWithCredits(page, 500);
    await page.goto("/create?season=blackFriday");
    await describeProduct(page);

    await expect(
      page.getByRole("radio", { name: /Oferta del día/ }),
    ).toBeChecked();
    await page.getByLabel("¿Cuál es la oferta?").fill("30 % de descuento");
    await next(page);
    await expect(page.getByLabel("Texto del anuncio")).toHaveValue(
      "🖤 Black Friday en Panadería La Esquina: 30 % de descuento en Rosas. ¡Solo por tiempo limitado!",
    );

    await page.getByRole("button", { name: "Quitar fecha" }).click();
    await expect(page.getByTestId("season-notice")).toHaveCount(0);
    await expect(page.getByLabel("Texto del anuncio")).toHaveValue(
      "🔥 Oferta del día en Panadería La Esquina: 30 % de descuento en Rosas. ¡Solo por hoy!",
    );
  });
});
