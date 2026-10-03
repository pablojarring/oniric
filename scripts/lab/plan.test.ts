import { describe, expect, it } from "vitest";

import { adTemplates, buildPrompt, MAX_PROMPT_LENGTH } from "@/lib/templates";

import {
  buildCleanPrompt,
  buildLabRequest,
  labCases,
  planRuns,
  sampleCopy,
  selectCases,
} from "./plan";

describe("casos del laboratorio", () => {
  it("tienen ids únicos y formatos que la plantilla acepta", () => {
    expect(new Set(labCases.map((labCase) => labCase.id)).size).toBe(
      labCases.length,
    );
    for (const labCase of labCases) {
      expect(adTemplates[labCase.templateId].aspectRatios).toContain(
        labCase.aspectRatio,
      );
    }
  });

  it("sin foto quedan fuera los casos con foto", () => {
    expect(selectCases({ hasPhoto: false }).some((c) => c.withPhoto)).toBe(
      false,
    );
    expect(selectCases({ hasPhoto: true })).toHaveLength(labCases.length);
    expect(
      selectCases({ hasPhoto: true, only: ["oferta-limpio"] }).map((c) => c.id),
    ).toEqual(["oferta-limpio"]);
  });
});

describe("buildCleanPrompt", () => {
  it("pide cero texto y deja libre la zona de la capa", () => {
    const prompt = buildCleanPrompt("whatsappStatus", "9:16", {
      productName: "Pan de yuca",
      hasProductPhoto: false,
    });
    expect(prompt).toContain("Do not render any text");
    expect(prompt).toContain("top quarter and the bottom third");
    expect(prompt).toContain("slow camera movement");
    expect(prompt).toContain("Pan de yuca");
    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
  });

  it("en imágenes no habla de cámara y respeta la foto", () => {
    const prompt = buildCleanPrompt("dailyOffer", "1:1", {
      productName: "Pan de yuca",
      hasProductPhoto: true,
    });
    expect(prompt).not.toContain("camera");
    expect(prompt).toContain("upper third");
    expect(prompt).toContain("reference photo");
  });
});

describe("buildLabRequest", () => {
  it("el prompt actual es el de producción, con el copy de la plantilla", () => {
    const request = buildLabRequest({
      id: "x",
      templateId: "dailyOffer",
      aspectRatio: "1:1",
      variant: "actual",
      withPhoto: false,
    });
    expect(request).toMatchObject({
      modelId: "marketing-studio-image",
      aspectRatio: "1:1",
      inputImageUrl: undefined,
    });
    expect(sampleCopy("dailyOffer")).toBe(
      "🔥 Oferta del día en Panadería La Esquina: 2x1 en Pan de yuca. ¡Solo por hoy!",
    );
    expect(request.prompt).toBe(
      buildPrompt(adTemplates.dailyOffer, {
        productName: "Pan de yuca",
        description:
          "Recién horneado en Quito, crocante por fuera y suave por dentro.",
        offer: "2x1",
        adCopy: sampleCopy("dailyOffer"),
        hasProductPhoto: false,
      }),
    );
  });

  it("el limpio no lleva el copy y pasa la foto con la duración de la plantilla", () => {
    const request = buildLabRequest(
      {
        id: "x",
        templateId: "whatsappStatus",
        aspectRatio: "9:16",
        variant: "limpio",
        withPhoto: true,
      },
      "https://files.test/foto.jpg",
    );
    expect(request).toMatchObject({
      modelId: "kling-3.0-std",
      durationSeconds: 10,
      inputImageUrl: "https://files.test/foto.jpg",
    });
    expect(request.prompt).not.toContain(sampleCopy("whatsappStatus"));
    expect(request.prompt).toContain("reference photo");
  });
});

describe("planRuns", () => {
  const estimate = (id: string, costUsd: number) => ({
    labCase: { ...labCases[0]!, id },
    costUsd,
  });

  it("corre en orden lo que entra y salta lo que no, sin pasarse", () => {
    const plan = planRuns(
      [
        estimate("a", 0.1),
        estimate("b", 0.1),
        estimate("c", 3),
        estimate("d", 1.2),
        estimate("e", 0.2),
      ],
      1.5,
    );
    expect(plan.run.map((p) => p.labCase.id)).toEqual(["a", "b", "d"]);
    expect(plan.skipped.map((p) => p.labCase.id)).toEqual(["c", "e"]);
    expect(plan.totalUsd).toBeCloseTo(1.4);
  });

  it("acepta un total exactamente igual al presupuesto", () => {
    expect(
      planRuns([estimate("a", 0.1), estimate("b", 0.2)], 0.3).run,
    ).toHaveLength(2);
  });
});
