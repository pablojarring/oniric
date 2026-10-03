import { describe, expect, it } from "vitest";

import { openaiTextConfig } from ".";

describe("openaiTextConfig", () => {
  it("sin clave se usa el simulador", () => {
    expect(openaiTextConfig({})).toBeNull();
    expect(openaiTextConfig({ OPENAI_API_KEY: "  " })).toBeNull();
  });

  it("con clave usa GPT-6 Luna salvo que se elija otro modelo", () => {
    expect(openaiTextConfig({ OPENAI_API_KEY: "sk-test" })).toEqual({
      apiKey: "sk-test",
      model: undefined,
    });
    expect(
      openaiTextConfig({
        OPENAI_API_KEY: "sk-test",
        OPENAI_TEXT_MODEL: " gpt-6-luna ",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-6-luna" });
  });
});
