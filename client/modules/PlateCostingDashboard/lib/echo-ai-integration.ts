/**
 * EchoAI Integration for Plate Costing
 *
 * Provides context-aware AI suggestions for:
 * - Cost optimization opportunities
 * - Ingredient substitutions
 * - Waste reduction strategies
 * - Pricing recommendations
 * - Supplier negotiations
 */

import { type PlateCostBreakdown } from "./cost-calculator";

export interface CostOptimizationSuggestion {
  id: string;
  category: "ingredient_swap" | "waste_reduction" | "price_negotiation" | "volume_purchase";
  title: string;
  description: string;
  currentState: string;
  recommendedState: string;
  estimatedSavings: number;
  effort: "low" | "medium" | "high";
  confidence: number; // 0-1
  actionable: boolean;
}

/**
 * Generate EchoAI suggestions for a plate
 */
export function generatePlateOptimizationSuggestions(
  breakdown: PlateCostBreakdown
): CostOptimizationSuggestion[] {
  const suggestions: CostOptimizationSuggestion[] = [];

  // Suggestion 1: High waste percentage ingredients
  breakdown.ingredients.forEach((ing) => {
    if (ing.wastePercentage > 12) {
      suggestions.push({
        id: `waste-${ing.name}`,
        category: "waste_reduction",
        title: `Reduce waste: ${ing.name}`,
        description: `${ing.name} has a ${ing.wastePercentage}% waste percentage. Better handling procedures could reduce this.`,
        currentState: `${ing.wastePercentage}% waste`,
        recommendedState: `${Math.max(3, ing.wastePercentage - 5)}% waste (industry standard: 5-8%)`,
        estimatedSavings: ing.costWithWaste * 0.1,
        effort: "low",
        confidence: 0.8,
        actionable: true,
      });
    }
  });

  // Suggestion 2: Price optimization for expensive ingredients
  const expensiveIngredients = breakdown.ingredients
    .filter((ing) => ing.percentOfTotal > 15)
    .sort((a, b) => b.percentOfTotal - a.percentOfTotal);

  expensiveIngredients.forEach((ing) => {
    suggestions.push({
      id: `price-${ing.name}`,
      category: "price_negotiation",
      title: `Negotiate price: ${ing.name}`,
      description: `${ing.name} represents ${ing.percentOfTotal.toFixed(1)}% of the plate cost. Negotiating a 5% price reduction with suppliers is achievable.`,
      currentState: `$${ing.unitCost.toFixed(2)}/unit`,
      recommendedState: `$${(ing.unitCost * 0.95).toFixed(2)}/unit (5% reduction)`,
      estimatedSavings: ing.costWithWaste * 0.05,
      effort: "medium",
      confidence: 0.7,
      actionable: true,
    });
  });

  // Suggestion 3: Volume purchasing
  if (breakdown.ingredients.length > 3) {
    const totalCost = breakdown.totalCostWithWaste;
    suggestions.push({
      id: "volume-purchase",
      category: "volume_purchase",
      title: "Implement bulk purchasing",
      description:
        "With multiple ingredients used regularly, bulk purchasing could reduce costs by 3-8% while improving consistency.",
      currentState: "Current purchasing: as-needed",
      recommendedState: "Bulk purchasing: monthly contracts",
      estimatedSavings: totalCost * 0.05,
      effort: "high",
      confidence: 0.6,
      actionable: true,
    });
  }

  // Suggestion 4: Seasonal alternatives
  suggestions.push({
    id: "seasonal-alternatives",
    category: "ingredient_swap",
    title: "Use seasonal alternatives",
    description:
      "Replacing seasonal produce with local suppliers can reduce costs by 10-15% while improving freshness.",
    currentState: "Using premium imported ingredients",
    recommendedState: "Switch to seasonal local alternatives",
    estimatedSavings: breakdown.totalCostWithWaste * 0.12,
    effort: "medium",
    confidence: 0.65,
    actionable: true,
  });

  // Sort by potential savings (descending)
  return suggestions
    .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
    .slice(0, 5); // Return top 5 suggestions
}

