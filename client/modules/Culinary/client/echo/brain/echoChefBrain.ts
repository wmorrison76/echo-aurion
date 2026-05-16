import { RecipeCodexService } from "../services/recipeCodexService";
import { RecipeVectorSearchResult } from "../services/recipeVectorStore";
import type { FlavorBalance, RecipeCodexMetadata } from "../codex";
import {
  FlavorMatrix,
  type IngredientAmount,
  type FlavorBalanceResult,
} from "./flavorMatrix";
import type { IngredientChemistryProfile } from "../codex/ingredientChemistry";

export type ServiceContext =
  | "a_la_carte"
  | "banquet_plated"
  | "banquet_buffet"
  | "reception"
  | "room_service";

export interface ChefBrainQuery {
  userPrompt: string;
  queryEmbedding: number[];
  dietaryTags?: string[];
  avoidAllergens?: string[];
  maxComplexity?: 1 | 2 | 3 | 4 | 5;
  serviceContext?: ServiceContext;
  guestCount?: number;
  maxHoldMinutes?: number;
  holdingMethod?:
    | "pass_plate"
    | "hotel_pan"
    | "hot_box"
    | "room_temp_pass"
    | "action_station";
  courseName?: string;
}

export interface BeoNotes {
  course?: string;
  stationName?: string;
  platingStyle?: "preset" | "pass_on_trays" | "buffet_self_service";
  passOrder?: number;
}

export interface ChefBrainSuggestion {
  type: "existing_recipe" | "variation" | "new_concept";
  baseRecipe?: RecipeCodexMetadata;
  title: string;
  description: string;
  recommendedChanges?: string[];
  flavorBalanceHint?: FlavorBalance;
  serviceNotes?: string;
  beoNotes?: BeoNotes;
}

export class EchoChefBrain {
  /**
   * Analyze flavor balance of a dish and suggest corrections
   */
  static analyzeFlavorBalance(
    ingredients: IngredientAmount[],
    chemistryProfiles: Record<string, IngredientChemistryProfile>,
    dishType?: string,
  ): { balance: FlavorBalanceResult; corrections: string[] } {
    const balance = FlavorMatrix.calculateBalance(
      ingredients,
      chemistryProfiles,
    );
    const corrections = FlavorMatrix.suggestCorrections(balance);
    return { balance, corrections };
  }

  /**
   * Analyze vinaigrette specifically
   */
  static analyzeVinaigrette(
    oilGrams: number,
    vinegaarGrams: number,
    otherIngredients?: IngredientAmount[],
  ) {
    return FlavorMatrix.balanceVinaigrette(
      oilGrams,
      vinegaarGrams,
      otherIngredients,
    );
  }

