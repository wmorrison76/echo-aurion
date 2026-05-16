import { RecipeCodexService } from "../services/recipeCodexService";
import { RecipeVectorSearchResult } from "../services/recipeVectorStore";
import type { ServiceContext, ChefBrainQuery } from "./echoChefBrain";
import {
  generateRecipeDraftWithLlm,
  type GeneratedRecipe,
} from "../services/llmProvider";

export interface RecipeGenerationRequest
  extends Omit<ChefBrainQuery, "queryEmbedding"> {
  queryEmbedding: number[];
  neighborsToUse?: number;
}

export interface RecipeGenerationResult {
  neighborsUsed: RecipeVectorSearchResult[];
  recipeDraft: GeneratedRecipe;
}

export class EchoRecipeGenerator {
  static async generateFullRecipeDraft(
    request: RecipeGenerationRequest,
  ): Promise<RecipeGenerationResult> {
    const {
      queryEmbedding,
      neighborsToUse = 5,
      serviceContext,
      guestCount,
      dietaryTags,
      maxComplexity,
    } = request;

    const filters: any = {};

    if (dietaryTags?.length) {
      filters.dietaryTags = { $in: dietaryTags };
    }

    if (maxComplexity) {
      filters.complexity = { $lte: maxComplexity };
    }

    if (serviceContext) {
      filters.serviceContext = serviceContext;
    }

    const neighbors = await RecipeCodexService.searchByQueryEmbedding(
      queryEmbedding,
      {
        topK: neighborsToUse,
        filters,
      },
    );

    const neighborMetadata = neighbors.map((n) => n.metadata);

    const recipeDraft = await generateRecipeDraftWithLlm({
      userPrompt: request.userPrompt,
      serviceContext,
      guestCount,
      neighbors: neighborMetadata,
    });

    return {
      neighborsUsed: neighbors,
      recipeDraft,
    };
  }
}
