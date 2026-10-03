import { expect, test, type Page } from "@playwright/test";

import { signInWithOrganization } from "./support/flows";

// El director creativo usa el simulador de texto (sin OPENAI_API_KEY): pregunta
// el objetivo, el producto y qué lo hace distinto, y después arma el brief.

async function pyme(page: Page) {
  await signInWithOrganization(page, { teamSize: "2-5", teamType: "owner" });
  await expect(page).toHaveURL("/home");
}

test.describe("director creativo", () => {
  test("de la conversación al guion, con otras ideas y un cambio", async ({
    page,
  }) => {
    await pyme(page);

    await page
      .getByRole("link", { name: "Probar el director creativo" })
      .click();
    await expect(page).toHaveURL("/director");
    await page.getByRole("button", { name: "Empezar" }).click();
    await expect(page).toHaveURL(/\/director\/[0-9a-f-]{36}$/);

    // Conversación: una respuesta de un toque, una escrita y "decide tú".
    await expect(
      page.getByRole("heading", {
        name: "¿Qué quieres lograr con este anuncio?",
      }),
    ).toBeVisible();
    await expect(page.getByText("Pregunta 1 de 6 como máximo")).toBeVisible();
    await page
      .getByRole("button", { name: "Vender más mi producto estrella" })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "¿Qué producto o servicio quieres mostrar?",
      }),
    ).toBeVisible();
    await page.getByLabel("Tu respuesta").fill("Pan de yuca de los domingos");
    await page.getByRole("button", { name: "Enviar" }).click();

    await expect(
      page.getByRole("heading", {
        name: "¿Qué lo hace distinto de los demás?",
      }),
    ).toBeVisible();
    const history = page.getByRole("list", { name: "Tus respuestas" });
    await expect(history).toContainText("Vender más mi producto estrella");
    await expect(history).toContainText("Pan de yuca de los domingos");
    await page.getByRole("button", { name: "No sé, decide tú" }).click();

    // Brief y nivel.
    await expect(
      page.getByRole("heading", { name: "¿Qué tan pro lo quieres?" }),
    ).toBeVisible();
    await expect(page.getByTestId("director-brief")).toContainText(
      "Pan de yuca de los domingos",
    );
    await expect(page.getByRole("radio", { name: /^Pro/ })).toBeChecked();
    await page.getByRole("radio", { name: /^Rápido/ }).click();
    await page.getByRole("button", { name: "Ver 3 ideas" }).click();

    // Ideas: el insight, 3 ideas y otras 3 distintas.
    await expect(
      page.getByRole("heading", { name: "3 ideas para tu anuncio" }),
    ).toBeVisible();
    await expect(page.getByTestId("director-insight")).toBeVisible();
    const ideas = page.getByTestId("director-idea");
    await expect(ideas).toHaveCount(3);
    await expect(page.getByText("Nivel: Rápido")).toBeVisible();
    await page.getByRole("button", { name: "Otras 3 ideas" }).click();
    await expect(ideas.first()).toContainText("(2)");

    await ideas.first().getByRole("button").click();

    // Guion: tomas que suman la duración del nivel y "Para curiosos".
    await expect(page.getByRole("heading", { name: "Tu guion" })).toBeVisible();
    const shots = page.getByTestId("director-shots");
    await expect(shots.getByRole("listitem").first()).toContainText("0–");
    await expect(shots.getByRole("listitem").last()).toContainText("–10 s");
    await page.getByText("Para curiosos: así se lo pedimos a la IA").click();
    await expect(page.getByText("Restricciones")).toBeVisible();

    await page
      .getByLabel("¿Quieres cambiar algo?")
      .fill("Que el gato sea atigrado");
    await page.getByRole("button", { name: "Aplicar cambio" }).click();
    await expect(page.getByText("Llevas 1 cambio")).toBeVisible();
    await expect(shots).toContainText("atigrado");

    // La sesión queda para retomarla desde el inicio del director.
    await page
      .getByRole("link", { name: "Volver al director creativo" })
      .click();
    await expect(page).toHaveURL("/director");
    await expect(page.getByTestId("director-recent")).toContainText(
      "Guion listo",
    );
  });

  test("el texto bloqueado por la moderación se avisa sin perder la pregunta", async ({
    page,
  }) => {
    await pyme(page);
    await page.goto("/director?season=mothersDay");
    await expect(page.getByTestId("season-notice")).toContainText(
      "Anuncio para",
    );
    await page.getByRole("radio", { name: /Cuadrado 1:1/ }).click();
    await page.getByRole("button", { name: "Empezar" }).click();
    await expect(page).toHaveURL(/\/director\/[0-9a-f-]{36}$/);

    await page.getByLabel("Tu respuesta").fill("Un video con cocaina");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(
      page.getByText("Ese texto no se puede usar en un anuncio"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "¿Qué quieres lograr con este anuncio?",
      }),
    ).toBeVisible();
    await expect(page.getByText("Pregunta 1 de 6 como máximo")).toBeVisible();
  });
});
