import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { calendarVisibilityService } from "../services/calendar-visibility.js";
import { logger } from "../lib/logger.js";

export const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/visibility/my-preferences
 * Get current user's visibility preferences
 */
router.get("/my-preferences", async (req, res) => {
  try {
    const userId = req.user?.sub;
    const orgId = req.user?.org_id;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const rules = await calendarVisibilityService.getVisibilityRules(
      userId,
      orgId,
    );

    res.json({
      success: true,
      data: {
        visibilityScope: rules?.visibilityScope || "own_departments",
        allowedOutlets: rules?.allowedOutletIds || [],
        allowedDepartments: rules?.allowedDepartmentIds || [],
      },
    });
  } catch (error) {
    logger.error("[API] Error fetching visibility preferences", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/visibility/my-preferences
 * Update current user's visibility preferences
 */
router.patch("/my-preferences", async (req, res) => {
  try {
    const userId = req.user?.sub;
    const orgId = req.user?.org_id;
    const { visibilityScope, allowedOutlets, allowedDepartments } = req.body;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const updated = await calendarVisibilityService.updateVisibilityPreferences(
      userId,
      orgId,
      {
        visibilityScope,
        allowedOutlets,
        allowedDepartments,
      },
    );

    res.json({
      success: true,
      data: {
        visibilityScope: updated.visibilityScope,
        allowedOutlets: updated.allowedOutletIds,
        allowedDepartments: updated.allowedDepartmentIds,
      },
    });
  } catch (error) {
    logger.error("[API] Error updating visibility preferences", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/visibility/events
 * Get all visible events for current user
 */
router.get("/events", async (req, res) => {
  try {
    const userId = req.user?.sub;
    const orgId = req.user?.org_id;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Parse optional filters
    const filters: any = {};

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    if (req.query.departmentId) {
      filters.departmentId = req.query.departmentId;
    }

    if (req.query.outletId) {
      filters.outletId = req.query.outletId;
    }

    if (req.query.status) {
      filters.status = req.query.status;
    }

    const events = await calendarVisibilityService.getUserVisibleEvents(
      userId,
      orgId,
      filters,
    );

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error("[API] Error fetching visible events", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/visibility/check-event/:eventId
 * Check if user can view a specific event
 */
router.post("/check-event/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.sub;
    const orgId = req.user?.org_id;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const canView = await calendarVisibilityService.canUserViewEvent(
      userId,
      eventId,
      orgId,
    );

    res.json({
      success: true,
      data: { canView },
    });
  } catch (error) {
    logger.error("[API] Error checking event visibility", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/visibility/check-events
 * Check visibility for multiple events
 */
router.post("/check-events", async (req, res) => {
  try {
    const { eventIds } = req.body;
    const userId = req.user?.sub;
    const orgId = req.user?.org_id;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    if (!Array.isArray(eventIds)) {
      return res.status(400).json({
        success: false,
        error: "eventIds must be an array",
      });
    }

    const visibility = await calendarVisibilityService.getEventsVisibility(
      userId,
      orgId,
      eventIds,
    );

    res.json({
      success: true,
      data: visibility,
    });
  } catch (error) {
    logger.error("[API] Error checking events visibility", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/visibility/my-departments
 * Get departments user has access to
 */
router.get("/my-departments", async (req, res) => {
  try {
    const userId = req.user?.sub;
    const orgId = req.user?.org_id;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const departments = await calendarVisibilityService.getUserDepartments(
      userId,
      orgId,
    );

    res.json({
      success: true,
      data: { departments },
    });
  } catch (error) {
    logger.error("[API] Error fetching user departments", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/visibility/my-outlets
 * Get outlets user has access to
 */
router.get("/my-outlets", async (req, res) => {
  try {
    const userId = req.user?.sub;
    const orgId = req.user?.org_id;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const outlets = await calendarVisibilityService.getUserOutlets(
      userId,
      orgId,
    );

    res.json({
      success: true,
      data: { outlets },
    });
  } catch (error) {
    logger.error("[API] Error fetching user outlets", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/visibility/grant-department-access
 * Grant user access to departments (admin only)
 */
router.post("/grant-department-access", async (req, res) => {
  try {
    const { userId, departmentIds } = req.body;
    const adminId = req.user?.sub;
    const orgId = req.user?.org_id;

    if (!adminId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    if (!userId || !Array.isArray(departmentIds)) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userId, departmentIds",
      });
    }

    const updated = await calendarVisibilityService.grantDepartmentAccess(
      userId,
      orgId,
      departmentIds,
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error("[API] Error granting department access", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/visibility/reset-default-access
 * Reset user's visibility to default based on role
 */
router.post("/reset-default-access", async (req, res) => {
  try {
    const userId = req.user?.sub;
    const orgId = req.user?.org_id;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const reset = await calendarVisibilityService.resetToDefaultAccess(
      userId,
      orgId,
    );

    res.json({
      success: true,
      data: reset,
    });
  } catch (error) {
    logger.error("[API] Error resetting default access", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});
