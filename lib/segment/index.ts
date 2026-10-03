// Lógica de segmento y feature flags (CLAUDE.md §4). Las diferencias entre pyme
// y empresa se consultan aquí; no con `if` sobre el segmento en los componentes.

import type { Segment } from "@/db/schema";
import {
  teamSizes,
  type TeamSize,
  type TeamType,
} from "@/lib/onboarding/options";

export type { Segment };

/** Un equipo con **más** de este número de personas se asigna a empresa. */
export const EMPRESA_TEAM_SIZE_THRESHOLD = 10;

/** Tipos de equipo que se asignan a empresa, sin importar su tamaño. */
export const EMPRESA_TEAM_TYPES: readonly TeamType[] = [
  "marketing_team",
  "agency",
];

/**
 * Segmento inicial de una organización según sus respuestas del onboarding:
 * empresa si el equipo tiene más de 10 personas o se identifica como agencia o
 * equipo de marketing; pyme en cualquier otro caso. El usuario puede cambiarlo
 * después con "Modo avanzado".
 */
export function assignSegment(answers: {
  teamSize: TeamSize;
  teamType: TeamType;
}): Segment {
  const size = teamSizes.find((option) => option.value === answers.teamSize);
  if (!size)
    throw new Error(`Tamaño de equipo desconocido: ${answers.teamSize}`);

  const isLargeTeam = size.min > EMPRESA_TEAM_SIZE_THRESHOLD;
  return isLargeTeam || EMPRESA_TEAM_TYPES.includes(answers.teamType)
    ? "empresa"
    : "pyme";
}

export type Feature =
  | "guidedWizard"
  | "templates"
  | "buyCredits"
  | "seasonalCalendar"
  | "modelSelector"
  | "advancedParameters"
  | "batchGeneration"
  | "approvals"
  | "brandKit"
  | "usageAnalytics";

/** Secciones de la navegación principal de la app. */
export type AppSection = "home" | "create" | "ads" | "credits";

type SegmentConfig = {
  /** Página de inicio del segmento, sin prefijo de idioma. */
  homePath: string;
  features: ReadonlySet<Feature>;
  /** Secciones del menú, en orden. Sin secciones no se muestra el menú. */
  navigation: readonly AppSection[];
};

// Capacidades por segmento según CLAUDE.md §1. Las de empresa se construyen en
// la fase 2; declararlas aquí evita decidirlas en cada componente.
export const segmentConfig: Record<Segment, SegmentConfig> = {
  pyme: {
    homePath: "/home",
    // TODO(producto): compra de créditos para empresa (facturación mensual).
    features: new Set([
      "guidedWizard",
      "templates",
      "buyCredits",
      "seasonalCalendar",
    ]),
    navigation: ["home", "create", "ads", "credits"],
  },
  empresa: {
    homePath: "/workspace",
    features: new Set([
      "templates",
      "modelSelector",
      "advancedParameters",
      "batchGeneration",
      "approvals",
      "brandKit",
      "usageAnalytics",
    ]),
    // TODO(fase 2): secciones del workspace empresa.
    navigation: [],
  },
};

export function hasFeature(segment: Segment, feature: Feature): boolean {
  return segmentConfig[segment].features.has(feature);
}

/** "Modo avanzado" en configuración equivale al segmento empresa. */
export function segmentForAdvancedMode(enabled: boolean): Segment {
  return enabled ? "empresa" : "pyme";
}

/** El interruptor de "Modo avanzado" está activo en el segmento empresa. */
export function isAdvancedMode(segment: Segment): boolean {
  return segment === "empresa";
}
