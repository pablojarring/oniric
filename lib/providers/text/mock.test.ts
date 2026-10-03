import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MOCK_TEXT_FAILURE_MARKER, MockTextProvider } from "./mock";
import type { TextRequest } from "./text-provider";

const schema = z.object({ ideas: z.array(z.string()).length(3) });

const request: TextRequest<z.infer<typeof schema>> = {
  task: "creative_ideas",
  instructions: "Propón 3 ideas distintas.",
  messages: [{ role: "user", content: "Panadería La Esquina, Quito." }],
  schema,
  mock: () => ({ ideas: ["Con humor", "Emotiva", "Demostración"] }),
};

describe("MockTextProvider", () => {
  it("responde con la respuesta de prueba de la tarea, validada", async () => {
    const result = await new MockTextProvider().generate(request);
    expect(result.output.ideas).toEqual([
      "Con humor",
      "Emotiva",
      "Demostración",
    ]);
    expect(result.model).toContain("(mock)");
  });

  it("usa las respuestas registradas si la tarea no trae una", async () => {
    const provider = new MockTextProvider({
      creative_ideas: () => ({ ideas: ["A", "B", "C"] }),
    });
    const result = await provider.generate({ ...request, mock: undefined });
    expect(result.output.ideas).toEqual(["A", "B", "C"]);
  });

  it("estima el uso y lo cobra con la tarifa del modelo real", async () => {
    const { usage } = await new MockTextProvider().generate(request);
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);
    expect(usage.cachedInputTokens).toBe(0);
    expect(usage.costMicroUsd).toBe(
      Math.ceil(usage.inputTokens * 0.1 + usage.outputTokens * 0.5),
    );
  });

  it("valida la respuesta de prueba con el esquema", async () => {
    await expect(
      new MockTextProvider().generate({
        ...request,
        mock: () => ({ ideas: ["solo una"] }),
      }),
    ).rejects.toThrow();
  });

  it("falla con el marcador o sin respuesta de prueba", async () => {
    const provider = new MockTextProvider();
    await expect(
      provider.generate({
        ...request,
        instructions: `${request.instructions} ${MOCK_TEXT_FAILURE_MARKER}`,
      }),
    ).rejects.toThrow("Falla simulada");
    await expect(
      provider.generate({ ...request, mock: undefined }),
    ).rejects.toThrow("no tiene respuesta");
  });
});
