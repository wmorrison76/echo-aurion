/**
 * Vector Recipe Routes
 * --------------------
 * File-backed vector store with token similarity. API compatible with
 * client/modules/Culinary/client/lib/pinecone-client.ts
 */
import { Router } from "express";
import { vectorProvider } from "../lib/vector-provider";

const router = Router();

router.post("/recipes/store", async (req: any, res) => {
  try {
    const { recipe, track, chefId, organizationId } = req.body || {};
    if (!recipe?.id || !recipe?.title || !track) {
      return res.status(400).json({ error: { message: "Missing required fields" } });
    }
    const metadata = {
      ...(recipe || {}),
      chefId,
      organizationId,
      sourceBook: recipe?.sourceBook,
      sourcePage: recipe?.sourcePage,
      title: recipe?.title,
      ingredients: recipe?.ingredients,
      instructions: recipe?.instructions,
    };
    const result = await vectorProvider.storeRecipeVector({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients || [],
      track,
      metadata,
    });
    return res.json({ data: { recipeId: result.recipeId } });
  } catch (error) {
    console.error("[/api/vector/recipes/store] error", error);
    return res.status(500).json({ error: { message: "Failed to store vector" } });
  }
});

router.post("/recipes/search", async (req: any, res) => {
  try {
    const { recipeText, userTrack, chefId, organizationId, limit, includeCrossTrack } = req.body || {};
    if (!recipeText || !userTrack) {
      return res.status(400).json({ error: { message: "Missing required fields" } });
    }
    const result = await vectorProvider.searchSimilarRecipes({
      recipeText,
      userTrack,
      limit,
      includeCrossTrack,
    });
    return res.json({ data: { matches: result.matches } });
  } catch (error) {
    console.error("[/api/vector/recipes/search] error", error);
    return res.status(500).json({ error: { message: "Failed to search vectors" } });
  }
});

router.get("/recipes/by-track", async (req: any, res) => {
  try {
    const { track, organizationId, limit } = req.query || {};
    if (!track) {
      return res.status(400).json({ error: { message: "Missing track" } });
    }
    const result = await vectorProvider.getByTrack(track, parseInt(limit || "50", 10), organizationId);
    return res.json({ data: { recipes: result.recipes } });
  } catch (error) {
    console.error("[/api/vector/recipes/by-track] error", error);
    return res.status(500).json({ error: { message: "Failed to fetch by track" } });
  }
});

router.post("/recipes/delete", async (req: any, res) => {
  try {
    const { recipeId, track, chefId } = req.body || {};
    if (!recipeId) {
      return res.status(400).json({ error: { message: "Missing recipeId" } });
    }
    const result = await vectorProvider.deleteRecipeVector(recipeId);
    return res.json({ data: { success: result.success } });
  } catch (error) {
    console.error("[/api/vector/recipes/delete] error", error);
    return res.status(500).json({ error: { message: "Failed to delete vector" } });
  }
});

export default router;

