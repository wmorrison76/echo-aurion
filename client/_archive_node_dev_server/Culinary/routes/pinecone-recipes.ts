import { Router, Request, Response } from "express";
import {
  generateEmbedding,
  storeRecipeVector,
  searchSimilarRecipes,
  getRecipesByTrack,
  deleteRecipeVector,
  getCrossTrackLearning,
  type RecipeTrack,
} from "../lib/pinecone-service";
const router =
  Router(); /** * POST /api/pinecone/recipes/store * Store a recipe vector in Pinecone */
router.post("/recipes/store", async (req: Request, res: Response) => {
  try {
    const { recipe, track, chefId, organizationId, collaborators } = req.body;
    if (!recipe || !track || !chefId || !organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message:
            "Missing required fields: recipe, track, chefId, organizationId",
        },
      });
    }
    if (track !== "fine-dining" && track !== "manufacturing") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TRACK",
          message: "Track must be either 'fine-dining' or 'manufacturing'",
        },
      });
    }
    await storeRecipeVector(
      recipe,
      track,
      chefId,
      organizationId,
      collaborators,
    );
    return res.json({
      success: true,
      data: { recipeId: recipe.id, track, stored: true },
    });
  } catch (error) {
    console.error("Error in /recipes/store:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "STORAGE_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to store recipe vector",
      },
    });
  }
}); /** * POST /api/pinecone/recipes/search * Search for similar recipes with cross-track support */
router.post("/recipes/search", async (req: Request, res: Response) => {
  try {
    const {
      recipeText,
      userTrack,
      chefId,
      organizationId,
      limit = 10,
      includeCrossTrack = true,
    } = req.body;
    if (!recipeText || !userTrack || !chefId || !organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message:
            "Missing required fields: recipeText, userTrack, chefId, organizationId",
        },
      });
    }
    const matches = await searchSimilarRecipes(
      recipeText,
      userTrack as RecipeTrack,
      chefId,
      organizationId,
      limit,
      includeCrossTrack,
    );
    return res.json({
      success: true,
      data: { matches, count: matches.length },
    });
  } catch (error) {
    console.error("Error in /recipes/search:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SEARCH_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to search recipes",
      },
    });
  }
}); /** * GET /api/pinecone/recipes/by-track * Get all recipes by track */
router.get("/recipes/by-track", async (req: Request, res: Response) => {
  try {
    const { track, organizationId, limit = 50 } = req.query;
    if (!track || !organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Missing required query parameters: track, organizationId",
        },
      });
    }
    if (track !== "fine-dining" && track !== "manufacturing") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TRACK",
          message: "Track must be either 'fine-dining' or 'manufacturing'",
        },
      });
    }
    const recipes = await getRecipesByTrack(
      track as RecipeTrack,
      organizationId as string,
      parseInt(limit as string, 10),
    );
    return res.json({
      success: true,
      data: { recipes, count: recipes.length },
    });
  } catch (error) {
    console.error("Error in /recipes/by-track:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "FETCH_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch recipes",
      },
    });
  }
}); /** * POST /api/pinecone/recipes/delete * Delete a recipe vector */
router.post("/recipes/delete", async (req: Request, res: Response) => {
  try {
    const { recipeId, track, chefId } = req.body;
    if (!recipeId || !track || !chefId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Missing required fields: recipeId, track, chefId",
        },
      });
    }
    await deleteRecipeVector(recipeId, track as RecipeTrack, chefId);
    return res.json({ success: true, data: { recipeId, deleted: true } });
  } catch (error) {
    console.error("Error in /recipes/delete:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "DELETE_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete recipe vector",
      },
    });
  }
}); /** * POST /api/pinecone/cross-track-learning * Get cross-track learning suggestions (manufacturing chefs learning from fine dining) */
router.post("/cross-track-learning", async (req: Request, res: Response) => {
  try {
    const { recipeText, organizationId, limit = 5 } = req.body;
    if (!recipeText || !organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Missing required fields: recipeText, organizationId",
        },
      });
    }
    const suggestions = await getCrossTrackLearning(
      recipeText,
      organizationId,
      limit,
    );
    return res.json({
      success: true,
      data: { suggestions, count: suggestions.length },
    });
  } catch (error) {
    console.error("Error in /cross-track-learning:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "LEARNING_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get cross-track learning",
      },
    });
  }
}); /** * POST /api/pinecone/embedding * Generate an embedding for text (useful for client-side testing) */
router.post("/embedding", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Missing required field: text",
        },
      });
    }
    const embedding = await generateEmbedding(text);
    return res.json({
      success: true,
      data: { embedding, dimension: embedding.length },
    });
  } catch (error) {
    console.error("Error in /embedding:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "EMBEDDING_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate embedding",
      },
    });
  }
});
export default router;
