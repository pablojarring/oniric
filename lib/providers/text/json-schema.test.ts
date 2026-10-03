import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toStrictJsonSchema } from "./json-schema";

describe("toStrictJsonSchema", () => {
  it("cierra los objetos, exige todos los campos y quita $schema", () => {
    const schema = z.object({
      question: z.string(),
      options: z
        .array(z.object({ label: z.string(), hint: z.string().nullable() }))
        .min(3)
        .max(5),
      kind: z.enum(["single", "free"]),
    });

    expect(toStrictJsonSchema(schema)).toEqual({
      type: "object",
      properties: {
        question: { type: "string" },
        options: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              hint: { type: ["string", "null"] },
            },
            required: ["label", "hint"],
            additionalProperties: false,
          },
        },
        kind: { type: "string", enum: ["single", "free"] },
      },
      required: ["question", "options", "kind"],
      additionalProperties: false,
    });
  });

  it("quita los largos de texto, que la salida estricta no admite", () => {
    const json = toStrictJsonSchema(
      z.object({ title: z.string().min(3).max(60) }),
    );
    expect(json.properties).toEqual({ title: { type: "string" } });
  });

  it("rechaza campos opcionales y dice cómo corregirlo", () => {
    expect(() =>
      toStrictJsonSchema(z.object({ note: z.string().optional() })),
    ).toThrow(".nullable()");
  });

  it("exige un objeto en la raíz", () => {
    expect(() => toStrictJsonSchema(z.array(z.string()))).toThrow("objeto");
  });
});
