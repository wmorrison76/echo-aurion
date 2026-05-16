import { Router, Request, Response } from "express";
import { mlLaborForecasting } from "../services/ml-labor-forecasting";
import { autoSchedulingOptimizer } from "../services/auto-scheduling-optimizer";
import { staffNotificationService } from "../services/staff-notification-service";
import { mobileTimeTracking } from "../services/mobile-time-tracking";
import { logger } from "../lib/logger";

const router = Router();

// =====================================================
// ML LABOR FORECASTING ENDPOINTS
// =====================================================

/**
 * POST /api/phase6/forecasts
 * Generate a labor forecast for an upcoming event
 */
router.post("/forecasts", async (req: any, res: Response) => {
  try {
    const {
      eventId,
      guestCount,
      eventType,
      platingType,
      prepDays = 1,
      eventDurationHours = 4,
      guestComplexityScore = 5,
      venueSize = "medium",
      departmentIds,
    } = req.body;

    if (!eventId || !guestCount || !eventType || !platingType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const orgId = req.user?.org_id || "default";

    const forecast = await mlLaborForecasting.generateForecast(
      orgId,
      eventId,
      guestCount,
      eventType,
      platingType,
      prepDays,
      eventDurationHours,
      guestComplexityScore,
      venueSize,
      departmentIds,
    );

    res.status(201).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    logger.error("[Phase6] Error generating forecast:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate forecast",
    });
  }
});

/**
 * GET /api/phase6/forecasts/{forecastId}
 * Get forecast details
 */
router.get("/forecasts/:forecastId", async (req: Request, res: Response) => {
  try {
    const { forecastId } = req.params;

    const forecast = await mlLaborForecasting.getForecast(forecastId);

    if (!forecast) {
      return res.status(404).json({
        success: false,
        error: "Forecast not found",
      });
    }

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    logger.error("[Phase6] Error retrieving forecast:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to retrieve forecast",
    });
  }
});

/**
 * GET /api/phase6/forecasts/accuracy/metrics
 * Get forecast accuracy metrics
 */
router.get("/forecasts/accuracy/metrics", async (req: any, res: Response) => {
  try {
    const orgId = req.user?.org_id || "default";
    const { daysBack = "30" } = req.query;

    const metrics = await mlLaborForecasting.getForecastAccuracy(
      orgId,
      parseInt(String(daysBack), 10),
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error("[Phase6] Error retrieving forecast accuracy:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to retrieve metrics",
    });
  }
});

/**
 * POST /api/phase6/forecasts/{forecastId}/actual
 * Record actual hours for a completed event (for ML training)
 */
router.post(
  "/forecasts/:forecastId/actual",
  async (req: any, res: Response) => {
    try {
      const { forecastId } = req.params;
      const { actualHours, actualCost, eventId } = req.body;

      if (!actualHours || !actualCost) {
        return res.status(400).json({
          success: false,
          error: "Missing actual hours or cost",
        });
      }

      const success = await mlLaborForecasting.updateForecastStatus(
        forecastId,
        "completed",
      );

      if (success) {
        // Record as training data for model improvement
        await mlLaborForecasting.recordTrainingData(
          req.user?.org_id || "default",
          {
            guestCount: 0, // These would come from forecast details in production
            eventType: "",
            platingType: "",
            prepDays: 1,
            eventDurationHours: 4,
            guestComplexityScore: 5,
            venueSize: "medium",
            actualLaborHours: parseFloat(actualHours),
            actualStaffCount: 0,
            actualLaborCost: parseFloat(actualCost),
          },
          eventId || forecastId,
        );
      }

      res.json({
        success,
        message: success
          ? "Forecast updated with actuals"
          : "Forecast not found",
      });
    } catch (error) {
      logger.error("[Phase6] Error updating forecast with actuals:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update forecast",
      });
    }
  },
);

// =====================================================
// AUTO-SCHEDULING ENDPOINTS
// =====================================================

/**
 * POST /api/phase6/auto-schedule
 * Generate automated scheduling suggestions
 */
router.post("/auto-schedule", async (req: any, res: Response) => {
  try {
    const {
      productionTaskId,
      eventId,
      departmentId,
      estimatedHours,
      requiredSkills,
      optimizationMode = "balanced",
      maxSuggestionsPerRole = 3,
    } = req.body;

    if (
      !productionTaskId ||
      !departmentId ||
      !estimatedHours ||
      !requiredSkills
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const orgId = req.user?.org_id || "default";

    const suggestion =
      await autoSchedulingOptimizer.generateScheduleSuggestions(
        orgId,
        productionTaskId,
        eventId,
        departmentId,
        estimatedHours,
        requiredSkills,
        optimizationMode,
        maxSuggestionsPerRole,
      );

    res.status(201).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    logger.error("[Phase6] Error generating schedule suggestions:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate suggestions",
    });
  }
});

/**
 * GET /api/phase6/auto-schedule/{suggestionId}
 * Get scheduling suggestion details
 */
