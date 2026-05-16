import express from "express";
import {
  computePairingsForRecipe,
  computeAllPairings,
} from "./pairing.service.js";
const router =
  express.Router(); /** * POST /pairings/compute/:recipeId * Compute pairings for a specific recipe */
router.post("/compute/:recipeId", async (req, res) => {
  try {
    const results = await computePairingsForRecipe(req.params.recipeId);
    res.json({
      status: "ok",
      recipe_id: req.params.recipeId,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in compute:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to compute pairings",
    });
  }
}); /** * POST /pairings/compute-all * Compute pairings for all recipes (admin/bulk operation) */
router.post("/compute-all", async (req, res) => {
  try {
    const results = await computeAllPairings();
    res.json({
      status: "ok",
      total_pairings: results.length,
      message: "Bulk pairing computation complete",
    });
  } catch (error) {
    console.error("Error in compute-all:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to compute all pairings",
    });
  }
}); /** * GET /pairings/health * Health check */
router.get("/health", (_, res) => {
  res.json({ status: "ok", service: "EchoAI³ Pairing Engine" });
});
export default router;
