import express from "express";
import {
  computeMonthEnd,
  getVarianceAnalysis,
  recordPurchase,
  getPurchaseHistory,
  calculateFIFO,
} from "./costing.service.js";
const router =
  express.Router(); /** * GET /reports/month-end/:venueId/:month * Compute month-end COGS and cost percentage */
router.get("/month-end/:venueId/:month", async (req, res) => {
  try {
    const { venueId, month } = req.params;
    const data = await computeMonthEnd(venueId, month);
    res.json({ status: "ok", data });
  } catch (error) {
    console.error("Error in month-end report:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to compute month-end",
    });
  }
}); /** * GET /reports/variance/:venueId/:month * Get variance analysis (expected vs actual inventory) */
router.get("/variance/:venueId/:month", async (req, res) => {
  try {
    const { venueId, month } = req.params;
    const data = await getVarianceAnalysis(venueId, month);
    res.json({ status: "ok", data });
  } catch (error) {
    console.error("Error in variance report:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to compute variance",
    });
  }
}); /** * GET /reports/purchases * Get purchase history for date range * Query params: ?startDate=2024-01-01&endDate=2024-01-31 */
router.get("/purchases", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "startDate and endDate query parameters required" });
    }
    const data = await getPurchaseHistory(startDate, endDate);
    res.json({ status: "ok", count: data.length, data });
  } catch (error) {
    console.error("Error getting purchase history:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to retrieve purchases",
    });
  }
}); /** * POST /reports/purchases * Record a new purchase */
router.post("/purchases", async (req, res) => {
  try {
    const { supplier_id, invoice_number, total_cost } = req.body;
    const result = await recordPurchase({
      supplier_id,
      invoice_number,
      total_cost,
    });
    res.json(result);
  } catch (error) {
    console.error("Error recording purchase:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to record purchase",
    });
  }
}); /** * GET /reports/fifo/:venueId/:month * Calculate FIFO cost of inventory */
router.get("/fifo/:venueId/:month", async (req, res) => {
  try {
    const { venueId, month } = req.params;
    const data = await calculateFIFO(venueId, month);
    res.json({ status: "ok", data });
  } catch (error) {
    console.error("Error calculating FIFO:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to calculate FIFO",
    });
  }
});
export default router;
