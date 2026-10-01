import { describe, expect, it } from "vitest";

import es from "@/messages/es.json";
import pt from "@/messages/pt.json";
import type { GenerationProvider } from "@/lib/providers/generation-provider";
import { HiggsfieldProvider } from "@/lib/providers/higgsfield";
import { MockProvider } from "@/lib/providers/mock";

import {
  adTemplates,
  buildPrompt,
  isTemplateId,
  MAX_PROMPT_LENGTH,
  modelForTemplate,
  templateIds,
} from ".";

describe("plantillas pyme", () => {
  it("hay exactamente las tres plantillas del MVP", () => {
    expect(templateIds).toEqual([
      "promoInstagram",
      "whatsappStatus",
      "dailyOffer",
    ]);
  });

  const providers: Record<string, GenerationProvider> = {
    mock: new MockProvider(),
    higgsfield: new HiggsfieldProvider({ credentials: "" }),
  };

  it.each(
    templateIds.flatMap((id) =>
      Object.keys(providers).map((providerId) => [id, providerId] as const),
    ),
  )(
    "%s usa un modelo de %s compatible con su formato y duración",
    async (id, providerId) => {
      const template = adTemplates[id];
      const models = await providers[providerId]!.listModels();
      const model = models.find(
        (candidate) => candidate.id === modelForTemplate(template, providerId),
      );

      expect(model).toBeDefined();
      expect(model?.mediaType).toBe(template.mediaType);
      for (const ratio of template.aspectRatios) {
        expect(model?.aspectRatios).toContain(ratio);
      }
      expect(template.aspectRatios).toContain(template.defaultAspectRatio);
      if (template.mediaType === "video") {
        expect(model?.durationsSeconds).toContain(template.durationSeconds);
      }
    },
  );

  it.each(templateIds)(
    "%s tiene nombre, descripción y copy en es y pt",
    (id) => {
      for (const messages of [es, pt]) {
        const item = messages.Templates.items[id];
        expect(item.name).not.toBe("");
        expect(item.description).not.toBe("");
        expect(item.copy).toContain("{product}");
        expect(item.copy).toContain("{business}");
      }
    },
  );

  it("la oferta del día pide la oferta y la usa en el copy", () => {
    expect(adTemplates.dailyOffer.requiresOffer).toBe(true);
    expect(es.Templates.items.dailyOffer.copy).toContain("{offer}");
  });

  it("falla si la plantilla no tiene modelo para el proveedor", () => {
    expect(() =>
      modelForTemplate(adTemplates.promoInstagram, "otro"),
    ).toThrow();
  });

  it("reconoce ids válidos", () => {
    expect(isTemplateId("dailyOffer")).toBe(true);
    expect(isTemplateId("playground")).toBe(false);
  });
});

describe("buildPrompt", () => {
  it("combina el estilo, el producto, la oferta, la foto y el copy", () => {
    const prompt = buildPrompt(adTemplates.dailyOffer, {
      productName: "Pan de yuca",
      description: "Recién horneado, crocante por fuera.",
      offer: "2x1",
      adCopy: "🔥 Oferta del día en La Esquina: 2x1 en Pan de yuca.",
      hasProductPhoto: true,
    });

    expect(prompt).toContain(adTemplates.dailyOffer.style);
    expect(prompt).toContain("Pan de yuca");
    expect(prompt).toContain("2x1");
    expect(prompt).toContain("reference photo");
    expect(prompt).toContain(
      '"🔥 Oferta del día en La Esquina: 2x1 en Pan de yuca."',
    );
  });

  it("agrega la ambientación de la fecha comercial después del estilo", () => {
    const prompt = buildPrompt(adTemplates.promoInstagram, {
      productName: "Rosas",
      adCopy: "Para mamá",
      hasProductPhoto: false,
      seasonScene: "Mother's Day theme: soft flowers.",
    });

    expect(prompt).toContain(
      `${adTemplates.promoInstagram.style} Mother's Day theme: soft flowers.`,
    );
  });

  it("no supera el largo máximo", () => {
    const prompt = buildPrompt(adTemplates.promoInstagram, {
      productName: "x",
      description: "a".repeat(5_000),
      adCopy: "copy",
      hasProductPhoto: false,
    });

    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
  });
});
