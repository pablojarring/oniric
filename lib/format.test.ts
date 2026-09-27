import { describe, expect, it } from "vitest";

import { creditsToUsd, formatUsd } from "./format";

describe("formato de montos", () => {
  it("convierte créditos a USD (1 crédito = US$0,01)", () => {
    expect(creditsToUsd(70)).toBe(0.7);
    expect(creditsToUsd(1_400_000)).toBe(14_000);
  });

  it("formatea USD según el idioma", () => {
    expect(formatUsd(0.7, "es")).toMatch(/0\.70/);
    expect(formatUsd(0.7, "pt")).toMatch(/0,70/);
    expect(formatUsd(0.7, "es")).toContain("USD");
  });
});