  static async suggestRecipes(
    query: ChefBrainQuery,
  ): Promise<ChefBrainSuggestion[]> {
    const filters: Partial<RecipeCodexMetadata> = {};

    if (query.dietaryTags?.length) {
      (filters as any).dietaryTags = { $in: query.dietaryTags };
    }

    if (query.maxComplexity) {
      (filters as any).complexity = { $lte: query.maxComplexity };
    }

    if (query.serviceContext) {
      (filters as any).serviceContext = query.serviceContext;
    }

    const results: RecipeVectorSearchResult[] =
      await RecipeCodexService.searchByQueryEmbedding(query.queryEmbedding, {
        topK: 10,
        filters,
      });

    const suggestions: ChefBrainSuggestion[] = [];

    const baseServiceNotes = buildServiceNotes(query);

    // Check knowledge base coverage: use trained recipes if similarity is high (>0.7)
    // Otherwise fall back to generic suggestions (as if knowledge base is empty)
    const hasGoodCoverage = results.length > 0 && results[0].score > 0.7;

    if (hasGoodCoverage) {
      // Top 3: existing recipes
      results.slice(0, 3).forEach((r, index) => {
        suggestions.push({
          type: "existing_recipe",
          baseRecipe: r.metadata,
          title: r.metadata.title,
          description: `Strong match for your request (${r.metadata.cuisineRegion ?? "Unknown region"}, ${r.metadata.category}). Score: ${r.score.toFixed(
            3,
          )}.`,
          serviceNotes: baseServiceNotes || undefined,
          beoNotes: buildBeoNotes(query, index),
        });
      });

      // 3–6: variations
      results.slice(3, 6).forEach((r, index) => {
        const changes: string[] = [];

        if (
          query.dietaryTags?.includes("gluten_free") &&
          !r.metadata.dietaryTags.includes("gluten_free")
        ) {
          changes.push(
            "Replace wheat-based components with gluten-free alternatives.",
          );
        }

        if (
          query.dietaryTags?.includes("vegetarian") &&
          !r.metadata.dietaryTags.includes("vegetarian")
        ) {
          changes.push(
            "Swap animal proteins for high-umami plant proteins while preserving core flavor.",
          );
        }

        if (query.serviceContext === "banquet_buffet") {
          changes.push(
            "Adjust portioning and presentation to hotel pans / chafers with garnish that holds well.",
          );
        }

        suggestions.push({
          type: "variation",
          baseRecipe: r.metadata,
          title: `${r.metadata.title} – Echo Banquet Variation`,
          description:
            "Variation tuned for your service context and dietary constraints.",
          recommendedChanges: changes,
          serviceNotes: baseServiceNotes || undefined,
          beoNotes: buildBeoNotes(query, index + 3),
        });
      });

      // Concept suggestion based on top match
      const top = results[0];
      if (top) {
        suggestions.push({
          type: "new_concept",
          baseRecipe: top.metadata,
          title: buildConceptTitle(top.metadata, query),
          description:
            "New concept built from patterns in similar recipes, tuned for your service mode and guest count.",
          flavorBalanceHint: {
            sweet: 0.2,
            sour: 0.3,
            salty: 0.6,
            bitter: 0.1,
            umami: 0.8,
            fat: 0.5,
            spice: 0.2,
            aromatic: 0.7,
          },
          serviceNotes: baseServiceNotes || undefined,
          beoNotes: buildBeoNotes(query, 99),
        });
      }
    } else {
      // Knowledge base has insufficient coverage, will fall back to OpenAI in generation mode
      // For suggestions-only mode, provide guidance about using generation mode
      suggestions.push({
        type: "new_concept",
        title: "Use generation mode for AI-powered suggestions",
        description:
          "Knowledge base coverage is low. Switch to generation mode to leverage OpenAI for comprehensive recipe suggestions based on your criteria.",
        serviceNotes: baseServiceNotes || undefined,
      });
    }

    return suggestions;
  }
}

function buildServiceNotes(query: ChefBrainQuery): string {
  const parts: string[] = [];

  if (query.serviceContext === "banquet_plated") {
    parts.push(
      "Design plating to be consistent and fast to mirror-image for large groups.",
    );
  } else if (query.serviceContext === "banquet_buffet") {
    parts.push(
      "Design components to hold well in hotel pans / chafers with minimal last-minute à la minute finishing.",
    );
  } else if (query.serviceContext === "reception") {
    parts.push(
      "Focus on bite-sized, easy-to-eat, standing service friendly items.",
    );
  }

  if (query.guestCount) {
    parts.push(`Target yield: ${query.guestCount} guests.`);
  }

  if (query.maxHoldMinutes) {
    parts.push(
      `Must remain high quality for at least ${query.maxHoldMinutes} minutes on hold.`,
    );
  }

  if (query.holdingMethod) {
    parts.push(`Holding method: ${query.holdingMethod}.`);
  }

  return parts.join(" ");
}

function buildBeoNotes(query: ChefBrainQuery, index: number): BeoNotes {
  const notes: BeoNotes = {};

  if (query.courseName) {
    notes.course = query.courseName;
  }

  if (query.serviceContext === "banquet_buffet") {
    notes.stationName = "Buffet Station";
    notes.platingStyle = "buffet_self_service";
  } else if (query.serviceContext === "banquet_plated") {
    notes.stationName = "Hot Line";
    notes.platingStyle = "preset";
  } else if (query.serviceContext === "reception") {
    notes.stationName = "Passed Canapés";
    notes.platingStyle = "pass_on_trays";
  }

  notes.passOrder = index + 1;
  return notes;
}

function buildConceptTitle(
  recipe: RecipeCodexMetadata,
  query: ChefBrainQuery,
): string {
  const contextLabel =
    query.serviceContext === "banquet_buffet"
      ? "Buffet"
      : query.serviceContext === "banquet_plated"
        ? "Plated"
        : query.serviceContext === "reception"
          ? "Reception"
          : "Echo";

  return `${contextLabel} Concept – ${
    recipe.cuisineRegion ?? "Chef Echo"
  } ${recipe.category.toString().toUpperCase()}`;
}
