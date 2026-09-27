import { expect, test, type Page } from "@playwright/test";

import { grantCredits } from "./support/credits";
import { signInWithOrganization } from "./support/flows";

// PNG de 1×1 px.
const photo = {
  name: "producto.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
};

async function pymeWithCredits(page: Page, credits: number) {
  const user = await signInWithOrganization(page, {
    teamSize: "2-5",
    teamType: "owner",
  });
  await expect(page).toHaveURL("/home");
  if (credits > 0) grantCredits(user.email, credits);
  await page.reload();
  return user;
}

async function openWizard(page: Page) {
  await page.getByRole("link", { name: "Crear anuncio" }).click();
  await expect(page).toHaveURL("/create");
  await expect(
    page.getByRole("heading", { name: "Crea tu anuncio" }),
  ).toBeVisible();
}

const next = (page: Page) =>
  page.getByRole("button", { name: "Siguiente" }).click();

async function chooseTemplate(page: Page, name: RegExp) {
  await expect(page.getByText("Paso 2 de 3: Plantilla")).toBeAttached();
  await page.getByRole("radio", { name }).click();
}

test.describe("asistente de anuncios pyme", () => {
  test("crea un anuncio con foto y cobra el precio al terminar", async ({
    page,
  }) => {
    await pymeWithCredits(page, 200);
    await expect(page.getByTestId("credit-balance")).toHaveText("200 créditos");
    await openWizard(page);

    // Paso 1: producto y foto; sin consentimiento no avanza.
    await page.getByLabel("¿Qué quieres anunciar?").fill("Pan de yuca");
    await page.getByLabel("Foto del producto (opcional)").setInputFiles(photo);
    await expect(page.getByAltText("Vista previa de la foto")).toBeVisible();
    await next(page);
    await expect(
      page.getByText("Confirma que puedes usar esta foto."),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: /Tengo derecho/ }).click();
    await next(page);

    // Paso 2: plantilla con formato por defecto.
    await chooseTemplate(page, /Estado de WhatsApp/);
    await expect(
      page.getByRole("radio", { name: /Vertical 9:16/ }),
    ).toBeChecked();
    await next(page);

    // Paso 3: copy sugerido editable y precio.
    await expect(page.getByText("Paso 3 de 3: Revisa y genera")).toBeAttached();
    await expect(page.getByLabel("Texto del anuncio")).toHaveValue(
      "Hoy en Panadería La Esquina: Pan de yuca 🙌 Escríbenos por aquí para pedirlo.",
    );
    await page.getByLabel("Texto del anuncio").fill("¡Pan de yuca calientito!");
    await expect(page.getByText(/^70 créditos/)).toBeVisible();
    await page.getByRole("button", { name: "Generar anuncio" }).click();

    await expect(page).toHaveURL(/\/ads\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { name: "Pan de yuca" }),
    ).toBeVisible();
    await expect(page.getByText("¡Pan de yuca calientito!")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "¡Tu anuncio está listo!" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByAltText("Anuncio de Pan de yuca")).toBeVisible();

    await page.getByRole("link", { name: "Volver al inicio" }).click();
    await expect(page.getByTestId("credit-balance")).toHaveText("130 créditos");
  });

  test("si la generación falla, devuelve los créditos", async ({ page }) => {
    await pymeWithCredits(page, 10);
    await openWizard(page);

    await page.getByLabel("¿Qué quieres anunciar?").fill("Empanadas");
    // El MockProvider falla a propósito con este marcador.
    await page
      .getByLabel("Describe tu producto o servicio")
      .fill("De queso y de pollo [mock:falla]");
    await next(page);

    await chooseTemplate(page, /Oferta del día/);
    await next(page);
    await expect(page.getByText("Escribe la oferta.")).toBeVisible();
    await page.getByLabel("¿Cuál es la oferta?").fill("3x2");
    await next(page);

    await expect(page.getByLabel("Texto del anuncio")).toHaveValue(
      "🔥 Oferta del día en Panadería La Esquina: 3x2 en Empanadas. ¡Solo por hoy!",
    );
    await page.getByRole("button", { name: "Generar anuncio" }).click();

    await expect(page.getByText("No pudimos crear tu anuncio")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText("Te devolvimos los 3 créditos de este anuncio."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Volver al inicio" }).click();
    await expect(page.getByTestId("credit-balance")).toHaveText("10 créditos");
  });

  test("valida cada paso y no deja generar sin saldo", async ({ page }) => {
    await pymeWithCredits(page, 0);
    await expect(page.getByTestId("credit-balance")).toHaveText("0 créditos");
    await openWizard(page);

    await next(page);
    await expect(
      page.getByText(
        "Escribe el nombre de tu producto o servicio (al menos 2 letras).",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Sube una foto o escribe una descripción."),
    ).toBeVisible();

    await page.getByLabel("¿Qué quieres anunciar?").fill("Corte de cabello");
    await page
      .getByLabel("Describe tu producto o servicio")
      .fill("Cortes para toda la familia");
    await next(page);
    await next(page);
    await expect(page.getByText("Elige una plantilla.")).toBeVisible();
    await chooseTemplate(page, /Promo 15s para Instagram/);
    await next(page);

    await expect(page.getByText("No te alcanzan los créditos")).toBeVisible();
    await expect(
      page.getByText("Te faltan 105 créditos para este anuncio."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generar anuncio" }),
    ).toBeDisabled();

    // Volver atrás conserva lo escrito.
    await page.getByRole("button", { name: "Atrás" }).click();
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByLabel("¿Qué quieres anunciar?")).toHaveValue(
      "Corte de cabello",
    );
  });

  test("bloquea textos que no pasan la moderación", async ({ page }) => {
    await pymeWithCredits(page, 10);
    await openWizard(page);

    await page.getByLabel("¿Qué quieres anunciar?").fill("Fiesta");
    await page
      .getByLabel("Describe tu producto o servicio")
      .fill("Fiesta con cocaína");
    await next(page);
    await chooseTemplate(page, /Oferta del día/);
    await page.getByLabel("¿Cuál es la oferta?").fill("2x1");
    await next(page);
    await page.getByRole("button", { name: "Generar anuncio" }).click();

    await expect(
      page.getByText(/Tu anuncio incluye palabras que no podemos usar/),
    ).toBeVisible();
    await expect(page).toHaveURL("/create");
  });
});
