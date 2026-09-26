import { expect, test } from "@playwright/test";

test.describe("selección de idioma", () => {
  test("cambia a portugués y recuerda la elección", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");

    await page
      .getByRole("combobox", { name: "Idioma" })
      .selectOption({ label: "Português" });

    await expect(page).toHaveURL("/pt");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt");
    await expect(
      page.getByText("Estamos construindo a plataforma."),
    ).toBeVisible();

    // La cookie hace que la próxima visita a `/` abra en portugués.
    await page.goto("/");
    await expect(page).toHaveURL("/pt");

    await page
      .getByRole("combobox", { name: "Idioma" })
      .selectOption({ label: "Español" });
    await expect(page).toHaveURL("/");
    await expect(
      page.getByText("Estamos construyendo la plataforma."),
    ).toBeVisible();
  });

  test("muestra 404 en el idioma de la URL", async ({ page }) => {
    const response = await page.goto("/pt/pagina-inexistente");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeVisible();
  });
});

test.describe("con el navegador en portugués", () => {
  test.use({ locale: "pt-BR" });

  test("redirige a /pt en la primera visita", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/pt");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  });
});

test.describe("con el navegador en un idioma no disponible", () => {
  test.use({ locale: "gn-PY" });

  test("usa español", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });
});
