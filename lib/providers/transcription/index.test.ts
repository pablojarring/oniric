import { describe, expect, it } from "vitest";

import { openaiTranscriptionConfig } from ".";

describe("openaiTranscriptionConfig", () => {
  it("sin clave de OpenAI se usa el simulador", () => {
    expect(openaiTranscriptionConfig({})).toBeNull();
  });

  it("con clave usa gpt-transcribe salvo que se elija otro modelo", () => {
    expect(openaiTranscriptionConfig({ OPENAI_API_KEY: "sk-test" })).toEqual({
      apiKey: "sk-test",
      model: undefined,
    });
    expect(
      openaiTranscriptionConfig({
        OPENAI_API_KEY: "sk-test",
        OPENAI_TRANSCRIPTION_MODEL: " gpt-transcribe ",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-transcribe" });
  });
});
