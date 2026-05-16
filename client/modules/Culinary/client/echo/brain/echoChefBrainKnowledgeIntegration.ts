import type {
  AnyKnowledge,
  KnowledgeType,
  KnowledgeSearchResult,
  TechniqueKnowledge,
  TerminologyKnowledge,
  FinancialKnowledge,
  HospitalityKnowledge,
} from "../types/knowledge";

/**
 * Extended Chef Brain that leverages diverse knowledge types
 * Queries recipes, techniques, terminology, financial data, and hospitality knowledge
 */
export class EchoChefBrainKnowledgeIntegration {
  /**
   * Enhance a recipe suggestion with related knowledge (techniques, terminology, tips)
   */
  static async enhanceSuggestionWithKnowledge(
    baseRecipeSuggestion: any,
    relatedKnowledge: AnyKnowledge[],
  ): Promise<any> {
    const enhanced = { ...baseRecipeSuggestion };

    const techniques = relatedKnowledge.filter(
      (k) => k.type === "technique",
    ) as TechniqueKnowledge[];
    const terminology = relatedKnowledge.filter(
      (k) => k.type === "terminology",
    ) as TerminologyKnowledge[];
    const hospitality = relatedKnowledge.filter(
      (k) => k.type === "hospitality",
    ) as HospitalityKnowledge[];

    if (techniques.length > 0) {
      enhanced.relatedTechniques = techniques.map((t) => ({
        title: t.title,
        description: t.description,
        steps: t.steps,
        difficulty: t.difficulty,
      }));
    }

    if (terminology.length > 0) {
      enhanced.glossary = terminology.map((t) => ({
        term: t.title,
        definition: t.definition,
        context: t.context,
      }));
    }

    if (hospitality.length > 0) {
      enhanced.serviceGuidelines = hospitality.map((h) => ({
        category: h.category,
        guidelines: h.guidelines,
        bestPractices: h.bestPractices,
      }));
    }

    return enhanced;
  }

