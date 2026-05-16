import { buildCognitiveMesh } from "../cognitive-mesh";
export type IntentChannel = "voice" | "text" | "automation";
export interface IntentContext {
  channel: IntentChannel;
  transcript: string;
  sentiment?: "positive" | "neutral" | "negative";
  locale?: string;
  meshRoot?: string;
}
export interface RoutedIntent {
  intent: string;
  confidence: number;
  route: string;
  rationale: string;
}
const intentMatchers: Array<{
  pattern: RegExp;
  intent: string;
  route: string;
  rationale: string;
}> = [
  {
    pattern: /order guide|prep list|shopping list/i,
    intent: "generate-order-guide",
    route: "modules/order-guides",
    rationale: "Detected operational request referencing order guide language.",
  },
  {
    pattern: /recipe|menu|chef/i,
    intent: "recipe-support",
    route: "modules/recipe-assistant",
    rationale:
      "Mentions of recipes or chefs map to the culinary planning module.",
  },
  {
    pattern: /inventory|par|stock/i,
    intent: "inventory-query",
    route: "modules/inventory-analytics",
    rationale: "Inventory keywords indicate data lookups.",
  },
  {
    pattern: /finance|budget|cost/i,
    intent: "cost-analysis",
    route: "modules/finance",
    rationale: "Financial terminology maps to the finance node of the mesh.",
  },
];
export async function routeIntent(
  context: IntentContext,
): Promise<RoutedIntent> {
  const transcript = context.transcript.trim();
  if (!transcript) {
    return {
      intent: "unknown",
      confidence: 0,
      route: "modules/fallback",
      rationale: "Empty transcript; deferring to fallback handler.",
    };
  }
  for (const matcher of intentMatchers) {
    if (matcher.pattern.test(transcript)) {
      return {
        intent: matcher.intent,
        confidence: 0.85,
        route: matcher.route,
        rationale: matcher.rationale,
      };
    }
  }
  if (context.meshRoot) {
    const mesh = await buildCognitiveMesh({ root: context.meshRoot });
    if (mesh.recipeToInventory.length) {
      return {
        intent: "recipe-to-inventory",
        confidence: 0.6,
        route: mesh.recipeToInventory[0].recipe,
        rationale:
          "Defaulted to strongest recipe→inventory edge from cognitive mesh.",
      };
    }
  }
  return {
    intent: "conversation",
    confidence: 0.4,
    route: "modules/conversation",
    rationale: "No explicit match; continue conversationally.",
  };
}