/**
 * Generate system prompt context for EchoAI
 */
export function generatePlateCoatingEchoContext(
  breakdown: PlateCostBreakdown
): string {
  const suggestions = generatePlateOptimizationSuggestions(breakdown);
  const topSaving = suggestions[0]?.estimatedSavings || 0;
  const totalPotential = suggestions.reduce((sum, s) => sum + s.estimatedSavings, 0);

  return `
## Plate Costing Context: ${breakdown.recipeName}

**Current Metrics:**
- Plate Cost: $${breakdown.totalCostWithWaste.toFixed(2)}
- Selling Price: $${breakdown.sellingPrice.toFixed(2)}
- Margin: ${breakdown.marginPercentage.toFixed(1)}% (Target: 30%)
- Food Cost %: ${((breakdown.totalCostWithWaste / breakdown.sellingPrice) * 100).toFixed(1)}%

**Top Ingredients by Cost:**
${breakdown.ingredients
  .slice(0, 3)
  .map(
    (ing) =>
      `- ${ing.name}: $${ing.costWithWaste.toFixed(2)} (${ing.percentOfTotal.toFixed(1)}% of total, ${ing.wastePercentage}% waste)`
  )
  .join("\n")}

**Optimization Opportunities:**
${suggestions.map((s) => `- ${s.title}: Save ~$${s.estimatedSavings.toFixed(2)} (${s.effort} effort)`).join("\n")}

**Total Potential Savings:** $${totalPotential.toFixed(2)} (~${((totalPotential / breakdown.totalCostWithWaste) * 100).toFixed(1)}%)

**Margin Status:** ${
    breakdown.marginPercentage < 25
      ? "🔴 Below target - needs optimization"
      : breakdown.marginPercentage < 30
        ? "🟡 Near target - monitor closely"
        : "🟢 Healthy - maintain quality"
  }

You can help with:
1. Identifying ingredient substitutions
2. Explaining waste reduction strategies
3. Suggesting pricing adjustments
4. Recommending supplier negotiations
5. Planning seasonal menu changes
`;
}

/**
 * Format suggestion for user display
 */
export function formatSuggestion(suggestion: CostOptimizationSuggestion): string {
  return `
**${suggestion.title}**
${suggestion.description}

Current: ${suggestion.currentState}
Recommended: ${suggestion.recommendedState}

💰 Estimated Savings: $${suggestion.estimatedSavings.toFixed(2)}
⚙️ Effort Required: ${suggestion.effort}
📊 Confidence: ${(suggestion.confidence * 100).toFixed(0)}%
`;
}

/**
 * Send plate costing context to EchoAI
 */
export async function sendPlateContextToEchoAI(
  breakdown: PlateCostBreakdown
): Promise<void> {
  const context = generatePlateCoatingEchoContext(breakdown);

  try {
    // Emit custom event with context
    const event = new CustomEvent("echo:set-context", {
      detail: {
        module: "plate-costing",
        recipeName: breakdown.recipeName,
        context,
        metrics: {
          cost: breakdown.totalCostWithWaste,
          margin: breakdown.marginPercentage,
          price: breakdown.sellingPrice,
        },
      },
    });

    window.dispatchEvent(event);
    console.log("[PlateCosting-EchoAI] Context sent to EchoAI");
  } catch (err) {
    console.error("[PlateCosting-EchoAI] Error sending context:", err);
  }
}

/**
 * Ask EchoAI a costing question
 */
export async function askEchoAboutCost(
  question: string,
  breakdown?: PlateCostBreakdown
): Promise<void> {
  const prompt =
    breakdown && breakdown.recipeName
      ? `About the ${breakdown.recipeName} dish (Cost: $${breakdown.totalCostWithWaste.toFixed(2)}, Margin: ${breakdown.marginPercentage.toFixed(1)}%): ${question}`
      : question;

  const event = new CustomEvent("echo:ask", {
    detail: {
      prompt,
      module: "plate-costing",
      context: breakdown ? generatePlateCoatingEchoContext(breakdown) : undefined,
    },
  });

  window.dispatchEvent(event);
}
