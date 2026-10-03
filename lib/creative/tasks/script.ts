import type { AspectRatio } from "@/lib/providers/generation-provider";
import type { TextRequest } from "@/lib/providers/text";

import {
  type BusinessContext,
  customerLanguage,
  DATA_NOT_INSTRUCTIONS,
  describeBrief,
  describeBusiness,
  featuringRule,
} from "../context";
import {
  type CreativeBrief,
  type CreativeIdea,
  type CreativeScriptOutput,
  creativeScriptSchema,
  type Featuring,
  type QualityTier,
} from "../schemas";
import { tierSettings } from "../tiers";

// Guion por tomas y prompt detallado (docs/fase-a/manual-creativo.md: flujo
// creativo, pasos 5 y 6, y estructura del prompt). El guion lo lee el cliente;
// los prompts van en inglés al modelo de video y de imagen.

/** Zona libre para la capa de edición, según el formato. */
const safeAreas: Record<AspectRatio, string> = {
  "9:16":
    "keep the top 15% and the bottom 25% of the frame free of key action for text and buttons",
  "1:1": "keep the bottom 20% of the frame free of key action for text",
  "16:9": "keep the lower third of the frame free of key action for text",
};

export function scriptRequest(input: {
  business: BusinessContext;
  brief: CreativeBrief;
  idea: CreativeIdea;
  tier: QualityTier;
  featuring: Featuring | null;
  aspectRatio: AspectRatio;
  /** Guion anterior y cambio pedido por el dueño, para revisarlo. */
  revision: { script: CreativeScriptOutput; request: string } | null;
}): TextRequest<CreativeScriptOutput> {
  const { business, brief, idea, tier, featuring, aspectRatio, revision } =
    input;
  const settings = tierSettings[tier];
  const revisionText = revision
    ? `\n\nCurrent script:\n<script>\n${JSON.stringify(revision.script, null, 2)}\n</script>\n\nThe owner asked for this change:\n<request>\n${revision.request}\n</request>\nApply the change and keep everything else that still works.`
    : "";
  return {
    task: "creative_script",
    instructions: `You are the creative director of Oniric. Write the shot-by-shot script and the generation prompts for the chosen idea.

Script rules:
- Exactly ${settings.durationSeconds} seconds in total, at most ${settings.maxShots} shots, in ${aspectRatio}. Shots are contiguous: the first starts at 0, each starts where the previous ends, the last ends at ${settings.durationSeconds}.
- Shot 1 is the hook (first 1–2 seconds). The last shot closes with the idea's closing line and the call to action.
- For each shot: a short label, the action in one concrete sentence, the camera (shot size, angle, movement), the sound (ambience, effects or voice the video model can generate) and the on-screen text for the separate edit layer (or null).
- Write labels, actions, camera, sound, on-screen text and the call to action in ${customerLanguage[business.locale]}.
- Who appears: ${featuringRule(featuring, brief)}

Prompt rules (in English):
- promptParts follows this structure: subject (what is seen, faithful to the product), action, environment (place, time, season decor), camera (shot, angle, movement, lens), lighting and color, style, sound, constraints.
- constraints always include: no text, letters, subtitles or logos inside the video; ${safeAreas[aspectRatio]}; no third-party brands; no famous people; fictional people never presented as real customers; and the "who appears" rule above.
- videoPrompt: one cohesive prompt for an image-to-video model that starts from the keyframe, describing each shot with its timing ("0–2s: …"), camera moves and sound. Under 1,500 characters.
- keyframePrompt: the very first frame as a photorealistic still image, matching shot 1, with the same constraints. Under 800 characters.
- Use only facts from the brief. Never invent prices or claims.
- ${DATA_NOT_INSTRUCTIONS}`,
    messages: [
      {
        role: "user",
        content: `${describeBusiness(business)}\n\n${describeBrief(brief)}\n\nChosen idea:\n<idea>\n${JSON.stringify(idea, null, 2)}\n</idea>\n\nQuality tier: ${tier}.${revisionText}`,
      },
    ],
    schema: creativeScriptSchema,
    maxOutputTokens: 6_000,
    mock: () => mockScript(business, brief, idea, tier, revision?.request),
  };
}

function mockScript(
  business: BusinessContext,
  brief: CreativeBrief,
  idea: CreativeIdea,
  tier: QualityTier,
  revisionRequest: string | undefined,
): CreativeScriptOutput {
  const duration = tierSettings[tier].durationSeconds;
  const middle = Math.round(duration / 2);
  const note = revisionRequest ? ` Ajuste pedido: ${revisionRequest}.` : "";
  return {
    title: idea.title,
    shots: [
      {
        startSecond: 0,
        endSecond: middle,
        label: "Gancho",
        action: `Primer plano de ${brief.product} que llama la atención.${note}`,
        camera: "Macro, movimiento lento hacia adelante",
        sound: "Ambiente del local",
        onScreenText: null,
      },
      {
        startSecond: middle,
        endSecond: duration,
        label: "Cierre",
        action: `${brief.product} en el mostrador de ${business.name}.`,
        camera: "Plano medio, fijo",
        sound: "Ambiente suave",
        onScreenText: idea.closingLine,
      },
    ],
    callToAction: `Visítanos en ${business.name}`,
    promptParts: {
      subject: `${brief.product}, faithful to the reference photo`,
      action: "Slow reveal of the product",
      environment: "A small neighborhood shop in Latin America, morning",
      camera: "Macro push-in, then static medium shot",
      lighting: "Warm golden morning light",
      style: "Cinematic commercial, shallow depth of field",
      sound: "Soft shop ambience",
      constraints: "No text, letters or logos; keep the lower third free",
    },
    videoPrompt: `0-${middle}s: macro push-in on ${brief.product} in warm morning light. ${middle}-${duration}s: static medium shot of the product on the counter of a small neighborhood shop. Soft shop ambience. No text, letters or logos; keep the lower third free.`,
    keyframePrompt: `Photorealistic macro shot of ${brief.product} in warm golden morning light, shallow depth of field, small neighborhood shop. No text, letters or logos.`,
  };
}
