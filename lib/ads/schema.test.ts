import { describe, expect, it } from "vitest";

import { parseAdForm } from "./schema";

const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "foto.jpg", {
  type: "image/jpeg",
});
const emptyFile = new File([], "", { type: "application/octet-stream" });

function form(fields: Record<string, string | File>) {
  const data = new FormData();
  const defaults = {
    templateId: "promoInstagram",
    aspectRatio: "9:16",
    productName: "Pan de yuca",
    description: "Recién horneado",
    offer: "",
    adCopy: "¿Ya conoces el pan de yuca?",
    photo: emptyFile,
    expectedPriceCredits: "105",
  };
  for (const [name, value] of Object.entries({ ...defaults, ...fields })) {
    data.set(name, value);
  }
  return data;
}

function invalidFields(data: FormData) {
  const parsed = parseAdForm(data);
  return parsed.success
    ? []
    : parsed.error.issues.map((issue) => issue.path[0]);
}

describe("parseAdForm", () => {
  it("acepta un anuncio con descripción y sin foto", () => {
    const parsed = parseAdForm(form({}));
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      templateId: "promoInstagram",
      photo: null,
      photoConsent: false,
      expectedPriceCredits: 105,
    });
  });

  it("acepta una foto con consentimiento y sin descripción", () => {
    const parsed = parseAdForm(
      form({ description: "", photo: jpeg, photoConsent: "on" }),
    );
    expect(parsed.success).toBe(true);
    expect(parsed.data?.photo).toBeInstanceOf(Blob);
  });

  it("pide foto o descripción", () => {
    expect(invalidFields(form({ description: "  " }))).toEqual(["description"]);
  });

  it("pide el consentimiento cuando hay foto", () => {
    expect(invalidFields(form({ photo: jpeg }))).toEqual(["photoConsent"]);
  });

  it("acepta una fecha comercial conocida y rechaza las demás", () => {
    expect(parseAdForm(form({ seasonId: "mothersDay" })).data?.seasonId).toBe(
      "mothersDay",
    );
    expect(parseAdForm(form({ seasonId: "" })).data?.seasonId).toBeUndefined();
    expect(invalidFields(form({ seasonId: "halloween" }))).toEqual([
      "seasonId",
    ]);
  });

  it("pide la oferta en la oferta del día", () => {
    expect(
      invalidFields(form({ templateId: "dailyOffer", aspectRatio: "1:1" })),
    ).toEqual(["offer"]);
  });

  it("rechaza un formato que la plantilla no tiene", () => {
    expect(
      invalidFields(
        form({ templateId: "whatsappStatus", aspectRatio: "16:9" }),
      ),
    ).toEqual(["aspectRatio"]);
  });

  it("rechaza plantillas desconocidas y textos vacíos o largos", () => {
    expect(
      invalidFields(
        form({
          templateId: "playground",
          productName: "x",
          adCopy: "a".repeat(301),
        }),
      ),
    ).toEqual(expect.arrayContaining(["templateId", "productName", "adCopy"]));
  });
});