router.get(
  "/auto-schedule/:suggestionId",
  async (req: Request, res: Response) => {
    try {
      const { suggestionId } = req.params;

      const suggestion =
        await autoSchedulingOptimizer.getSuggestion(suggestionId);

      if (!suggestion) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      res.json({
        success: true,
        data: suggestion,
      });
    } catch (error) {
      logger.error("[Phase6] Error retrieving suggestion:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve suggestion",
      });
    }
  },
);

/**
 * POST /api/phase6/auto-schedule/{suggestionId}/accept
 * Accept or partially accept a scheduling suggestion
 */
router.post(
  "/auto-schedule/:suggestionId/accept",
  async (req: any, res: Response) => {
    try {
      const { suggestionId } = req.params;
      const { acceptedAssignments, notes } = req.body;

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const success = await autoSchedulingOptimizer.acceptSuggestion(
        suggestionId,
        acceptedAssignments,
        userId,
        notes,
      );

      res.json({
        success,
        message: success
          ? "Suggestion accepted and assignments created"
          : "Failed to accept suggestion",
      });
    } catch (error) {
      logger.error("[Phase6] Error accepting suggestion:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to accept suggestion",
      });
    }
  },
);

/**
 * POST /api/phase6/auto-schedule/{suggestionId}/reject
 * Reject a scheduling suggestion
 */
router.post(
  "/auto-schedule/:suggestionId/reject",
  async (req: any, res: Response) => {
    try {
      const { suggestionId } = req.params;
      const { notes } = req.body;

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const success = await autoSchedulingOptimizer.rejectSuggestion(
        suggestionId,
        userId,
        notes,
      );

      res.json({
        success,
        message: success ? "Suggestion rejected" : "Suggestion not found",
      });
    } catch (error) {
      logger.error("[Phase6] Error rejecting suggestion:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reject suggestion",
      });
    }
  },
);

/**
 * POST /api/phase6/auto-schedule/{suggestionId}/feedback
 * Record feedback on a scheduling suggestion
 */
router.post(
  "/auto-schedule/:suggestionId/feedback",
  async (req: any, res: Response) => {
    try {
      const { suggestionId } = req.params;
      const {
        productionTaskId,
        predictedCost,
        actualCost,
        managerSatisfaction,
        qualityNotes,
      } = req.body;

      if (!predictedCost || !actualCost || !managerSatisfaction) {
        return res.status(400).json({
          success: false,
          error: "Missing required feedback fields",
        });
      }

      const orgId = req.user?.org_id || "default";

      const success = await autoSchedulingOptimizer.recordFeedback(
        orgId,
        suggestionId,
        productionTaskId,
        parseFloat(predictedCost),
        parseFloat(actualCost),
        parseFloat(managerSatisfaction),
        qualityNotes,
      );

      res.json({
        success,
        message: success ? "Feedback recorded" : "Failed to record feedback",
      });
    } catch (error) {
      logger.error("[Phase6] Error recording feedback:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to record feedback",
      });
    }
  },
);

// =====================================================
// NOTIFICATION ENDPOINTS
// =====================================================

/**
 * GET /api/phase6/notifications/preferences
 * Get notification preferences for current user
 */
router.get("/notifications/preferences", async (req: any, res: Response) => {
  try {
    const orgId = req.user?.org_id || "default";
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const prefs = await staffNotificationService.getPreferences(
      orgId,
      employeeId,
    );

    res.json({
      success: true,
      data: prefs,
    });
  } catch (error) {
    logger.error("[Phase6] Error retrieving notification preferences:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve preferences",
    });
  }
});

/**
 * PUT /api/phase6/notifications/preferences
 * Update notification preferences
 */
router.put("/notifications/preferences", async (req: any, res: Response) => {
  try {
    const orgId = req.user?.org_id || "default";
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const success = await staffNotificationService.updatePreferences(
      orgId,
      employeeId,
      req.body,
    );

    res.json({
      success,
      message: success ? "Preferences updated" : "Failed to update preferences",
    });
  } catch (error) {
    logger.error("[Phase6] Error updating notification preferences:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update preferences",
    });
  }
});

/**
 * GET /api/phase6/notifications/unread
 * Get unread notification count
 */
router.get("/notifications/unread", async (req: any, res: Response) => {
  try {
    const orgId = req.user?.org_id || "default";
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const unreadCount = await staffNotificationService.getUnreadCount(
      orgId,
      employeeId,
    );

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    logger.error("[Phase6] Error retrieving unread count:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve unread count",
    });
  }
});

/**
 * GET /api/phase6/notifications/history
 * Get notification history
 */
router.get("/notifications/history", async (req: any, res: Response) => {
  try {
    const orgId = req.user?.org_id || "default";
    const employeeId = req.user?.id;
    const { limit = "50" } = req.query;

    if (!employeeId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const history = await staffNotificationService.getHistory(
      orgId,
      employeeId,
      parseInt(String(limit), 10),
    );

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    logger.error("[Phase6] Error retrieving notification history:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to retrieve history",
    });
  }
});

/**
 * POST /api/phase6/notifications/{notificationId}/read
 * Mark notification as read
 */
router.post(
  "/notifications/:notificationId/read",
  async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;

      const success = await staffNotificationService.markAsRead(notificationId);

      res.json({
        success,
        message: success ? "Marked as read" : "Notification not found",
      });
    } catch (error) {
      logger.error("[Phase6] Error marking notification as read:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to mark as read",
      });
    }
  },
);

