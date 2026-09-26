import { describe, expect, it } from "vitest";

import { localeFromPath, safeNextPath } from "./redirect";

const site = "http://localhost:3000";

describe("safeNextPath", () => {
  it.each([
    ["/settings", "/settings"],
    ["/pt/onboarding", "/pt/onboarding"],
    ["/home?tab=1", "/home?tab=1"],
    ["http://localhost:3000/pt/onboarding", "/pt/onboarding"],
  ])("acepta %s", (value, expected) => {
    expect(safeNextPath(value, site)).toBe(expected);
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "http://localhost:4000/home",
    "",
    null,
    undefined,
  ])("rechaza %s", (value) => {
    expect(safeNextPath(value, site)).toBeNull();
  });
});

describe("localeFromPath", () => {
  it("lee el prefijo de idioma", () => {
    expect(localeFromPath("/pt/onboarding")).toBe("pt");
    expect(localeFromPath("/pt")).toBe("pt");
  });

  it("usa español si no hay prefijo", () => {
    expect(localeFromPath("/onboarding")).toBe("es");
    expect(localeFromPath("/")).toBe("es");
    expect(localeFromPath("/fr/algo")).toBe("es");
  });
});
