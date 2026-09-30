import { expect, test, type Page } from "@playwright/test";

import { signInWithOrganization } from "./support/flows";

// En el celular el encabezado debe entrar sin desplazamiento horizontal y el
// selector debe mostrar el nombre completo del idioma.
test.use({ viewport: { width: 360, height: 740 } });

async function expectHeaderFits(page: Page) {
  const layout = await page.evaluate(() => {
    const select = document.querySelector("header select");
    if (!(select instanceof HTMLSelectElement)) throw new Error("Sin selector");
    const style = getComputedStyle(select);
    // Ancho del idioma elegido con la misma tipografía del selector.
    const probe = document.createElement("span");
    probe.style.font = style.font;
    probe.style.position = "absolute";
    probe.style.whiteSpace = "nowrap";
    probe.textContent = select.selectedOptions[0]?.textContent ?? "";
    document.body.append(probe);
    const textWidth = probe.getBoundingClientRect().width;
    probe.remove();
    return {
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      textWidth,
      available:
        select.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight),
    };
  });

  expect(layout.pageOverflow).toBeLessThanOrEqual(0);
  expect(layout.available).toBeGreaterThanOrEqual(layout.textWidth);
}

test.describe("encabezado en el celular", () => {
  test("la portada muestra el idioma completo en español y portugués", async ({
    page,
  }) => {
    await page.goto("/");
    await expectHeaderFits(page);
    // El pie repite estos enlaces: se buscan dentro del encabezado.
    const header = page.getByRole("banner");
    await expect(
      header.getByRole("link", { name: "Iniciar sesión" }),
    ).toBeVisible();
    await expect(
      header.getByRole("link", { name: "Crear cuenta" }),
    ).toBeVisible();

    await page.goto("/pt");
    await expect(page.getByRole("combobox", { name: "Idioma" })).toHaveValue(
      "pt",
    );
    await expectHeaderFits(page);
  });

  test("con sesión, el menú va en la barra de abajo y el saldo arriba", async ({
    page,
  }) => {
    await signInWithOrganization(page, { teamSize: "2-5", teamType: "owner" });
    await expect(page).toHaveURL("/home");
    await expectHeaderFits(page);
    await expect(page.getByTestId("header-balance")).toHaveAccessibleName(
      "Tu saldo: 0 créditos",
    );

    const tabBar = page.getByRole("navigation", { name: "Menú principal" });
    await tabBar.getByRole("link", { name: "Anuncios" }).click();
    await expect(page).toHaveURL("/ads");
    await expect(
      tabBar.getByRole("link", { name: "Anuncios" }),
    ).toHaveAttribute("aria-current", "page");

    await tabBar.getByRole("link", { name: "Ajustes" }).click();
    await expect(page).toHaveURL("/settings");
    await expectHeaderFits(page);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL("/");
  });
});
