import { expect, test } from "@playwright/test";

test.describe("portada", () => {
  test("carga en español con el título y el llamado principal", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Oniric: anuncios con IA para tu negocio");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Anuncios con IA para tu negocio, listos en minutos",
      }),
    ).toBeVisible();

    for (const name of [
      "Tu anuncio en 3 pasos",
      "Formatos que ya funcionan en redes",
      "Pagas por anuncio, no por mes",
      "Lo que suelen preguntarnos",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }

    // Las plantillas de la portada son las del asistente.
    for (const name of [
      "Promo 15s para Instagram",
      "Estado de WhatsApp",
      "Oferta del día",
    ]) {
      await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();
    }
  });

  test("el llamado principal lleva a crear la cuenta", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("link", { name: "Crear mi primer anuncio" })
      .first()
      .click();

    await expect(page).toHaveURL("/signup");
  });

  test("«Ver cómo funciona» baja hasta los pasos", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Ver cómo funciona" }).click();

    await expect(page).toHaveURL("/#how-it-works");
    await expect(
      page.getByRole("heading", { level: 2, name: "Tu anuncio en 3 pasos" }),
    ).toBeInViewport();
  });

  test("las preguntas frecuentes se abren al tocarlas", async ({ page }) => {
    await page.goto("/");
    const answer = page.getByText(
      "Te devolvemos automáticamente todos los créditos de ese anuncio.",
    );

    await expect(answer).toBeHidden();
    await page.getByText("¿Qué pasa si la generación falla?").click();
    await expect(answer).toBeVisible();
  });

  test("se ve en portugués", async ({ page }) => {
    await page.goto("/pt");

    await expect(page).toHaveTitle(
      "Oniric: anúncios com IA para o seu negócio",
    );
    await expect(
      page.getByRole("heading", { level: 2, name: "Seu anúncio em 3 passos" }),
    ).toBeVisible();
  });

  test.describe("en el celular", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test("no se desplaza de lado", async ({ page }) => {
      await page.goto("/");
      // Recorre la página para que carguen todas las secciones.
      await page.getByRole("contentinfo").scrollIntoViewIfNeeded();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});
