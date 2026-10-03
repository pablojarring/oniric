import type { TextRequest } from "@/lib/providers/text";

import {
  type BusinessContext,
  customerLanguage,
  DATA_NOT_INSTRUCTIONS,
  describeBrief,
  describeBusiness,
} from "../context";
import {
  type CreativeBrief,
  type CreativeIdeasOutput,
  creativeIdeasSchema,
  type QualityTier,
} from "../schemas";
import { tierSettings } from "../tiers";

// Insight y 3 ideas distintas (docs/fase-a/manual-creativo.md, principios 2 a
// 5): una verdad sobre quien compra, una sola idea por anuncio, muchas ideas
// por dentro y 3 bien distintas para elegir.

export function ideasRequest(input: {
  business: BusinessContext;
  brief: CreativeBrief;
  tier: QualityTier;
  previousTitles: readonly string[];
}): TextRequest<CreativeIdeasOutput> {
  const { business, brief, tier, previousTitles } = input;
  const settings = tierSettings[tier];
  const avoid =
    previousTitles.length > 0
      ? `\n- The owner asked for different ideas. Do not repeat or rephrase these: ${previousTitles.map((title) => `"${title}"`).join(", ")}.`
      : "";
  return {
    task: "creative_ideas",
    instructions: `You are the creative director of Oniric. Turn the brief into ad ideas the way top creative schools teach: business objective first, then an insight, then one single idea per ad.

Rules:
- Insight: one true, specific sentence about the people who buy from this business, which the owner can confirm with one tap. Not a slogan.
- Silently explore many "what if…?" ideas, then return the 3 strongest with clearly different angles (for example humor, emotional, demonstration).
- Each idea says ONE thing, hooks the viewer in the first 2 seconds, and ends with a closing line.
- Each idea must be producible as a ${settings.durationSeconds}-second AI-generated vertical video: ${settings.brief} No text, letters or logos inside the video (text is added later in a separate layer). No real people unless the brief says the owner agreed; fictional people only as clearly fictional, never as real customers or testimonials. No other brands.
- Feature the brand elements of the brief only when they are in it.
- Use only facts from the brief. Never invent prices, discounts, awards or claims.
- Write titles, loglines, closing lines and visual summaries in ${customerLanguage[business.locale]}, in plain words a business owner understands.
- Score each idea honestly from 1 to 5: hook (do the first 2 seconds stop the scroll?), relevance (does it touch a real truth of this business's customers?) and originality (fresh, not a cliché or obviously AI).${avoid}
- ${DATA_NOT_INSTRUCTIONS}`,
    messages: [
      {
        role: "user",
        content: `${describeBusiness(business)}\n\n${describeBrief(brief)}\n\nQuality tier: ${tier}. Give the insight and 3 ideas.`,
      },
    ],
    schema: creativeIdeasSchema,
    maxOutputTokens: 4_000,
    // Cada tanda anterior dejó 3 títulos.
    mock: () =>
      mockIdeas(business, brief, Math.floor(previousTitles.length / 3) + 1),
  };
}

function mockIdeas(
  business: BusinessContext,
  brief: CreativeBrief,
  round: number,
): CreativeIdeasOutput {
  const suffix = round > 1 ? ` (${round})` : "";
  return {
    insight: `Quienes compran en ${business.name} vuelven por la confianza de siempre.`,
    ideas: [
      {
        angle: "humor",
        title: `El que siempre llega primero${suffix}`,
        logline: `Un vecino hace lo imposible por llegar antes que nadie a ${business.name}.`,
        closingLine: "Hay cosas por las que vale madrugar.",
        visualSummary: `Persecución cómica por el barrio que termina frente a ${brief.product}.`,
        scores: { hook: 4, relevance: 4, originality: 4 },
      },
      {
        angle: "emotional",
        title: `Lo de siempre${suffix}`,
        logline: "Tres generaciones eligen lo mismo, cada una a su manera.",
        closingLine: "Lo bueno no cambia.",
        visualSummary: `Escenas cálidas que unen a una familia alrededor de ${brief.product}.`,
        scores: { hook: 3, relevance: 5, originality: 3 },
      },
      {
        angle: "demonstration",
        title: `Así se hace${suffix}`,
        logline: `Primeros planos de cómo se prepara ${brief.product}, paso a paso.`,
        closingLine: "Hecho para ti, todos los días.",
        visualSummary:
          "Macro de texturas, vapor y manos trabajando con luz cálida.",
        scores: { hook: 4, relevance: 4, originality: 3 },
      },
    ],
  };
}
