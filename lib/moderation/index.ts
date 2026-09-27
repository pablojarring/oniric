// Moderación básica de los textos que el cliente escribe antes de enviarlos al
// proveedor (CLAUDE.md §7). Es un primer filtro por lista de términos, sin
// distinguir mayúsculas ni tildes. El proveedor aplica además su propia
// moderación.
//
// TODO(producto): revisar la lista con alguien de cumplimiento y decidir si se
// suma un servicio de moderación (por ejemplo, un clasificador) en la fase 3.

/**
 * Términos bloqueados en español, portugués e inglés. Se buscan como palabras o
 * frases completas. Se evitan palabras con usos comerciales comunes ("crack",
 * "matar el antojo", La Matanza) para no bloquear anuncios legítimos.
 */
const blockedTerms = [
  // Contenido sexual y explotación de menores.
  "porno",
  "pornografia",
  "porn",
  "desnudo",
  "desnuda",
  "desnudos",
  "desnudas",
  "nude",
  "nudes",
  "nsfw",
  "sexo explicito",
  "hentai",
  "pedofilia",
  "infantil sexual",
  "abuso infantil",
  "child abuse",
  // Violencia y armas.
  "asesinar",
  "asesinato",
  "masacre",
  "decapitar",
  "tiroteo",
  "atentado",
  "terrorismo",
  "terrorista",
  "bomba casera",
  "explosivos",
  "arma de fuego",
  "armas de fuego",
  "municion",
  "municiones",
  "murder",
  "gore",
  // Drogas ilegales.
  "cocaina",
  "heroina",
  "metanfetamina",
  "marihuana",
  "maconha",
  "fentanilo",
  "fentanil",
  // Odio y discriminación.
  "nazi",
  "nazis",
  "supremacia blanca",
  "limpieza etnica",
  // Suplantación y engaños.
  "deepfake",
  "suplantar",
  "suplantacion",
  "billetes falsos",
  "documentos falsos",
] as const;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

const normalizedTerms = [...new Set(blockedTerms.map(normalize))];

export type ModerationResult =
  { allowed: true } | { allowed: false; term: string };

/** Revisa los textos del cliente contra la lista de términos bloqueados. */
export function moderateText(texts: readonly string[]): ModerationResult {
  const haystack = ` ${texts.map(normalize).join(" ")} `;
  const term = normalizedTerms.find((candidate) =>
    haystack.includes(` ${candidate} `),
  );
  return term ? { allowed: false, term } : { allowed: true };
}