// =====================================================
// MOBILE TIME TRACKING ENDPOINTS
// =====================================================

/**
 * POST /api/phase6/time-tracking/clock-in
 * Clock in to a task
 */
router.post("/time-tracking/clock-in", async (req: any, res: Response) => {
  try {
    const { staffAssignmentId, productionTaskId, location, deviceId } =
      req.body;

    if (!staffAssignmentId || !productionTaskId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const orgId = req.user?.org_id || "default";
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const session = await mobileTimeTracking.clockIn(
      orgId,
      staffAssignmentId,
      productionTaskId,
      employeeId,
      location,
      deviceId,
    );

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error("[Phase6] Error clocking in:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to clock in",
    });
  }
});

/**
 * GET /api/phase6/time-tracking/active
 * Get active time tracking session
 */
router.get("/time-tracking/active", async (req: any, res: Response) => {
  try {
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const session = await mobileTimeTracking.getActiveSession(employeeId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error("[Phase6] Error retrieving active session:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to retrieve session",
    });
  }
});

/**
 * POST /api/phase6/time-tracking/{trackingId}/break-start
 * Start a break
 */
router.post(
  "/time-tracking/:trackingId/break-start",
  async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;

      const success = await mobileTimeTracking.startBreak(trackingId);

      res.json({
        success,
        message: success ? "Break started" : "Failed to start break",
      });
    } catch (error) {
      logger.error("[Phase6] Error starting break:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to start break",
      });
    }
  },
);

/**
 * POST /api/phase6/time-tracking/{trackingId}/break-end
 * End a break
 */
router.post(
  "/time-tracking/:trackingId/break-end",
  async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;

      const success = await mobileTimeTracking.endBreak(trackingId);

      res.json({
        success,
        message: success ? "Break ended" : "Failed to end break",
      });
    } catch (error) {
      logger.error("[Phase6] Error ending break:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to end break",
      });
    }
  },
);

/**
 * POST /api/phase6/time-tracking/{trackingId}/clock-out
 * Clock out from a task
 */
router.post(
  "/time-tracking/:trackingId/clock-out",
  async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;
      const { location, deviceId, workQualityNotes, taskCompletionPercentage } =
        req.body;

      const session = await mobileTimeTracking.clockOut(
        trackingId,
        location,
        deviceId,
        workQualityNotes,
        taskCompletionPercentage,
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Time tracking session not found",
        });
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      logger.error("[Phase6] Error clocking out:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to clock out",
      });
    }
  },
);

/**
 * GET /api/phase6/time-tracking/{trackingId}
 * Get time tracking details
 */
router.get(
  "/time-tracking/:trackingId",
  async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;

      const session = await mobileTimeTracking.getSession(trackingId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Time tracking session not found",
        });
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      logger.error("[Phase6] Error retrieving time tracking:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve session",
      });
    }
  },
);

/**
 * POST /api/phase6/time-tracking/{trackingId}/submit
 * Submit time tracking for approval
 */
router.post(
  "/time-tracking/:trackingId/submit",
  async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;

      const success = await mobileTimeTracking.submitTimeTracking(trackingId);

      res.json({
        success,
        message: success
          ? "Time tracking submitted for approval"
          : "Failed to submit",
      });
    } catch (error) {
      logger.error("[Phase6] Error submitting time tracking:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit",
      });
    }
  },
);

/**
 * POST /api/phase6/time-tracking/{trackingId}/approve
 * Approve time tracking
 */
router.post(
  "/time-tracking/:trackingId/approve",
  async (req: any, res: Response) => {
    try {
      const { trackingId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const success = await mobileTimeTracking.approveTimeTracking(
        trackingId,
        userId,
      );

      res.json({
        success,
        message: success ? "Time tracking approved" : "Failed to approve",
      });
    } catch (error) {
      logger.error("[Phase6] Error approving time tracking:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to approve",
      });
    }
  },
);

/**
 * GET /api/phase6/time-tracking/history
 * Get time tracking history for current user
 */
router.get("/time-tracking/history", async (req: any, res: Response) => {
  try {
    const employeeId = req.user?.id;
    const { limit = "30" } = req.query;

    if (!employeeId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const history = await mobileTimeTracking.getEmployeeHistory(
      employeeId,
      parseInt(String(limit), 10),
    );

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    logger.error("[Phase6] Error retrieving time tracking history:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to retrieve history",
    });
  }
});

/**
 * GET /api/phase6/time-tracking/department/{departmentId}/pending
 * Get pending time tracking approvals for a department
 */
router.get(
  "/time-tracking/department/:departmentId/pending",
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      const { limit = "50" } = req.query;

      const pending = await mobileTimeTracking.getPendingApprovals(
        departmentId,
        parseInt(String(limit), 10),
      );

      res.json({
        success: true,
        data: pending,
        count: pending.length,
      });
    } catch (error) {
      logger.error("[Phase6] Error retrieving pending approvals:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to retrieve pending",
      });
    }
  },
);

export default router;