  /**
   * Build contextual knowledge for a banquet service
   */
  static async getServiceContextKnowledge(
    serviceContext: string,
    guestCount?: number,
  ): Promise<HospitalityKnowledge[]> {
    const guidelines: Partial<HospitalityKnowledge>[] = [];

    const baseGuide: Partial<HospitalityKnowledge> = {
      type: "hospitality",
      domain: "hospitality",
      sourceType: "user_trained",
      tags: ["service", "banquet"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (serviceContext === "banquet_plated") {
      guidelines.push({
        ...baseGuide,
        id: "guide-plated-service",
        title: "Banquet Plated Service Guidelines",
        description: "Best practices for plated banquet service",
        content: "Plated service requires precision and consistency",
        category: "service",
        guidelines: [
          "Each plate must be mirror-image consistent",
          "Train staff on plating positions and heights",
          "Use heat lamps to maintain food temperature during service",
          `Target plating time: 45-60 seconds per plate for ${guestCount} guests`,
          "Designate one staff member as quality control at pass",
          "Keep sauces warm but not bubbling",
        ],
        bestPractices: [
          "Pre-plate cold components during prep",
          "Hot plates ensure longer hold time",
          "Practice plate choreography before event",
          "Have backup plates ready for mistakes",
        ],
      });
    } else if (serviceContext === "banquet_buffet") {
      guidelines.push({
        ...baseGuide,
        id: "guide-buffet-service",
        title: "Banquet Buffet Service Guidelines",
        description: "Best practices for buffet-style banquet service",
        content:
          "Buffet service requires holding quality and guest flow management",
        category: "service",
        guidelines: [
          "Use chafers for temperature maintenance (6+ hours for hot foods)",
          "Plan buffet flow to prevent bottlenecks",
          `For ${guestCount} guests, plan 2-3 serving stations`,
          "Refresh displays every 30 minutes",
          "Hot foods: keep at 165°F minimum",
          "Cold foods: keep at 41°F maximum",
          "Designate staff to monitor food levels and quality",
        ],
        bestPractices: [
          "Arrange items from cold to hot in guest flow",
          "Use risers and height variation for visual interest",
          "Provide garnishes that complement holding time",
          "Set up backup components in kitchen",
          "Monitor guest flow and adjust station staff",
        ],
      });
    } else if (serviceContext === "reception") {
      guidelines.push({
        ...baseGuide,
        id: "guide-reception-service",
        title: "Reception Service Guidelines",
        description: "Best practices for reception-style service",
        content:
          "Reception requires bite-sized items and standing service comfort",
        category: "service",
        guidelines: [
          "All items must be consumed standing/walking",
          "Portion sizes: 1-2 bites maximum per piece",
          "Minimize sauce that drips on clothing",
          `For ${guestCount} guests, plan 4-5 pieces per person`,
          "Staff should circulate with trays every 15 minutes",
          "Keep items cool or warm based on type",
        ],
        bestPractices: [
          "Practice hand-off technique to prevent spills",
          "Provide small plates or napkins with each item",
          "Avoid items that are fragile when bitten",
          "Consider vegetarian and allergen-friendly options in high volume",
        ],
      });
    }

    return guidelines.filter(Boolean) as HospitalityKnowledge[];
  }

  /**
   * Get cost analysis knowledge for recipe optimization
   */
  static async getCostAnalysisKnowledge(
    recipeTitle: string,
    estimatedCost?: number,
  ): Promise<FinancialKnowledge> {
    return {
      id: `cost-analysis-${Date.now()}`,
      type: "financial",
      title: `Cost Analysis: ${recipeTitle}`,
      description: "Food cost and margin analysis for recipe",
      content: `Analysis for optimizing profitability of ${recipeTitle}`,
      domain: "finance",
      sourceType: "user_trained",
      category: "cost_analysis",
      tags: ["cost", "food_cost", "recipe", recipeTitle],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: {
        estimatedFoodCost: estimatedCost || 0,
        portionSize: "1 serving",
        cogs: "Calculated from ingredients",
      },
      calculations: [
        "Sum all ingredient costs",
        "Divide by number of portions",
        "Add 15% for waste and spoilage",
        "Determine selling price based on food cost %",
      ],
    };
  }

  /**
   * Extract technique knowledge from recipe
   */
  static extractTechniquesFromRecipe(
    recipeIngredients: string[],
    recipeInstructions: string[],
  ): string[] {
    const techniques: string[] = [];
    const commonTechniques = [
      "dice",
      "julienne",
      "brunoise",
      "chiffonade",
      "blanch",
      "sauté",
      "braise",
      "poach",
      "sous-vide",
      "deglaze",
      "emulsify",
      "temper",
      "caramelize",
      "reduce",
      "infuse",
      "clarify",
      "rest",
      "bloom",
      "proof",
      "temper",
    ];

    const combinedText =
      `${recipeIngredients.join(" ")} ${recipeInstructions.join(" ")}`.toLowerCase();

    for (const technique of commonTechniques) {
      if (combinedText.includes(technique)) {
        techniques.push(technique);
      }
    }

    return [...new Set(techniques)];
  }

  /**
   * Get learning suggestions based on recipe knowledge gaps
   */
  static async suggestLearningGaps(
    recipeKnowledge: any,
    existingKnowledge: AnyKnowledge[],
  ): Promise<string[]> {
    const gaps: string[] = [];
    const existingTags = new Set(existingKnowledge.flatMap((k) => k.tags));

    const extractedTechniques = this.extractTechniquesFromRecipe(
      recipeKnowledge.ingredients || [],
      recipeKnowledge.instructions || [],
    );

    for (const technique of extractedTechniques) {
      if (!existingTags.has(technique)) {
        gaps.push(`Technique: ${technique}`);
      }
    }

    if (recipeKnowledge.cuisine && !existingTags.has(recipeKnowledge.cuisine)) {
      gaps.push(`Cuisine: ${recipeKnowledge.cuisine}`);
    }

    if (recipeKnowledge.complexity) {
      gaps.push(`Advanced complexity level ${recipeKnowledge.complexity}`);
    }

    return gaps.slice(0, 5);
  }

  /**
   * Build a comprehensive recipe card with all integrated knowledge
   */
  static async buildComprehensiveRecipeCard(
    baseRecipe: any,
    relatedKnowledge: AnyKnowledge[],
    serviceContext?: string,
    guestCount?: number,
  ): Promise<any> {
    const card = {
      ...baseRecipe,
      knowledge: {} as Record<string, any>,
    };

    if (serviceContext) {
      card.knowledge.serviceGuidelines = await this.getServiceContextKnowledge(
        serviceContext,
        guestCount,
      );
    }

    const techniques = relatedKnowledge.filter((k) => k.type === "technique");
    if (techniques.length > 0) {
      card.knowledge.techniques = techniques;
    }

    const terminology = relatedKnowledge.filter(
      (k) => k.type === "terminology",
    );
    if (terminology.length > 0) {
      card.knowledge.terms = terminology;
    }

    const financial = relatedKnowledge.filter((k) => k.type === "financial");
    if (financial.length > 0) {
      card.knowledge.costAnalysis = financial;
    }

    return card;
  }
}
