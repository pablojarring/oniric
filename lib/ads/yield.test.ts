import { describe, expect, it } from "vitest";

import type { TemplatePrices } from "./service";
import { creditsYield } from "./yield";

const prices: TemplatePrices = {
  promoInstagram: { "9:16": 244, "1:1": 244, "16:9": 244 },
  whatsappStatus: { "9:16": 163 },
  dailyOffer: { "1:1": 17, "9:16": 17, "16:9": 17 },
};

describe("creditsYield", () => {
  it("cuenta los anuncios enteros que alcanzan", () => {
    expect(creditsYield(prices, 500)).toEqual({
      whatsapp: 3,
      promo: 2,
      images: 29,
    });
  });

  it("sin saldo no alcanza para nada", () => {
    expect(creditsYield(prices, 0)).toEqual({
      whatsapp: 0,
      promo: 0,
      images: 0,
    });
  });

  it("no divide por cero si falta un precio", () => {
    expect(creditsYield({ ...prices, whatsappStatus: {} }, 10).whatsapp).toBe(
      10,
    );
  });
});
