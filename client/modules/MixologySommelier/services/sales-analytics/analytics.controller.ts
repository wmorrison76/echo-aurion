import express from "express";
import {
  getSalesMix,
  getTopPairings,
  getMissedPairings,
  getMenuItemTrend,
} from "./sales.service.js";
import {
  syncMenuItems,
  getRecipes,
  getRecipeById,
  updateRecipe,
} from "./menu.service.js";
import { DateTime } from "luxon";
const router =
  express.Router(); /** * GET /analytics/mix/:venueId * Get sales mix summary (wine vs food revenue) for last 30 days * Query params: ?startDate=2024-01-01&endDate=2024-01-31 */
router.get("/mix/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const now = DateTime.now();
      endDate = now.toISODate();
      startDate = now.minus({ days: 30 }).toISODate();
    }
    const data = await getSalesMix(venueId, startDate, endDate);
    res.json({ status: "ok", data });
  } catch (error) {
    console.error("Error in /mix:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to retrieve sales mix",
    });
  }
}); /** * GET /analytics/top/:venueId * Get top-performing wine-food pairings * Query params: ?limit=10 */
router.get("/top/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const data = await getTopPairings(venueId, limit);
    res.json({ status: "ok", count: data.length, data });
  } catch (error) {
    console.error("Error in /top:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve top pairings",
    });
  }
}); /** * GET /analytics/missed/:venueId * Get missed pairing opportunities * Query params: ?days=30 */
router.get("/missed/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const days = parseInt(req.query.days) || 30;
    const data = await getMissedPairings(venueId, days);
    res.json({ status: "ok", count: data.length, data });
  } catch (error) {
    console.error("Error in /missed:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve missed pairings",
    });
  }
}); /** * GET /analytics/trend/:venueId/:menuItemId * Get sales trend for a specific menu item * Query params: ?days=30 */
router.get("/trend/:venueId/:menuItemId", async (req, res) => {
  try {
    const { venueId, menuItemId } = req.params;
    const days = parseInt(req.query.days) || 30;
    const data = await getMenuItemTrend(venueId, menuItemId, days);
    res.json({ status: "ok", data });
  } catch (error) {
    console.error("Error in /trend:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve trend data",
    });
  }
}); /** * POST /analytics/menu/sync * Sync menu items from POS system */
router.post("/menu/sync", async (req, res) => {
  try {
    const { menu } = req.body;
    if (!Array.isArray(menu)) {
      return res.status(400).json({ error: "menu must be an array" });
    }
    const result = await syncMenuItems(menu);
    res.json(result);
  } catch (error) {
    console.error("Error in /menu/sync:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to sync menu items",
    });
  }
}); /** * GET /analytics/recipes * Get all recipes (synced menu items) */
router.get("/recipes", async (req, res) => {
  try {
    const recipes = await getRecipes();
    res.json({ status: "ok", count: recipes.length, data: recipes });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
}); /** * GET /analytics/recipes/:id * Get single recipe by ID */
router.get("/recipes/:id", async (req, res) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json({ status: "ok", data: recipe });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
}); /** * PATCH /analytics/recipes/:id * Update recipe */
router.patch("/recipes/:id", async (req, res) => {
  try {
    const result = await updateRecipe(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update recipe",
    });
  }
});
export default router;
