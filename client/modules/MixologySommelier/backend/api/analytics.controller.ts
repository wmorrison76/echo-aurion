import express, { Request, Response } from "express";
import { query, validationResult } from "express-validator";
import AnalyticsService from "../services/analytics.service";
import RealtimeSyncService from "../services/realtime-sync.service";
import AlertsService from "../services/alerts.service";
import EventBroadcaster from "../services/event-broadcaster.service";
import WebSocketService from "../services/websocket.service";
import { authenticate } from "../middleware/auth";
const router = express.Router();
router.get(
  "/forecasts/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const forecasts = await AnalyticsService.generateSalesForecasts(
        venue_id,
        days,
      );
      res.json({
        success: true,
        venue_id,
        forecast_days: days,
        total_items: [...new Set(forecasts.map((f) => f.item_id))].length,
        total_forecasts: forecasts.length,
        data: forecasts,
      });
    } catch (error) {
      console.error("Error fetching forecasts:", error);
      res.status(500).json({
        error: "Failed to generate forecasts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get(
  "/anomalies/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const anomalies = await AnalyticsService.detectAnomalies(venue_id);
      res.json({
        success: true,
        venue_id,
        total_anomalies: anomalies.length,
        critical_count: anomalies.filter((a) => a.confidence_score > 0.8)
          .length,
        data: anomalies,
      });
    } catch (error) {
      console.error("Error detecting anomalies:", error);
      res.status(500).json({
        error: "Failed to detect anomalies",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get(
  "/inventory-optimization/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const recommendations =
        await AnalyticsService.getInventoryOptimizationRecommendations(
          venue_id,
        );
      res.json({
        success: true,
        venue_id,
        total_items: recommendations.length,
        urgent_reorders: recommendations.filter((r) =>
          r.reorder_recommendation.includes("URGENT"),
        ).length,
        data: recommendations,
      });
    } catch (error) {
      console.error("Error getting optimization recommendations:", error);
      res.status(500).json({
        error: "Failed to get recommendations",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get(
  "/revenue/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const analysis = await AnalyticsService.getRevenueAnalysis(
        venue_id,
        days,
      );
      const totals = analysis.reduce(
        (acc, day) => ({
          total_revenue: acc.total_revenue + parseFloat(day.total_revenue),
          total_margin: acc.total_margin + parseFloat(day.total_margin),
          total_transactions:
            acc.total_transactions + parseInt(day.transaction_count),
        }),
        { total_revenue: 0, total_margin: 0, total_transactions: 0 },
      );
      res.json({
        success: true,
        venue_id,
        period_days: days,
        summary: {
          total_revenue: totals.total_revenue.toFixed(2),
          total_margin: totals.total_margin.toFixed(2),
          total_transactions: totals.total_transactions,
          avg_daily_revenue: (totals.total_revenue / days).toFixed(2),
          margin_percentage: (
            (totals.total_margin / totals.total_revenue) *
            100
          ).toFixed(2),
        },
        daily_breakdown: analysis,
      });
    } catch (error) {
      console.error("Error getting revenue analysis:", error);
      res.status(500).json({
        error: "Failed to get revenue analysis",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get(
  "/top-items/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const limit = parseInt(req.query.limit as string) || 10;
      const topItems = await AnalyticsService.getTopPerformingItems(
        venue_id,
        days,
        limit,
      );
      res.json({
        success: true,
        venue_id,
        period_days: days,
        total_items: topItems.length,
        data: topItems,
      });
    } catch (error) {
      console.error("Error getting top items:", error);
      res.status(500).json({
        error: "Failed to get top items",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.post(
  "/sync/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const { sync_type } = req.body;
      if (
        ![
          "inventory_pull",
          "inventory_push",
          "pricing_sync",
          "menu_sync",
        ].includes(sync_type)
      ) {
        return res.status(400).json({ error: "Invalid sync_type" });
      }
      const operation_id = await RealtimeSyncService.initiateSyncOperation(
        venue_id,
        sync_type,
      );
      RealtimeSyncService.executeSyncOperation(operation_id).catch((error) => {
        console.error(`Sync operation ${operation_id} failed:`, error);
      });
      res.json({
        success: true,
        operation_id,
        venue_id,
        sync_type,
        status: "initiated",
      });
    } catch (error) {
      console.error("Error initiating sync:", error);
      res.status(500).json({
        error: "Failed to initiate sync",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get(
  "/sync-status/:operation_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { operation_id } = req.params;
      const status = await RealtimeSyncService.getSyncStatus(operation_id);
      if (!status) {
        return res.status(404).json({ error: "Sync operation not found" });
      }
      res.json({ success: true, operation_id, ...status });
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({
        error: "Failed to get sync status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get(
  "/inventory-snapshot/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const snapshot =
        await RealtimeSyncService.getVenueInventorySnapshot(venue_id);
      res.json({
        success: true,
        venue_id,
        snapshot_count: snapshot.length,
        timestamp: new Date(),
        data: snapshot,
      });
    } catch (error) {
      console.error("Error getting inventory snapshot:", error);
      res.status(500).json({
        error: "Failed to get snapshot",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get(
  "/alerts/active/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const alerts = await AlertsService.getActiveAlerts(venue_id);
      res.json({
        success: true,
        venue_id,
        total_alerts: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        data: alerts,
      });
    } catch (error) {
      console.error("Error fetching active alerts:", error);
      res.status(500).json({
        error: "Failed to fetch alerts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get(
  "/alerts/history/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const severity = req.query.severity as string;
      const history = await AlertsService.getAlertHistory(
        venue_id,
        limit,
        severity,
      );
      res.json({
        success: true,
        venue_id,
        total_alerts: history.length,
        data: history,
      });
    } catch (error) {
      console.error("Error fetching alert history:", error);
      res.status(500).json({
        error: "Failed to fetch alert history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.post(
  "/alerts/acknowledge/:alert_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { alert_id } = req.params;
      const alert = await AlertsService.acknowledgeAlert(alert_id, req.user.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json({ success: true, alert });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({
        error: "Failed to acknowledge alert",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.get("/websocket/health", authenticate, (req: Request, res: Response) => {
  const metrics = WebSocketService.getHealthMetrics();
  res.json({ success: true, websocket_service: "active", metrics });
});
router.get(
  "/events/history/:venue_id",
  authenticate,
  (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = EventBroadcaster.getEventHistory(venue_id, limit);
      res.json({
        success: true,
        venue_id,
        total_events: history.length,
        data: history,
      });
    } catch (error) {
      console.error("Error fetching event history:", error);
      res.status(500).json({
        error: "Failed to fetch event history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
export default router;
