import { Router, Request, Response } from "express";
import { staffAssignment } from "../services/staff-assignment";
import { laborAnalytics } from "../services/labor-analytics";
import { advancedLaborManagement } from "../services/advanced-labor-management";
import { logger } from "../lib/logger";

const router = Router();

// =====================================================
// STAFF ASSIGNMENT ENDPOINTS
// =====================================================

/**
 * POST /api/phase5/staff-assignments
 * Assign staff to a production task
 */
router.post("/staff-assignments", async (req: any, res: Response) => {
  try {
    const {
      productionTaskId,
      employeeId,
      roleInTask,
      estimatedHours,
      allocationPercentage = 100,
    } = req.body;

    if (!productionTaskId || !employeeId || !roleInTask) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const orgId = req.user?.org_id || "default";
    const userId = req.user?.id || "anonymous";

    const assignment = await staffAssignment.assignStaffToTask(
      orgId,
      productionTaskId,
      employeeId,
      roleInTask,
      estimatedHours,
      allocationPercentage,
      userId,
    );

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    logger.error("[Phase5] Error assigning staff:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign staff",
    });
  }
});

/**
 * GET /api/phase5/tasks/{taskId}/assignments
 * Get all staff assignments for a task
 */
router.get(
  "/tasks/:taskId/assignments",
  async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;

      const assignments = await staffAssignment.getTaskAssignments(taskId);

      res.json({
        success: true,
        data: assignments,
        count: assignments.length,
      });
    } catch (error) {
      logger.error("[Phase5] Error fetching assignments:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch assignments",
      });
    }
  },
);

/**
 * POST /api/phase5/assignments/{assignmentId}/confirm
 * Staff member confirms availability
 */
router.post(
  "/assignments/:assignmentId/confirm",
  async (req: any, res: Response) => {
    try {
      const { assignmentId } = req.params;
      const employeeId = req.user?.id;

      if (!employeeId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const success = await staffAssignment.confirmAssignment(
        assignmentId,
        employeeId,
      );

      res.json({
        success,
        message: success ? "Assignment confirmed" : "Assignment not found",
      });
    } catch (error) {
      logger.error("[Phase5] Error confirming assignment:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to confirm assignment",
      });
    }
  },
);

/**
 * POST /api/phase5/assignments/{assignmentId}/hours
 * Log actual hours worked
 */
router.post(
  "/assignments/:assignmentId/hours",
  async (req: any, res: Response) => {
    try {
      const { assignmentId } = req.params;
      const { actualHours, startTime, endTime } = req.body;

      if (!actualHours || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      const userId = req.user?.id || "anonymous";

      const success = await staffAssignment.logActualHours(
        assignmentId,
        actualHours,
        new Date(startTime),
        new Date(endTime),
        userId,
      );

      res.json({
        success,
        message: success ? "Hours logged successfully" : "Assignment not found",
      });
    } catch (error) {
      logger.error("[Phase5] Error logging hours:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to log hours",
      });
    }
  },
);

// =====================================================
// LABOR ANALYTICS ENDPOINTS
// =====================================================

/**
 * POST /api/phase5/analytics/record
 * Record analytics for a completed task
 */
router.post("/analytics/record", async (req: any, res: Response) => {
  try {
    const {
      productionTaskId,
      eventId,
      departmentId,
      estimatedHours,
      actualHours,
      estimatedCost,
      actualCost,
      guestCount,
      eventType,
      platingType,
      varianceReason,
    } = req.body;

    if (!productionTaskId || !estimatedHours || !actualHours) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const orgId = req.user?.org_id || "default";

    const analytics = await laborAnalytics.recordTaskAnalytics(
      orgId,
      productionTaskId,
      eventId,
      departmentId,
      estimatedHours,
      actualHours,
      estimatedCost,
      actualCost,
      guestCount,
      eventType,
      platingType,
      varianceReason,
    );

    res.status(201).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("[Phase5] Error recording analytics:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record analytics",
    });
  }
});

/**
 * GET /api/phase5/analytics/task/{taskId}
 * Get analytics for a specific task
 */
router.get("/analytics/task/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const analytics = await laborAnalytics.getTaskAnalytics(taskId);

    if (!analytics) {
      return res.json({
        success: false,
        message: "No analytics found for this task",
      });
    }

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("[Phase5] Error fetching task analytics:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch analytics",
    });
  }
});

/**
 * GET /api/phase5/analytics/department/{departmentId}
 * Get department-wide analytics
 */
router.get(
  "/analytics/department/:departmentId",
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      const { daysBack = "30" } = req.query;

      const analytics = await laborAnalytics.getDepartmentAnalytics(
        departmentId,
        parseInt(String(daysBack), 10),
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error("[Phase5] Error fetching department analytics:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch analytics",
      });
    }
  },
);

/**
 * GET /api/phase5/analytics/department/{departmentId}/performers
 * Get top performers in a department
 */
