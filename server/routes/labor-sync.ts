import { Router, Request, Response } from "express";
import { laborSync } from "../services/labor-sync";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/labor-sync/generate-hours
 * Generate labor hours breakdown for a production task
 * Body: { productionTaskId, eventId, guestCount, prepDaysOut }
 */
router.post("/generate-hours", async (req: Request, res: Response) => {
  try {
    const {
      productionTaskId,
      eventId,
      guestCount = 50,
      prepDaysOut = 3,
    } = req.body;

    if (!productionTaskId || !eventId) {
      return res.status(400).json({
        success: false,
        error: "productionTaskId and eventId are required",
        timestamp: new Date().toISOString(),
      });
    }

    await laborSync.generateLaborHoursBreakdown(
      productionTaskId,
      eventId,
      guestCount,
      prepDaysOut,
    );

    res.status(201).json({
      success: true,
      message: "Labor hours breakdown generated successfully",
      productionTaskId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[LaborSync] Error generating labor hours:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate labor hours breakdown",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/labor-sync/sync-to-schedule
 * Sync production task labor hours to Schedule module
 * Body: { productionTaskId }
 */
router.post("/sync-to-schedule", async (req: any, res: Response) => {
  try {
    const { productionTaskId } = req.body;

    if (!productionTaskId) {
      return res.status(400).json({
        success: false,
        error: "productionTaskId is required",
        timestamp: new Date().toISOString(),
      });
    }

    const userId = req.user?.id || "anonymous";

    const syncResult = await laborSync.syncProductionTaskToSchedule(
      productionTaskId,
      userId,
    );

    res.status(200).json({
      success: true,
      data: syncResult,
      message: "Production task synced to Schedule module successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[LaborSync] Error syncing to schedule:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to sync to Schedule module",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/labor-sync/department/:departmentId/upcoming-events
 * Get upcoming events for a department (for mini-panel)
 * Query: { daysAhead=7 }
 */
router.get(
  "/department/:departmentId/upcoming-events",
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      const { daysAhead = "7" } = req.query;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          error: "departmentId is required",
          timestamp: new Date().toISOString(),
        });
      }

      const events = await laborSync.getDepartmentUpcomingEvents(
        departmentId,
        parseInt(String(daysAhead), 10),
      );

      res.json({
        success: true,
        data: events,
        count: events.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[LaborSync] Error fetching upcoming events:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch upcoming events",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/labor-sync/task/:taskId/labor-breakdown
 * Get labor hours breakdown for a production task
 */
router.get(
  "/task/:taskId/labor-breakdown",
  async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: "taskId is required",
          timestamp: new Date().toISOString(),
        });
      }

      const breakdown = await laborSync.getPrepLaborBreakdown(taskId);

      res.json({
        success: true,
        data: breakdown,
        count: breakdown.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[LaborSync] Error fetching labor breakdown:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch labor breakdown",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * PUT /api/labor-sync/labor-hours/:laborHoursId/status
 * Update labor hours status
 * Body: { status, actualHours? }
 */
router.put(
  "/labor-hours/:laborHoursId/status",
  async (req: Request, res: Response) => {
    try {
      const { laborHoursId } = req.params;
      const { status, actualHours } = req.body;

      if (!laborHoursId || !status) {
        return res.status(400).json({
          success: false,
          error: "laborHoursId and status are required",
          timestamp: new Date().toISOString(),
        });
      }

      // Validate status
      const validStatuses = [
        "pending",
        "scheduled",
        "in_progress",
        "completed",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          timestamp: new Date().toISOString(),
        });
      }

      await laborSync.updateLaborHoursStatus(laborHoursId, status, actualHours);

      res.json({
        success: true,
        message: "Labor hours status updated successfully",
        laborHoursId,
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[LaborSync] Error updating labor hours status:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update labor hours status",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/labor-sync/task/:taskId/labor-cost
 * Get estimated labor cost for a production task
 */
router.get("/task/:taskId/labor-cost", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: "taskId is required",
        timestamp: new Date().toISOString(),
      });
    }

    const laborCost = await laborSync.getTaskLaborCost(taskId);

    res.json({
      success: true,
      data: {
        taskId,
        estimatedLaborCost: laborCost,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[LaborSync] Error calculating labor cost:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to calculate labor cost",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
