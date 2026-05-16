import type { Request, Response } from "express";
import { embedTextToVector } from "../echo/services/embeddingProvider";
import {
  EchoChefBrain,
  type ChefBrainQuery,
  type ServiceContext,
} from "../echo/brain/echoChefBrain";
import { EchoRecipeGenerator } from "../echo/brain/echoRecipeGenerator";

interface EchoChefRequest {
  userPrompt: string;
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
  mode?: "suggest" | "generate";
}

/**
 * POST /api/echo-chef
 * Banquet-aware Chef Brain API
 *
 * Request mode:
 * - "suggest": Return suggestions only (existing, variations, concepts)
 * - "generate": Return suggestions + full recipe draft from LLM
 */
export const echoChefHandler = async (req: Request, res: Response) => {
  try {
    const {
      userPrompt,
      dietaryTags,
      avoidAllergens,
      maxComplexity,
      serviceContext,
      guestCount,
      maxHoldMinutes,
      holdingMethod,
      courseName,
      mode = "suggest",
    } = req.body as EchoChefRequest;

    if (!userPrompt || typeof userPrompt !== "string") {
      return res.status(400).json({ error: "userPrompt is required" });
    }

    // Generate embedding for the user prompt
    const queryEmbedding = await embedTextToVector(userPrompt);

    // Build base query for Chef Brain
    const baseQuery: ChefBrainQuery = {
      userPrompt,
      queryEmbedding,
      dietaryTags,
      avoidAllergens,
      maxComplexity,
      serviceContext,
      guestCount,
      maxHoldMinutes,
      holdingMethod,
      courseName,
    };

    // Get suggestions from Chef Brain
    const suggestions = await EchoChefBrain.suggestRecipes(baseQuery);

    // Check if we should auto-enable generation mode due to low knowledge base coverage
    const hasNoGoodResults = !suggestions.some(
      (s) => s.type === "existing_recipe",
    );
    const shouldAutoGenerate = hasNoGoodResults && mode === "suggest";

    // If mode is "generate" or we need to auto-generate due to low coverage
    if (mode === "generate" || shouldAutoGenerate) {
      try {
        const generationResult =
          await EchoRecipeGenerator.generateFullRecipeDraft({
            ...baseQuery,
            neighborsToUse: 5,
          });

        return res.json({
          mode: "generate",
          suggestions,
          recipeDraft: generationResult.recipeDraft,
          neighbors: generationResult.neighborsUsed,
          usedOpenAI: shouldAutoGenerate,
          openAIReason: shouldAutoGenerate
            ? "Knowledge base coverage insufficient, using OpenAI"
            : undefined,
        });
      } catch (genErr: any) {
        console.error("[EchoChef] Recipe generation failed:", genErr);
        // Fall back to suggestions-only mode
        return res.json({
          mode: "suggest",
          suggestions,
          generationError: genErr.message,
        });
      }
    }

    // Default: suggestions only
    return res.json({
      mode: "suggest",
      suggestions,
    });
  } catch (err: any) {
    console.error("[EchoChef] API error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
};
