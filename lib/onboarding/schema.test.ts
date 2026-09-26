import { describe, expect, it } from "vitest";

import { parseOnboardingForm } from "./schema";

function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

const valid: [string, string][] = [
  ["businessName", "  Panadería La Esquina  "],
  ["country", "EC"],
  ["industry", "food"],
  ["teamSize", "2-5"],
  ["teamType", "owner"],
  ["videoPurposes", "social_media"],
  ["videoPurposes", "whatsapp"],
];

describe("parseOnboardingForm", () => {
  it("acepta un formulario válido y limpia el nombre", () => {
    const result = parseOnboardingForm(form(valid));

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      businessName: "Panadería La Esquina",
      videoPurposes: ["social_media", "whatsapp"],
    });
  });

  it("rechaza valores fuera de las opciones", () => {
    const result = parseOnboardingForm(
      form([
        ...valid.filter(([key]) => key !== "country" && key !== "teamType"),
        ["country", "US"],
        ["teamType", "freelancer"],
      ]),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      "country",
      "teamType",
    ]);
  });

  it("exige al menos un uso de los videos", () => {
    const result = parseOnboardingForm(
      form(valid.filter(([key]) => key !== "videoPurposes")),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["videoPurposes"]);
  });
});
