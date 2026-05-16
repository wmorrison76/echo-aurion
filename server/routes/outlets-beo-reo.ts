import { Router, Request, Response } from "express";
import { beoReoClassifier } from "../services/beo-reo-classifier";
import { logger } from "../lib/logger";

const router = Router();

// =====================================================
// OPERATING HOURS ENDPOINTS
// =====================================================

/**
 * GET /api/outlets/:outletId/hours
 * Get operating hours for an outlet
 */
router.get("/outlets/:outletId/hours", async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;

    const hours = await beoReoClassifier.getOutletOperatingHours(outletId);

    res.json({
      success: true,
      data: hours,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[OutletsBeoReo] Error fetching operating hours:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch hours",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/outlets/:outletId/hours
 * Set operating hours for an outlet day
 */
router.post("/outlets/:outletId/hours", async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const { dayOfWeek, opensAt, closesAt } = req.body;

    if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        error: "dayOfWeek must be 0-6",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    const success = await beoReoClassifier.setOutletOperatingHours(
      outletId,
      orgId,
      dayOfWeek,
      opensAt,
      closesAt,
    );

    res.json({
      success,
      data: { outletId, dayOfWeek, opensAt, closesAt },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[OutletsBeoReo] Error setting operating hours:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to set hours",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// CLASSIFICATION ENDPOINTS
// =====================================================

/**
 * POST /api/events/:eventId/classify
 * Classify an event as BEO or REO
 */
router.post(
  "/events/:eventId/classify",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { outletId, eventStart, eventEnd, guestCount } = req.body;

      if (!outletId || !eventStart || !eventEnd) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: outletId, eventStart, eventEnd",
          timestamp: new Date().toISOString(),
        });
      }

      const orgId = req.user?.org_id || "default";

      const classification = await beoReoClassifier.classifyEvent(
        eventId,
        outletId,
        orgId,
        new Date(eventStart),
        new Date(eventEnd),
        guestCount,
      );

      res.json({
        success: true,
        data: classification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[OutletsBeoReo] Error classifying event:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to classify event",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/events/:eventId/classification
 * Get event classification
 */
router.get(
  "/events/:eventId/classification",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const classification =
        await beoReoClassifier.getEventClassification(eventId);

      if (!classification) {
        return res.status(404).json({
          success: false,
          error: "Event classification not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: classification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[OutletsBeoReo] Error fetching classification:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch classification",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/events/:eventId/classification/override
 * Override event classification
 */
router.post(
  "/events/:eventId/classification/override",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { newClassification, reason } = req.body;

      if (!newClassification || !["BEO", "REO"].includes(newClassification)) {
        return res.status(400).json({
          success: false,
          error: "newClassification must be BEO or REO",
          timestamp: new Date().toISOString(),
        });
      }

      const userId = req.user?.id || "anonymous";

      const success = await beoReoClassifier.overrideClassification(
        eventId,
        newClassification,
        userId,
        reason || "Manual override",
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Event classification not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { eventId, newClassification },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[OutletsBeoReo] Error overriding classification:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to override classification",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// DEPARTMENTS ENDPOINTS
// =====================================================

/**
 * GET /api/departments
 * List all departments for organization
 */
router.get("/departments", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.org_id || "default";

    const departments = await beoReoClassifier.getAllDepartments(orgId);

    res.json({
      success: true,
      data: departments,
      count: departments.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[OutletsBeoReo] Error fetching departments:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch departments",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/departments
 * Create a new department
 */
router.post("/departments", async (req: Request, res: Response) => {
  try {
    const { name, slug, departmentType, description } = req.body;

    if (!name || !slug || !departmentType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, slug, departmentType",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";
    const userId = req.user?.id || "anonymous";

    const deptId = await beoReoClassifier.createDepartment(
      orgId,
      name,
      slug,
      departmentType,
      userId,
    );

    res.status(201).json({
      success: true,
      data: { id: deptId, name, slug, departmentType },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[OutletsBeoReo] Error creating department:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create department",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// OUTLET DEPARTMENT ASSIGNMENTS
// =====================================================

/**
 * GET /api/outlets/:outletId/departments
 * Get departments assigned to an outlet
 */
router.get(
  "/outlets/:outletId/departments",
  async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const { classification } = req.query;

      const departments = await beoReoClassifier.getOutletDepartments(
        outletId,
        classification as "BEO" | "REO" | undefined,
      );

      res.json({
        success: true,
        data: departments,
        count: departments.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[OutletsBeoReo] Error fetching outlet departments:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch outlet departments",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/outlets/:outletId/departments/:departmentId
 * Assign a department to an outlet
 */
router.post(
  "/outlets/:outletId/departments/:departmentId",
  async (req: Request, res: Response) => {
    try {
      const { outletId, departmentId } = req.params;
      const { assignmentType, appliesTo } = req.body;

      if (
        !["primary", "support", "required", "optional"].includes(assignmentType)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "assignmentType must be primary, support, required, or optional",
          timestamp: new Date().toISOString(),
        });
      }

      const orgId = req.user?.org_id || "default";

      const assignmentId = await beoReoClassifier.assignDepartmentToOutlet(
        outletId,
        departmentId,
        orgId,
        assignmentType,
        appliesTo,
      );

      res.status(201).json({
        success: true,
        data: { assignmentId, outletId, departmentId, assignmentType },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[OutletsBeoReo] Error assigning department:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to assign department",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// CLASSIFICATION RULES ENDPOINTS
// =====================================================

/**
 * POST /api/outlets/:outletId/rules
 * Create a BEO/REO classification rule
 */
router.post("/outlets/:outletId/rules", async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const {
      ruleName,
      ruleType,
      conditionJson,
      resultsInClassification,
      priority,
    } = req.body;

    if (!ruleName || !ruleType || !conditionJson || !resultsInClassification) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: ruleName, ruleType, conditionJson, resultsInClassification",
        timestamp: new Date().toISOString(),
      });
    }

    if (!["BEO", "REO"].includes(resultsInClassification)) {
      return res.status(400).json({
        success: false,
        error: "resultsInClassification must be BEO or REO",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";
    const userId = req.user?.id || "anonymous";

    const ruleId = await beoReoClassifier.createRule(
      outletId,
      orgId,
      ruleName,
      ruleType,
      conditionJson,
      resultsInClassification,
      priority || 100,
      userId,
    );

    res.status(201).json({
      success: true,
      data: {
        ruleId,
        outletId,
        ruleName,
        ruleType,
        resultsInClassification,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[OutletsBeoReo] Error creating rule:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create rule",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/outlets/:outletId/is-open
 * Check if outlet is open at a given time
 */
router.post(
  "/outlets/:outletId/is-open",
  async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const { dateTime } = req.body;

      if (!dateTime) {
        return res.status(400).json({
          success: false,
          error: "dateTime is required",
          timestamp: new Date().toISOString(),
        });
      }

      const isOpen = await beoReoClassifier.isOutletOpenAt(
        outletId,
        new Date(dateTime),
      );

      res.json({
        success: true,
        data: { outletId, dateTime, isOpen },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[OutletsBeoReo] Error checking outlet hours:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check outlet hours",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

export default router;
