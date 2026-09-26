import { expect, test } from "@playwright/test";

test.describe("tarea programada de generaciones", () => {
  test("rechaza pedidos sin el secreto", async ({ request }) => {
    const response = await request.get("/api/cron/generation");
    expect(response.status()).toBe(401);

    const wrong = await request.get("/api/cron/generation", {
      headers: { authorization: "Bearer otro-secreto" },
    });
    expect(wrong.status()).toBe(401);
  });

  test("con el secreto sincroniza jobs y vence créditos", async ({
    request,
  }) => {
    const secret = process.env.CRON_SECRET;
    test.skip(!secret, "CRON_SECRET no está definida");

    const response = await request.get("/api/cron/generation", {
      headers: { authorization: `Bearer ${secret}` },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      jobs: { checked: expect.any(Number), errors: 0 },
      expiredLots: expect.any(Number),
    });
  });
});