router.get(
  "/analytics/department/:departmentId/performers",
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      const { limit = "10" } = req.query;

      const performers = await laborAnalytics.getTopPerformers(
        departmentId,
        parseInt(String(limit), 10),
      );

      res.json({
        success: true,
        data: performers,
        count: performers.length,
      });
    } catch (error) {
      logger.error("[Phase5] Error fetching top performers:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch performers",
      });
    }
  },
);

/**
 * GET /api/phase5/analytics/department/{departmentId}/improvements
 * Get areas for improvement based on variance
 */
router.get(
  "/analytics/department/:departmentId/improvements",
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      const { limit = "5" } = req.query;

      const improvements = await laborAnalytics.getImprovementAreas(
        departmentId,
        parseInt(String(limit), 10),
      );

      res.json({
        success: true,
        data: improvements,
        count: improvements.length,
      });
    } catch (error) {
      logger.error("[Phase5] Error fetching improvement areas:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch improvements",
      });
    }
  },
);

/**
 * GET /api/phase5/analytics/department/{departmentId}/forecast
 * Get labor cost forecast
 */
router.get(
  "/analytics/department/:departmentId/forecast",
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      const { upcomingCount = "5" } = req.query;

      const forecast = await laborAnalytics.generateCostForecast(
        departmentId,
        parseInt(String(upcomingCount), 10),
      );

      res.json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      logger.error("[Phase5] Error generating cost forecast:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate forecast",
      });
    }
  },
);

// =====================================================
// ADVANCED LABOR MANAGEMENT ENDPOINTS
// =====================================================

/**
 * POST /api/phase5/skills
 * Add a skill to an employee
 */
router.post("/skills", async (req: any, res: Response) => {
  try {
    const {
      employeeId,
      skillCode,
      skillName,
      proficiencyLevel,
      yearsExperience,
      certified,
      certifiedDate,
    } = req.body;

    if (!employeeId || !skillCode || !skillName || !proficiencyLevel) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const orgId = req.user?.org_id || "default";

    const skill = await advancedLaborManagement.addEmployeeSkill(
      orgId,
      employeeId,
      skillCode,
      skillName,
      proficiencyLevel,
      yearsExperience || 0,
      certified || false,
      certifiedDate ? new Date(certifiedDate) : undefined,
    );

    res.status(201).json({
      success: true,
      data: skill,
    });
  } catch (error) {
    logger.error("[Phase5] Error adding skill:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to add skill",
    });
  }
});

/**
 * GET /api/phase5/employees/{employeeId}/skills
 * Get all skills for an employee
 */
router.get(
  "/employees/:employeeId/skills",
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;

      const skills =
        await advancedLaborManagement.getEmployeeSkills(employeeId);

      res.json({
        success: true,
        data: skills,
        count: skills.length,
      });
    } catch (error) {
      logger.error("[Phase5] Error fetching employee skills:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch skills",
      });
    }
  },
);

/**
 * POST /api/phase5/labor-rates
 * Set custom labor rate
 */
router.post("/labor-rates", async (req: any, res: Response) => {
  try {
    const {
      departmentId,
      positionCode,
      positionName,
      baseHourlyRate,
      overtimeMultiplier,
      weekendMultiplier,
      holidayMultiplier,
    } = req.body;

    if (!departmentId || !positionCode || !positionName || !baseHourlyRate) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const orgId = req.user?.org_id || "default";

    const rate = await advancedLaborManagement.setLaborRate(
      orgId,
      departmentId,
      positionCode,
      positionName,
      baseHourlyRate,
      overtimeMultiplier || 1.5,
      weekendMultiplier || 1.0,
      holidayMultiplier || 2.0,
    );

    res.status(201).json({
      success: true,
      data: rate,
    });
  } catch (error) {
    logger.error("[Phase5] Error setting labor rate:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to set labor rate",
    });
  }
});

/**
 * GET /api/phase5/departments/{departmentId}/labor-rates
 * Get all labor rates for a department
 */
router.get(
  "/departments/:departmentId/labor-rates",
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;

      const rates =
        await advancedLaborManagement.getDepartmentRates(departmentId);

      res.json({
        success: true,
        data: rates,
        count: rates.length,
      });
    } catch (error) {
      logger.error("[Phase5] Error fetching labor rates:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch rates",
      });
    }
  },
);

/**
 * GET /api/phase5/departments/{departmentId}/skilled-staff
 * Find skilled staff for a department
 */
router.get(
  "/departments/:departmentId/skilled-staff",
  async (req: any, res: Response) => {
    try {
      const { departmentId } = req.params;
      const { skills = "" } = req.query;

      if (!skills) {
        return res.status(400).json({
          success: false,
          error: "Skills query parameter required",
        });
      }

      const orgId = req.user?.org_id || "default";
      const skillsList = String(skills).split(",");

      const staff = await advancedLaborManagement.findSkilledStaff(
        orgId,
        departmentId,
        skillsList,
      );

      res.json({
        success: true,
        data: staff,
        count: staff.length,
      });
    } catch (error) {
      logger.error("[Phase5] Error finding skilled staff:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to find staff",
      });
    }
  },
);

export default router;
