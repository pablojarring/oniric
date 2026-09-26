import { expect, test } from "@playwright/test";

import { login } from "./support/flows";
import {
  createConfirmedUser,
  TEST_PASSWORD,
  uniqueEmail,
  waitForEmail,
} from "./support/supabase";

test.describe("registro", () => {
  test("confirma el correo aunque el enlace se abra en otro dispositivo", async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail("signup");

    await page.goto("/signup");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(
      page.getByText(`Te enviamos un enlace a ${email}`),
    ).toBeVisible();

    const { subject, link } = await waitForEmail(email);
    expect(subject).toBe("Confirma tu correo · Oniric");

    // Otro navegador, sin los cookies del registro (p. ej. el celular).
    const phone = await browser.newContext({ locale: "es-EC" });
    const phonePage = await phone.newPage();
    await phonePage.goto(link);
    await expect(phonePage).toHaveURL("/onboarding");
    await expect(
      phonePage.getByRole("heading", { name: "Cuéntanos sobre tu negocio" }),
    ).toBeVisible();
    await phone.close();
  });

  test("en portugués envía el correo en portugués y vuelve a /pt", async ({
    page,
  }) => {
    const email = uniqueEmail("signup-pt");

    await page.goto("/pt/signup");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Confira seu e-mail")).toBeVisible();

    const { subject, link } = await waitForEmail(email);
    expect(subject).toBe("Confirme seu e-mail · Oniric");

    await page.goto(link);
    await expect(page).toHaveURL("/pt/onboarding");
    await expect(
      page.getByRole("heading", { name: "Conte sobre o seu negócio" }),
    ).toBeVisible();
  });

  test("un enlace inválido vuelve al login con un aviso", async ({ page }) => {
    await page.goto("/api/auth/confirm?token_hash=falso&type=email");

    await expect(page).toHaveURL(/\/login\?error=invalidLink/);
    await expect(
      page.getByText("El enlace no es válido o ya venció"),
    ).toBeVisible();
  });
});

test.describe("inicio de sesión", () => {
  test("muestra un error con credenciales incorrectas", async ({ page }) => {
    const user = await createConfirmedUser();

    await login(page, user.email, "otra-clave-123");

    await expect(
      page.getByText("El correo o la contraseña no son correctos."),
    ).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toHaveValue(user.email);
  });

  test("una página protegida pide login y vuelve a ella", async ({ page }) => {
    const user = await createConfirmedUser();

    await page.goto("/onboarding");
    await expect(page).toHaveURL("/login?next=%2Fonboarding");

    await page.getByLabel("Correo electrónico").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL("/onboarding");
  });

  test("no redirige a sitios externos con ?next", async ({ page }) => {
    const user = await createConfirmedUser();

    await page.goto("/login?next=https://evil.example");
    await page.getByLabel("Correo electrónico").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL("/onboarding");
  });

  test("cerrar sesión vuelve al inicio y protege las páginas", async ({
    page,
  }) => {
    const user = await createConfirmedUser();
    await login(page, user.email, user.password);
    await expect(page).toHaveURL("/onboarding");

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/onboarding");
    await expect(page).toHaveURL("/login?next=%2Fonboarding");
  });
});

test("recuperar la contraseña", async ({ page }) => {
  const user = await createConfirmedUser();
  const newPassword = "nueva-clave-456";

  await page.goto("/login");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  // El login también tiene un campo de correo: esperar a la página nueva.
  await expect(
    page.getByRole("heading", { name: "Recupera tu contraseña" }),
  ).toBeVisible();
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText("Revisa tu correo")).toBeVisible();

  const { subject, link } = await waitForEmail(user.email);
  expect(subject).toBe("Restablece tu contraseña · Oniric");
  await page.goto(link);

  await expect(page).toHaveURL("/update-password");
  await page.getByLabel("Contraseña nueva").fill(newPassword);
  await page.getByLabel("Repite la contraseña").fill(newPassword);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL("/onboarding");

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/");
  await login(page, user.email, newPassword);
  await expect(page).toHaveURL("/onboarding");
});
