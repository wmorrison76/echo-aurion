import express from "express";
import {
  getTemperatureAverages,
  getAlerts,
  resolveAlert,
  getRecentReadings,
  attachCoolerSensor,
} from "./sensor.service.js";
const router =
  express.Router(); /** * GET /alerts/:venueId * Get active alerts for a venue * Query params: ?resolved=false (get unresolved), resolved=true (get all) */
router.get("/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const unresolved = req.query.resolved !== "true";
    const alerts = await getAlerts(venueId, unresolved);
    res.json({ status: "ok", venueId, count: alerts.length, data: alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch alerts",
    });
  }
}); /** * GET /alerts/:venueId/avg * Get temperature averages for a venue * Query params: ?days=7 */
router.get("/:venueId/avg", async (req, res) => {
  try {
    const { venueId } = req.params;
    const days = parseInt(req.query.days) || 7;
    const data = await getTemperatureAverages(venueId, days);
    res.json({ status: "ok", data });
  } catch (error) {
    console.error("Error fetching averages:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch temperature data",
    });
  }
}); /** * GET /alerts/:venueId/readings * Get recent sensor readings for a venue * Query params: ?limit=100 */
router.get("/:venueId/readings", async (req, res) => {
  try {
    const { venueId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const readings = await getRecentReadings(venueId, limit);
    res.json({ status: "ok", venueId, count: readings.length, data: readings });
  } catch (error) {
    console.error("Error fetching readings:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch readings",
    });
  }
}); /** * PATCH /alerts/:alertId/resolve * Mark an alert as resolved */
router.patch("/:alertId/resolve", async (req, res) => {
  try {
    const result = await resolveAlert(req.params.alertId);
    res.json(result);
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to resolve alert",
    });
  }
}); /** * POST /alerts/sensor/attach * Attach a new sensor to monitoring */
router.post("/sensor/attach", async (req, res) => {
  try {
    const { sensorId, venueId, wineId } = req.body;
    if (!sensorId || !venueId) {
      return res
        .status(400)
        .json({ error: "sensorId and venueId are required" });
    }
    attachCoolerSensor(sensorId, venueId, wineId || null);
    res.json({ status: "attached", sensorId, venueId, wineId: wineId || null });
  } catch (error) {
    console.error("Error attaching sensor:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to attach sensor",
    });
  }
});
export default router;
