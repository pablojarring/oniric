import type { GenerationProvider } from "./generation-provider";
import { MockProvider } from "./mock";

export type { GenerationProvider } from "./generation-provider";

let mockProvider: MockProvider | undefined;

function getMockProvider(): MockProvider {
  mockProvider ??= new MockProvider({
    latencyMs: Number(process.env.MOCK_PROVIDER_LATENCY_MS ?? 5000),
  });
  return mockProvider;
}

/**
 * Proveedor para las generaciones nuevas. Sin `HIGGSFIELD_API_KEY` se usa el
 * mock (CLAUDE.md §3.1).
 */
export function getGenerationProvider(): GenerationProvider {
  if (process.env.HIGGSFIELD_API_KEY) {
    // TODO(fase 3): HiggsfieldProvider, verificando los endpoints en la
    // documentación oficial. Mientras tanto no se usa el mock en silencio.
    throw new Error(
      "HIGGSFIELD_API_KEY está definida, pero el proveedor de Higgsfield llega en la fase 3.",
    );
  }
  return getMockProvider();
}

/** Proveedor con el que se creó un job existente (`generation_jobs.provider`). */
export function getProviderById(id: string): GenerationProvider {
  if (id === "mock") return getMockProvider();
  throw new Error(`Proveedor desconocido: ${id}`);
}
