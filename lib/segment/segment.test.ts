import { describe, expect, it } from "vitest";

import {
  teamSizes,
  teamTypes,
  type TeamSize,
  type TeamType,
} from "@/lib/onboarding/options";

import {
  assignSegment,
  EMPRESA_TEAM_SIZE_THRESHOLD,
  hasFeature,
  segmentConfig,
  segmentForAdvancedMode,
} from ".";

describe("assignSegment", () => {
  it.each<[TeamSize, TeamType, string]>([
    ["1", "owner", "pyme"],
    ["2-5", "owner", "pyme"],
    ["6-10", "owner", "pyme"],
    ["11-50", "owner", "empresa"],
    ["51+", "owner", "empresa"],
    ["1", "agency", "empresa"],
    ["2-5", "marketing_team", "empresa"],
    ["51+", "agency", "empresa"],
  ])("equipo de %s personas (%s) → %s", (teamSize, teamType, expected) => {
    expect(assignSegment({ teamSize, teamType })).toBe(expected);
  });

  it("cubre todas las combinaciones sin errores", () => {
    for (const { value } of teamSizes) {
      for (const teamType of teamTypes) {
        expect(["pyme", "empresa"]).toContain(
          assignSegment({ teamSize: value, teamType }),
        );
      }
    }
  });

  it("los rangos de tamaño no cruzan el umbral de empresa", () => {
    // Si un rango incluyera 10 y 11 personas, la regla no podría aplicarse.
    for (const { min, max } of teamSizes) {
      const minIsLarge = min > EMPRESA_TEAM_SIZE_THRESHOLD;
      const maxIsLarge = max > EMPRESA_TEAM_SIZE_THRESHOLD;
      expect(minIsLarge).toBe(maxIsLarge);
    }
  });
});

describe("segmentConfig", () => {
  it("cada segmento tiene su propia página de inicio", () => {
    expect(segmentConfig.pyme.homePath).not.toBe(
      segmentConfig.empresa.homePath,
    );
  });

  it("el asistente guiado es de pyme y el selector de modelo de empresa", () => {
    expect(hasFeature("pyme", "guidedWizard")).toBe(true);
    expect(hasFeature("pyme", "modelSelector")).toBe(false);
    expect(hasFeature("empresa", "modelSelector")).toBe(true);
    expect(hasFeature("empresa", "batchGeneration")).toBe(true);
  });

  it("el calendario comercial es del modo guiado", () => {
    expect(hasFeature("pyme", "seasonalCalendar")).toBe(true);
    expect(hasFeature("empresa", "seasonalCalendar")).toBe(false);
  });

  it("el menú solo lleva a secciones que el segmento puede usar", () => {
    const { navigation } = segmentConfig.pyme;
    expect(navigation[0]).toBe("home");
    if (navigation.includes("create")) {
      expect(hasFeature("pyme", "guidedWizard")).toBe(true);
    }
    if (navigation.includes("credits")) {
      expect(hasFeature("pyme", "buyCredits")).toBe(true);
    }
    expect(segmentConfig.empresa.navigation).not.toContain("create");
    expect(segmentConfig.empresa.navigation).not.toContain("credits");
  });
});

describe("segmentForAdvancedMode", () => {
  it("activar el modo avanzado cambia a empresa y desactivarlo a pyme", () => {
    expect(segmentForAdvancedMode(true)).toBe("empresa");
    expect(segmentForAdvancedMode(false)).toBe("pyme");
  });
});
