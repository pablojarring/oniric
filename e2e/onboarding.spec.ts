import { expect, test } from "@playwright/test";

import { fillOnboarding, login, signInWithOrganization } from "./support/flows";
import { createConfirmedUser } from "./support/supabase";

test.describe("asignación de segmento", () => {
  test("un negocio pequeño del dueño queda en pyme", async ({ page }) => {
    await signInWithOrganization(page, { teamSize: "2-5", teamType: "owner" });

    await expect(page).toHaveURL("/home");
    await expect(
      page.getByRole("heading", { name: "¡Hola, Panadería La Esquina!" }),
    ).toBeVisible();
  });

  test("una agencia queda en empresa", async ({ page }) => {
    await signInWithOrganization(page, { teamSize: "1", teamType: "agency" });

    await expect(page).toHaveURL("/workspace");
  });

  test("un equipo de marketing queda en empresa", async ({ page }) => {
    await signInWithOrganization(page, {
      teamSize: "2-5",
      teamType: "marketing_team",
    });

    await expect(page).toHaveURL("/workspace");
  });

  test("un equipo de más de 10 personas queda en empresa", async ({ page }) => {
    await signInWithOrganization(page, {
      teamSize: "11-50",
      teamType: "owner",
    });

    await expect(page).toHaveURL("/workspace");
  });
});

test("el onboarding valida y conserva lo elegido", async ({ page }) => {
  const user = await createConfirmedUser();
  await login(page, user.email, user.password);
  await expect(page).toHaveURL("/onboarding");

  await fillOnboarding(page, {
    teamSize: "6-10",
    teamType: "owner",
    withPurpose: false,
  });

  await expect(page.getByText("Elige al menos una opción.")).toBeVisible();
  await expect(page.getByLabel("Nombre del negocio")).toHaveValue(
    "Panadería La Esquina",
  );
  await expect(page.getByRole("radio", { name: "De 6 a 10" })).toBeChecked();

  await page.getByRole("checkbox", { name: "Anuncios pagados" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL("/home");
});

test("cada segmento solo entra a su área", async ({ page }) => {
  await signInWithOrganization(page, { teamSize: "1", teamType: "owner" });
  await expect(page).toHaveURL("/home");

  await page.goto("/workspace");
  await expect(page).toHaveURL("/home");

  await page.goto("/onboarding");
  await expect(page).toHaveURL("/home");
});

test("el modo avanzado cambia entre pyme y empresa", async ({ page }) => {
  await signInWithOrganization(page, { teamSize: "1", teamType: "owner" });

  await page.getByRole("link", { name: "Configuración" }).click();
  const advancedMode = page.getByRole("switch", { name: "Modo avanzado" });
  await expect(advancedMode).not.toBeChecked();

  await advancedMode.click();
  await expect(page.getByText("Listo, guardamos el cambio.")).toBeVisible();
  await page.goto("/home");
  await expect(page).toHaveURL("/workspace");

  await page.getByRole("link", { name: "Configuración" }).click();
  await page.getByRole("switch", { name: "Modo avanzado" }).click();
  await expect(page.getByText("Listo, guardamos el cambio.")).toBeVisible();
  await page.goto("/workspace");
  await expect(page).toHaveURL("/home");
});

test("el idioma elegido se aplica al volver a iniciar sesión", async ({
  browser,
}) => {
  const firstVisit = await browser.newPage();
  const user = await signInWithOrganization(firstVisit, {
    teamSize: "1",
    teamType: "owner",
  });
  await firstVisit
    .getByRole("combobox", { name: "Idioma" })
    .selectOption({ label: "Português" });
  await expect(firstVisit).toHaveURL("/pt/home");
  await firstVisit.close();

  // Otro navegador, sin cookies: la página de login abre en español.
  const context = await browser.newContext({ locale: "es-EC" });
  const page = await context.newPage();
  await login(page, user.email, user.password);

  await expect(page).toHaveURL("/pt/home");
  await expect(
    page.getByRole("heading", { name: "Olá, Panadería La Esquina!" }),
  ).toBeVisible();
  await context.close();
});
