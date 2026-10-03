// Laboratorio de prompts: genera anuncios de prueba con Higgsfield real para
// calibrar las plantillas. GASTA SALDO REAL de Higgsfield, con tope.
//
//   pnpm higgsfield:lab --dry-run                 # solo estima (no gasta)
//   pnpm higgsfield:lab --budget 4.5              # corre lo que entra en US$4,50
//   pnpm higgsfield:lab --photo foto.jpg          # agrega los casos con foto
//   pnpm higgsfield:lab --only oferta-limpio,...  # solo esos casos
//
// Usa HIGGSFIELD_TEST_KEY (nunca HIGGSFIELD_API_KEY, que activaría el proveedor
// real en la app). Los resultados quedan en lab-output/<fecha>/ (ignorado por
// git). Ver docs/higgsfield.md.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import type { AspectRatio } from "@/lib/providers/generation-provider";
import {
  HiggsfieldApiError,
  HiggsfieldProvider,
} from "@/lib/providers/higgsfield";
import { frameProductPhoto } from "@/lib/uploads/frame";

import {
  buildLabRequest,
  planRuns,
  selectCases,
  type LabCase,
  type PlannedCase,
} from "./lab/plan";

const DEFAULT_BUDGET_USD = 4.5;
const CASE_TIMEOUT_MS = 15 * 60 * 1000;

type CaseResult = {
  id: string;
  templateId: string;
  variant: string;
  withPhoto: boolean;
  estimatedUsd: number;
  prompt: string;
  requestId?: string;
  status: "succeeded" | "failed" | "timeout" | "submit_failed";
  error?: string;
  files: string[];
  seconds: number;
};

const extensions: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const usd = (value: number) => `US$${value.toFixed(3)}`;

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      budget: { type: "string", default: String(DEFAULT_BUDGET_USD) },
      photo: { type: "string" },
      only: { type: "string" },
    },
  });
  const budgetUsd = Number(values.budget);
  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) {
    throw new Error("--budget debe ser un monto en USD mayor que cero.");
  }

  const credentials = process.env.HIGGSFIELD_TEST_KEY?.trim();
  if (!credentials || !/^[^:\s]+:[^:\s]+$/.test(credentials)) {
    throw new Error(
      "Falta HIGGSFIELD_TEST_KEY con el formato <key_id>:<key_secret>.",
    );
  }
  const provider = new HiggsfieldProvider({ credentials });

  const photo = values.photo ? await readFile(values.photo) : null;
  const cases = selectCases({
    hasPhoto: photo !== null,
    only: values.only?.split(",").map((id) => id.trim()),
  });
  if (cases.length === 0) throw new Error("No hay casos para correr.");

  // Estimar no gasta saldo. Con foto se estima igual que sin foto (ver
  // HiggsfieldProvider.estimate).
  const estimates: PlannedCase[] = [];
  for (const labCase of cases) {
    const { costUsd } = await provider.estimate(buildLabRequest(labCase));
    estimates.push({ labCase, costUsd });
  }
  const plan = planRuns(estimates, budgetUsd);

  console.log(`Presupuesto: ${usd(budgetUsd)}`);
  for (const { labCase, costUsd } of estimates) {
    const included = plan.run.some((p) => p.labCase.id === labCase.id);
    console.log(
      `  ${included ? "✓" : "–"} ${labCase.id.padEnd(22)} ${usd(costUsd)}${included ? "" : "  (no entra)"}`,
    );
  }
  console.log(`Total estimado: ${usd(plan.totalUsd)}`);
  if (values["dry-run"] || plan.run.length === 0) return;

  // La foto se encuadra en cada formato (como en la app) y se sube una vez.
  const photoUrls = new Map<AspectRatio, string>();
  async function photoUrlFor(labCase: LabCase) {
    if (!labCase.withPhoto || !photo) return undefined;
    let url = photoUrls.get(labCase.aspectRatio);
    if (!url) {
      const framed = await frameProductPhoto(photo, labCase.aspectRatio);
      url = await provider.uploadFile(
        new Uint8Array(framed) as Uint8Array<ArrayBuffer>,
        "image/jpeg",
      );
      photoUrls.set(labCase.aspectRatio, url);
    }
    return url;
  }

  const outDir = join(
    "lab-output",
    new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"),
  );
  await mkdir(outDir, { recursive: true });
  const results: CaseResult[] = [];

  for (const { labCase, costUsd } of plan.run) {
    const started = Date.now();
    const request = buildLabRequest(labCase, await photoUrlFor(labCase));
    const result: CaseResult = {
      id: labCase.id,
      templateId: labCase.templateId,
      variant: labCase.variant,
      withPhoto: request.inputImageUrl !== undefined,
      estimatedUsd: costUsd,
      prompt: request.prompt,
      status: "submit_failed",
      files: [],
      seconds: 0,
    };
    results.push(result);
    console.log(`\n→ ${labCase.id}: enviando…`);

    try {
      const { providerJobId } = await provider.submit(request);
      result.requestId = providerJobId;
      result.status = await waitForResult(provider, providerJobId, result);
      if (result.status === "succeeded") {
        const outputs = await provider.fetchOutput(providerJobId);
        for (const [index, output] of outputs.entries()) {
          const response = await fetch(output.url);
          if (!response.ok) throw new Error(`Descarga ${response.status}`);
          const name = `${labCase.id}${outputs.length > 1 ? `-${index + 1}` : ""}.${extensions[output.mimeType] ?? "bin"}`;
          await writeFile(
            join(outDir, name),
            new Uint8Array(await response.arrayBuffer()),
          );
          result.files.push(name);
        }
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      // Sin saldo en Higgsfield no tiene sentido seguir.
      if (error instanceof HiggsfieldApiError && error.insufficientCredits) {
        console.log("  Higgsfield no tiene saldo suficiente: me detengo.");
        break;
      }
    } finally {
      result.seconds = Math.round((Date.now() - started) / 1000);
      console.log(
        `  ${result.status}${result.error ? ` (${result.error})` : ""} en ${result.seconds} s ${result.files.join(", ")}`,
      );
      // Se guarda después de cada caso para no perder lo hecho si se corta.
      await writeFile(
        join(outDir, "results.json"),
        JSON.stringify(results, null, 2),
      );
    }
  }

  const spent = results
    .filter((r) => r.requestId)
    .reduce((sum, r) => sum + r.estimatedUsd, 0);
  console.log(
    `\nListo. Gasto estimado: ${usd(spent)} (los fallidos no se cobran). Resultados en ${outDir}/`,
  );
}

/** Consulta el estado con espera creciente (de 3 a 15 s) hasta que termina. */
async function waitForResult(
  provider: HiggsfieldProvider,
  requestId: string,
  result: CaseResult,
): Promise<CaseResult["status"]> {
  const deadline = Date.now() + CASE_TIMEOUT_MS;
  let delay = 3_000;
  while (Date.now() < deadline) {
    await sleep(delay);
    const status = await provider.getStatus(requestId);
    if (status.state === "succeeded") return "succeeded";
    if (status.state === "failed") {
      result.error = status.error;
      return "failed";
    }
    delay = Math.min(delay * 1.5, 15_000);
  }
  return "timeout";
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
