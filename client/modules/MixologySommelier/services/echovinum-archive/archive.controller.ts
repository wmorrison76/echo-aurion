import express from "express";
import {
  getVintage,
  summarizeDecade,
  getVintageHistory,
  getBestVintages,
  updateVintage,
} from "./vintages.service.js";
import {
  getProducer,
  searchProducers,
  getAllProducers,
  updateProducer,
  getProducersByRegion,
} from "./producers.service.js";
const router =
  express.Router(); /** * GET /archive/vintage/:region/:year * Get or generate vintage record for a specific region/year */
router.get("/vintage/:region/:year", async (req, res) => {
  try {
    const { region, year } = req.params;
    const vintage = await getVintage(region, parseInt(year));
    res.json({ status: "ok", data: vintage });
  } catch (error) {
    console.error("Error fetching vintage:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch vintage",
    });
  }
}); /** * GET /archive/vintage/decade/:region/:start * Get decade summary (e.g., 1990-1999) */
router.get("/vintage/decade/:region/:start", async (req, res) => {
  try {
    const { region, start } = req.params;
    const summary = await summarizeDecade(region, parseInt(start));
    res.json({
      status: "ok",
      region,
      decade: `${start}-${parseInt(start) + 9}`,
      summary,
    });
  } catch (error) {
    console.error("Error summarizing decade:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to summarize decade",
    });
  }
}); /** * GET /archive/vintage/history/:region * Get all vintages for a region * Query params: ?limit=50 */
router.get("/vintage/history/:region", async (req, res) => {
  try {
    const { region } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const vintages = await getVintageHistory(region, limit);
    res.json({ status: "ok", region, count: vintages.length, data: vintages });
  } catch (error) {
    console.error("Error fetching vintage history:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch history",
    });
  }
}); /** * GET /archive/vintage/best/:region * Get best-rated vintages for a region * Query params: ?limit=10 */
router.get("/vintage/best/:region", async (req, res) => {
  try {
    const { region } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const vintages = await getBestVintages(region, limit);
    res.json({ status: "ok", region, count: vintages.length, data: vintages });
  } catch (error) {
    console.error("Error fetching best vintages:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch best vintages",
    });
  }
}); /** * PATCH /archive/vintage/:region/:year * Update vintage with actual climate/rating data */
router.patch("/vintage/:region/:year", async (req, res) => {
  try {
    const { region, year } = req.params;
    const { rating, rainfall_mm, avg_temp, summary } = req.body;
    const result = await updateVintage(region, parseInt(year), {
      rating,
      rainfall_mm,
      avg_temp,
      summary,
    });
    res.json(result);
  } catch (error) {
    console.error("Error updating vintage:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to update vintage",
    });
  }
}); /** * GET /archive/producer/:name * Get or generate producer history */
router.get("/producer/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const producer = await getProducer(decodeURIComponent(name));
    res.json({ status: "ok", data: producer });
  } catch (error) {
    console.error("Error fetching producer:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch producer",
    });
  }
}); /** * GET /archive/producers/search * Search producers by name or history * Query params: ?q=Domaine&limit=20 */
router.get("/producers/search", async (req, res) => {
  try {
    const { q = "", limit = 20 } = req.query;
    if (!q || q.length < 2) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 2 characters" });
    }
    const producers = await searchProducers(q, parseInt(limit));
    res.json({
      status: "ok",
      query: q,
      count: producers.length,
      data: producers,
    });
  } catch (error) {
    console.error("Error searching producers:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to search producers",
    });
  }
}); /** * GET /archive/producers * List all producers * Query params: ?limit=100&offset=0 */
router.get("/producers", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const producers = await getAllProducers(limit, offset);
    res.json({
      status: "ok",
      count: producers.length,
      limit,
      offset,
      data: producers,
    });
  } catch (error) {
    console.error("Error fetching producers:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch producers",
    });
  }
}); /** * GET /archive/producers/region/:region * Get producers from a specific region * Query params: ?limit=20 */
router.get("/producers/region/:region", async (req, res) => {
  try {
    const { region } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const producers = await getProducersByRegion(region, limit);
    res.json({
      status: "ok",
      region,
      count: producers.length,
      data: producers,
    });
  } catch (error) {
    console.error("Error fetching producers by region:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch producers",
    });
  }
}); /** * PATCH /archive/producer/:name * Update producer information */
router.patch("/producer/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const { history } = req.body;
    const result = await updateProducer(decodeURIComponent(name), { history });
    res.json(result);
  } catch (error) {
    console.error("Error updating producer:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to update producer",
    });
  }
});
export default router;
