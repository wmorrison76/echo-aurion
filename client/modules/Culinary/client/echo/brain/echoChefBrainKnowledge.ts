/**
 * EchoChefBrain Knowledge Integration Module
 * Extends EchoChefBrain with knowledge crawler, gap detection, and vetting capabilities
 * Provides unified interface for culinary intelligence with knowledge management
 */

import KnowledgeManager, {
  type KnowledgeManagementConfig,
} from "../cognition/knowledgeManager";
import KnowledgeCrawler from "../cognition/knowledgeCrawler";
import KnowledgeGapDetector from "../cognition/gapDetector";
import KnowledgeVettingEngine from "../cognition/knowledgeVetting";
import type {
  CrawledKnowledge,
  TriggerType,
} from "../cognition/knowledgeCrawler";
import type { GapAnalysis, KnowledgeGap } from "../cognition/gapDetector";
import type { VettingResult } from "../cognition/knowledgeVetting";
import type { RecipeCodexMetadata } from "../codex";

export interface ChefBrainKnowledgeConfig {
  enableAutoCrawl: boolean;
  enableAutoVetting: boolean;
  enableGapDetection: boolean;
  minApprovalScore: number;
}

export interface KnowledgeEnrichedSuggestion {
  title: string;
  description: string;
  source: "existing" | "knowledge_enhanced" | "ai_generated";
  knowledgeSources: CrawledKnowledge[];
  confidence: number;
  gaps: KnowledgeGap[];
  recommendations: string[];
}

/**
 * Extended Echo Chef Brain with Knowledge Integration
 */
export class EchoChefBrainWithKnowledge {
  private manager: KnowledgeManager;
  private crawler: KnowledgeCrawler;
  private gapDetector: KnowledgeGapDetector;
  private vettingEngine: KnowledgeVettingEngine;
  private config: ChefBrainKnowledgeConfig;

  constructor(
    culinaryBrain?: any,
    knowledgeConfig?: Partial<ChefBrainKnowledgeConfig>,
  ) {
    const defaultConfig: ChefBrainKnowledgeConfig = {
      enableAutoCrawl: false,
      enableAutoVetting: true,
      enableGapDetection: true,
      minApprovalScore: 0.6,
      ...knowledgeConfig,
    };

    this.config = defaultConfig;
    this.manager = new KnowledgeManager(
      {
        enableAutoCrawl: defaultConfig.enableAutoCrawl,
        enableAutoVetting: defaultConfig.enableAutoVetting,
        enableGapDetection: defaultConfig.enableGapDetection,
      },
      culinaryBrain,
    );

    this.crawler = new KnowledgeCrawler();
    this.gapDetector = new KnowledgeGapDetector();
    this.vettingEngine = new KnowledgeVettingEngine(culinaryBrain);
  }

  /**
   * Initialize knowledge base with current recipes and ingredients
   */
  initializeKnowledgeBase(
    recipes: RecipeCodexMetadata[],
    ingredients: Record<string, any>,
  ): void {
    this.manager.registerKnowledgeBase(recipes, ingredients);
    this.gapDetector.registerRecipes(recipes);
    this.gapDetector.registerIngredients(ingredients);
  }

  /**
   * Search and enhance suggestions with external knowledge
   */
  async suggestWithKnowledge(
    query: string,
    baseRecipes?: RecipeCodexMetadata[],
  ): Promise<KnowledgeEnrichedSuggestion[]> {
    const suggestions: KnowledgeEnrichedSuggestion[] = [];

    // Get recommended sources for query
    const sources = this.manager.getRecommendedSources(query);

    // Crawl knowledge
    const crawlResult = await this.crawler.crawlByQuery(query, {
      sources: sources.slice(0, 3), // Top 3 sources
      maxResultsPerSource: 10,
    });

    // Vet and process knowledge
    for (const knowledge of crawlResult.knowledge.slice(0, 5)) {
      const vetResult = await this.vettingEngine.vetKnowledge(knowledge);

      if (vetResult.score >= this.config.minApprovalScore) {
        // Detect gaps in this knowledge
        const gaps: KnowledgeGap[] = [];

        if (knowledge.metadata.ingredients) {
          for (const ingredient of knowledge.metadata.ingredients) {
            const ingredientGaps =
              this.gapDetector.detectGapsForIngredient(ingredient);
            gaps.push(...ingredientGaps);
          }
        }

        suggestions.push({
          title: knowledge.title,
          description: knowledge.content.substring(0, 200),
          source:
            vetResult.level === "approved" ? "knowledge_enhanced" : "existing",
          knowledgeSources: [knowledge],
          confidence: vetResult.score,
          gaps: gaps.slice(0, 3),
          recommendations: vetResult.recommendations,
        });
      }
    }

    return suggestions;
  }

  /**
   * Auto-fill missing allergen information
   */
  async enrichWithAllergenData(
    recipe: RecipeCodexMetadata,
  ): Promise<RecipeCodexMetadata> {
    if (recipe.allergens && recipe.allergens.length > 0) {
      return recipe; // Already has allergen data
    }

    // Crawl for allergen information
    const query = `allergens ${recipe.title} recipe`;
    const crawlResult = await this.crawler.crawlByQuery(query, {
      sources: ["ingredient_supplier", "academic_paper"],
      maxResultsPerSource: 5,
    });

    // Extract allergen data
    const allergens = new Set<string>();

    for (const knowledge of crawlResult.knowledge) {
      if (knowledge.metadata.allergens) {
        knowledge.metadata.allergens.forEach((a) => allergens.add(a));
      }

      if (knowledge.extractedRecipes) {
        knowledge.extractedRecipes.forEach((r) => {
          r.allergens.forEach((a) => allergens.add(a));
        });
      }
    }

    if (allergens.size > 0) {
      return {
        ...recipe,
        allergens: Array.from(allergens),
      };
    }

    return recipe;
  }

