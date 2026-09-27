import { describe, expect, it } from "vitest";

import { moderateText } from ".";

describe("moderateText", () => {
  it("permite textos comerciales normales", () => {
    expect(
      moderateText([
        "Pan de yuca recién horneado",
        "Oferta 2x1 en toda la tienda",
        "Promoção de açaí no fim de semana",
      ]),
    ).toEqual({ allowed: true });
  });

  it("bloquea términos sin importar mayúsculas ni tildes", () => {
    expect(moderateText(["Video con COCAÍNA"])).toEqual({
      allowed: false,
      term: "cocaina",
    });
  });

  it("bloquea frases completas aunque tengan signos entre palabras", () => {
    expect(moderateText(["Vendemos arma-de-fuego"])).toMatchObject({
      allowed: false,
    });
  });

  it("revisa todos los textos", () => {
    expect(moderateText(["Camisetas", "", "fotos nudes"])).toMatchObject({
      allowed: false,
      term: "nudes",
    });
  });

  it("no bloquea expresiones comerciales comunes", () => {
    expect(
      moderateText([
        "¡Eres un crack!",
        "Para matar el antojo",
        "Envíos a La Matanza",
      ]),
    ).toEqual({ allowed: true });
  });

  it("no bloquea palabras que solo contienen un término", () => {
    // "crackers" contiene "crack", "skill" contiene "kill".
    expect(
      moderateText(["Galletas crackers", "Curso de skill building"]),
    ).toEqual({ allowed: true });
  });
});
