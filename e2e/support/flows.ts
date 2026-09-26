import { expect, type Page } from "@playwright/test";

import type { TeamSize, TeamType } from "../../lib/onboarding/options";

import { createConfirmedUser } from "./supabase";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

const teamSizeLabels: Record<TeamSize, string> = {
  "1": "Solo yo",
  "2-5": "De 2 a 5",
  "6-10": "De 6 a 10",
  "11-50": "De 11 a 50",
  "51+": "Más de 50",
};

const teamTypeLabels: Record<TeamType, string> = {
  owner: "Yo, soy el dueño o la dueña",
  marketing_team: "Nuestro equipo de marketing",
  agency: "Somos una agencia y creamos para clientes",
};

/** Completa el onboarding en español (la página ya debe estar abierta). */
export async function fillOnboarding(
  page: Page,
  answers: {
    businessName?: string;
    teamSize: TeamSize;
    teamType: TeamType;
    withPurpose?: boolean;
  },
) {
  await expect(
    page.getByRole("heading", { name: "Cuéntanos sobre tu negocio" }),
  ).toBeVisible();
  await page
    .getByLabel("Nombre del negocio")
    .fill(answers.businessName ?? "Panadería La Esquina");
  await page.getByLabel("País").selectOption({ label: "Ecuador" });
  await page
    .getByLabel("Industria")
    .selectOption({ label: "Restaurantes y comida" });
  await page
    .getByRole("radio", { name: teamSizeLabels[answers.teamSize] })
    .click();
  await page
    .getByRole("radio", { name: teamTypeLabels[answers.teamType] })
    .click();
  if (answers.withPurpose ?? true) {
    await page
      .getByRole("checkbox", {
        name: "Redes sociales (Instagram, TikTok, Facebook)",
      })
      .click();
  }
  await page.getByRole("button", { name: "Continuar" }).click();
}

/** Usuario confirmado, con sesión iniciada y onboarding completo. */
export async function signInWithOrganization(
  page: Page,
  answers: { teamSize: TeamSize; teamType: TeamType },
) {
  const user = await createConfirmedUser();
  await login(page, user.email, user.password);
  await expect(page).toHaveURL("/onboarding");
  await fillOnboarding(page, answers);
  return user;
}