  /**
   * Find and suggest ingredient substitutions
   */
  async suggestSubstitutions(ingredient: string): Promise<{
    ingredient: string;
    substitutions: Array<{ name: string; ratio: number; notes: string }>;
    sources: CrawledKnowledge[];
  }> {
    const query = `${ingredient} substitution alternative`;

    const crawlResult = await this.crawler.crawlByQuery(query, {
      sources: ["food_blog", "recipe_database"],
      maxResultsPerSource: 15,
    });

    const substitutions: Array<{ name: string; ratio: number; notes: string }> =
      [];
    const sources: CrawledKnowledge[] = [];

    for (const knowledge of crawlResult.knowledge) {
      // Extract substitutions from recipes
      if (knowledge.extractedRecipes) {
        for (const recipe of knowledge.extractedRecipes) {
          const maybeSubstitution = recipe.ingredients.find(
            (ing) => !ing.name.toLowerCase().includes(ingredient.toLowerCase()),
          );

          if (maybeSubstitution) {
            substitutions.push({
              name: maybeSubstitution.name,
              ratio: maybeSubstitution.amount / (recipe.yield || 1),
              notes: knowledge.content.substring(0, 100),
            });

            sources.push(knowledge);
          }
        }
      }
    }

    // Deduplicate
    const uniqueSubstitutions = Array.from(
      new Map(substitutions.map((s) => [s.name, s])).values(),
    );

    return {
      ingredient,
      substitutions: uniqueSubstitutions.slice(0, 5),
      sources: sources.slice(0, 3),
    };
  }

  /**
   * Analyze knowledge gaps and trigger targeted research
   */
  async analyzeKnowledgeGaps(): Promise<{
    analysis: GapAnalysis;
    recommendations: string[];
  }> {
    const analysis = await this.manager.analyzeGaps();

    const recommendations = analysis.recommendations;

    return {
      analysis,
      recommendations,
    };
  }

  /**
   * Get knowledge metrics and coverage
   */
  getKnowledgeMetrics() {
    return this.manager.getMetrics();
  }

  /**
   * Get approved knowledge library
   */
  getApprovedKnowledge(): CrawledKnowledge[] {
    return this.manager.getApprovedKnowledge();
  }

  /**
   * Manual knowledge integration with vetting
   */
  async integrateKnowledge(
    knowledge: CrawledKnowledge,
    skipVetting: boolean = false,
  ): Promise<VettingResult> {
    if (skipVetting) {
      // Direct integration (admin only)
      return this.vettingEngine.vetKnowledge(knowledge, {
        requiresCulinaryBrainApproval: false,
      });
    }

    return this.manager.importAndVet(knowledge);
  }

  /**
   * Expand knowledge for specific area
   */
  async expandKnowledgeArea(
    area: "allergens" | "nutrition" | "technique" | "flavor" | "cost",
    specificTopics?: string[],
  ): Promise<{
    crawlResults: any;
    vetResults: VettingResult[];
    newKnowledge: number;
  }> {
    const topicsMap = {
      allergens: [
        "FDA allergens",
        "cross contamination prevention",
        "allergen labeling",
      ],
      nutrition: ["macronutrient ratios", "caloric content", "micronutrients"],
      technique: [
        "emulsification",
        "tempering",
        "sous vide",
        "molecular gastronomy",
      ],
      flavor: ["flavor pairing", "taste balance", "umami", "aromatics"],
      cost: ["ingredient costs", "food pricing", "seasonal variations"],
    };

    const topics = specificTopics || topicsMap[area];
    const results = await this.manager.expandKnowledge(
      topics.join(" "),
      "manual",
    );

    return {
      crawlResults: results.crawlResult,
      vetResults: results.vetResult,
      newKnowledge: results.newlyApprovedKnowledge.length,
    };
  }

  /**
   * Generate knowledge gap report
   */
  generateGapReport(): string {
    const metrics = this.getKnowledgeMetrics();
    const gaps = this.manager.getGapAnalysis();

    let report = `
EchoAi³ Knowledge Gap Analysis Report
=====================================

Coverage Status:
- Total Knowledge Items: ${metrics.totalKnowledgeItems}
- Approved: ${metrics.approvedItems} (${((metrics.approvedItems / Math.max(metrics.totalKnowledgeItems, 1)) * 100).toFixed(1)}%)
- Rejected: ${metrics.rejectedItems}
- Quarantined: ${metrics.quarantinedItems}
- Average Trust Score: ${metrics.averageTrustScore.toFixed(2)}/1.0

Covered Domains: ${metrics.coveredDomains.join(", ")}

Critical Gaps Detected: ${gaps?.gaps.filter((g) => g.priority === "critical").length || 0}

Top Recommendations:
${
  gaps?.recommendations
    .slice(0, 5)
    .map((r) => `- ${r}`)
    .join("\n") || "No gaps detected"
}
`;

    return report;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.manager.destroy();
  }
}

export default EchoChefBrainWithKnowledge;
