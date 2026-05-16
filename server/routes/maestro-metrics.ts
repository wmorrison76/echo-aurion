import { Router, Request, Response } from "express";

const router = Router();

// Mock data for now - will be replaced with Supabase queries
const getMaestroMetrics = async () => {
  return {
    events: [
      {
        id: "1",
        name: "Corporate Gala – BEO 876309",
        guests: 180,
        location: "Grand Ballroom",
        status: "confirmed",
        date: "2024-12-15",
      },
    ],
    scheduleUpdates: [
      {
        id: "1",
        type: "Scheduled",
        count: 0,
        message: "0 all-outs • 0 call-outs • 0.01 risk",
      },
    ],
    productionItems: [
      { id: "1", name: "Pre-plated appetizers", prep: "In Progress", qty: "240" },
      { id: "2", name: "Dessert plating", prep: "Pending", qty: "180" },
      { id: "3", name: "Beverage setup", prep: "Complete", qty: "500" },
    ],
    bqtSheets: [
      { id: "1", name: "BEO 876309 - Guest Sheet", items: 12 },
      { id: "2", name: "Timeline & Staffing Plan", items: 8 },
      { id: "3", name: "Food & Beverage Details", items: 15 },
    ],
  };
};

// Get dashboard metrics
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const metrics = await getMaestroMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("[MAESTRO-METRICS] Error fetching metrics:", error);
    res.status(500).json({
      error: "Failed to fetch metrics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get events for a specific time range
router.get("/events", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`[MAESTRO-METRICS] Fetching events from ${startDate} to ${endDate}`);
    
    const metrics = await getMaestroMetrics();
    res.json({ events: metrics.events });
  } catch (error) {
    console.error("[MAESTRO-METRICS] Error fetching events:", error);
    res.status(500).json({
      error: "Failed to fetch events",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get production status for an outlet
router.get("/production/:outletId", async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    console.log(`[MAESTRO-METRICS] Fetching production for outlet: ${outletId}`);
    
    const metrics = await getMaestroMetrics();
    res.json({
      outletId,
      items: metrics.productionItems,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[MAESTRO-METRICS] Error fetching production:", error);
    res.status(500).json({
      error: "Failed to fetch production status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get staffing/schedule updates
router.get("/schedule", async (req: Request, res: Response) => {
  try {
    const metrics = await getMaestroMetrics();
    res.json({ scheduleUpdates: metrics.scheduleUpdates });
  } catch (error) {
    console.error("[MAESTRO-METRICS] Error fetching schedule:", error);
    res.status(500).json({
      error: "Failed to fetch schedule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
