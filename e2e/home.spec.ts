import { expect, test } from "@playwright/test";

test("la página de inicio carga en español", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Oniric");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("heading", { level: 1, name: "Oniric" }),
  ).toBeVisible();
});
