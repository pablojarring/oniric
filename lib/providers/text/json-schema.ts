import { z } from "zod";

// Convierte un esquema de zod al JSON Schema que aceptan las salidas
// estructuradas estrictas (`strict: true`): todos los campos obligatorios,
// objetos cerrados y solo las palabras clave que el proveedor admite. Lo que se
// quita (largos de texto) se sigue validando con zod al recibir la respuesta.

type JsonSchema = Record<string, unknown>;

/** Palabras clave que las salidas estrictas no admiten. */
const UNSUPPORTED_KEYWORDS = ["$schema", "minLength", "maxLength"] as const;

export function toStrictJsonSchema(schema: z.ZodType): JsonSchema {
  const json = z.toJSONSchema(schema, { io: "output" }) as JsonSchema;
  if (json.type !== "object") {
    throw new Error("La salida estructurada debe ser un objeto.");
  }
  return clean(json, "$");
}

function clean(node: JsonSchema, path: string): JsonSchema {
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(node)) {
    if ((UNSUPPORTED_KEYWORDS as readonly string[]).includes(key)) continue;
    result[key] = value;
  }

  if (isObjectType(result.type)) {
    const properties = (result.properties ?? {}) as Record<string, JsonSchema>;
    const required = new Set((result.required as string[] | undefined) ?? []);
    const missing = Object.keys(properties).filter(
      (name) => !required.has(name),
    );
    if (missing.length > 0) {
      throw new Error(
        `${path}: los campos ${missing.join(", ")} son opcionales. En una salida estricta todos son obligatorios: usa .nullable().`,
      );
    }
    result.properties = Object.fromEntries(
      Object.entries(properties).map(([name, child]) => [
        name,
        clean(child, `${path}.${name}`),
      ]),
    );
    result.additionalProperties = false;
  }

  if (isRecord(result.items)) {
    result.items = clean(result.items, `${path}[]`);
  }
  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    const variants = result[key];
    if (Array.isArray(variants)) {
      result[key] = variants.map((variant, index) =>
        isRecord(variant) ? clean(variant, `${path}<${index}>`) : variant,
      );
    }
  }
  return result;
}

function isObjectType(type: unknown): boolean {
  return type === "object" || (Array.isArray(type) && type.includes("object"));
}

function isRecord(value: unknown): value is JsonSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
