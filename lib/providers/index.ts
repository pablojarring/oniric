import type { GenerationProvider } from "./generation-provider";
import { HIGGSFIELD_PROVIDER_ID, HiggsfieldProvider } from "./higgsfield";
import { MockProvider } from "./mock";

export type { GenerationProvider } from "./generation-provider";

type Env = Record<string, string | undefined>;

let mockProvider: MockProvider | undefined;
let higgsfieldProvider: HiggsfieldProvider | undefined;

function getMockProvider(): MockProvider {
  mockProvider ??= new MockProvider({
    latencyMs: Number(process.env.MOCK_PROVIDER_LATENCY_MS ?? 5000),
  });
  return mockProvider;
}

/**
 * Configuración de Higgsfield según el entorno, o null sin `HIGGSFIELD_API_KEY`
 * (`<key_id>:<key_secret>`). El webhook necesita una URL pública con HTTPS y
 * `HIGGSFIELD_WEBHOOK_SECRET`; sin ellos, los jobs se siguen por polling.
 */
export function higgsfieldConfig(env: Env) {
  const credentials = env.HIGGSFIELD_API_KEY?.trim();
  if (!credentials) return null;
  if (!/^[^:\s]+:[^:\s]+$/.test(credentials)) {
    throw new Error(
      "HIGGSFIELD_API_KEY debe tener el formato <key_id>:<key_secret>.",
    );
  }
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const secret = env.HIGGSFIELD_WEBHOOK_SECRET;
  return {
    credentials,
    webhook:
      siteUrl?.startsWith("https://") && secret
        ? { siteUrl, secret }
        : undefined,
  };
}

function getHiggsfieldProvider(): HiggsfieldProvider {
  if (!higgsfieldProvider) {
    const config = higgsfieldConfig(process.env);
    if (!config) {
      throw new Error("HIGGSFIELD_API_KEY no está definida.");
    }
    higgsfieldProvider = new HiggsfieldProvider(config);
  }
  return higgsfieldProvider;
}

/**
 * Proveedor para las generaciones nuevas: Higgsfield con `HIGGSFIELD_API_KEY`;
 * sin ella, el mock (CLAUDE.md §3.1). Con la clave, cada generación gasta saldo
 * real de Higgsfield.
 */
export function getGenerationProvider(): GenerationProvider {
  return higgsfieldConfig(process.env)
    ? getHiggsfieldProvider()
    : getMockProvider();
}

/** Proveedor con el que se creó un job existente (`generation_jobs.provider`). */
export function getProviderById(id: string): GenerationProvider {
  if (id === "mock") return getMockProvider();
  if (id === HIGGSFIELD_PROVIDER_ID) return getHiggsfieldProvider();
  throw new Error(`Proveedor desconocido: ${id}`);
}

/**
 * Proveedores cuyos modelos se pueden cobrar (panel de márgenes). Higgsfield
 * aparece aunque no esté configurado, para fijar sus márgenes antes de
 * activarlo: el panel solo lee su catálogo, que no llama a la API.
 */
export function listProviders(): GenerationProvider[] {
  return [
    getMockProvider(),
    higgsfieldConfig(process.env)
      ? getHiggsfieldProvider()
      : new HiggsfieldProvider({ credentials: "" }),
  ];
}
