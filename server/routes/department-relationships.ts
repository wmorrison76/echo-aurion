/**
 * Department Relationships API Routes
 * Manage department dependencies, define relationship types, and handle notification cascading
 */

import { Router, Request, Response } from "express";
import { departmentNotificationCascader } from "../services/department-notification-cascader";
import { logger } from "../lib/logger";
import { Database } from "../lib/database-client";

const router = Router();
const db = new Database();

// =====================================================
// MIDDLEWARE
// =====================================================

const verifyOrgContext = (req: Request, res: Response, next: Function) => {
  const userId = req.user?.id;
  const orgId = req.user?.org_id;

  if (!userId || !orgId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      timestamp: new Date().toISOString(),
    });
  }

  res.locals.userId = userId;
  res.locals.orgId = orgId;
  next();
};

const verifyAdminRole = async (req: Request, res: Response, next: Function) => {
  // Check if user is admin
  const adminCheck = req.user?.role === "admin" || req.user?.role === "owner";
  if (!adminCheck) {
    return res.status(403).json({
      success: false,
      error: "Forbidden - admin role required",
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

router.use(verifyOrgContext);

// =====================================================
// DEPARTMENT ENDPOINTS
// =====================================================

/**
 * GET /api/departments
 * List all departments for organization
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        name,
        display_name,
        description,
        department_type,
        manager_id,
        is_active,
        color_hex,
        created_at
      FROM organization_departments
      WHERE org_id = $1
      ORDER BY department_type DESC, name ASC
    `,
      [res.locals.orgId],
    );

    res.json({
      success: true,
      data: {
        departments: result.rows,
        total: result.rows.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[DeptRelationships] Failed to list departments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch departments",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/departments
 * Create a new department
 */
router.post("/", verifyAdminRole, async (req: Request, res: Response) => {
  try {
    const { name, displayName, description, departmentType, managerId, color } =
      req.body;

    if (!name || !departmentType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, departmentType",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await db.query(
      `
      INSERT INTO organization_departments (
        org_id, name, display_name, description, department_type,
        manager_id, color_hex, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, name, display_name, department_type
    `,
      [
        res.locals.orgId,
        name,
        displayName || name,
        description,
        departmentType,
        managerId,
        color || "#3b82f6",
      ],
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[DeptRelationships] Failed to create department:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create department",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// RELATIONSHIP ENDPOINTS
// =====================================================

/**
 * GET /api/departments/:deptId/relationships
 * Get all relationships for a department
 */
router.get("/:deptId/relationships", async (req: Request, res: Response) => {
  try {
    const { deptId } = req.params;

    const result = await db.query(
      `
        SELECT
          dr.id,
          sd.name as source_department,
          td.name as target_department,
          dr.relationship_type,
          dr.is_bidirectional,
          dr.priority,
          dr.notification_required,
          dr.auto_invite,
          dr.approval_required,
          dr.approval_deadline_hours,
          dr.escalate_if_not_responded_hours
        FROM department_relationships dr
        LEFT JOIN organization_departments sd ON dr.source_department_id = sd.id
        LEFT JOIN organization_departments td ON dr.target_department_id = td.id
        WHERE (dr.source_department_id = $1 OR dr.target_department_id = $1)
          AND dr.org_id = $2
        ORDER BY dr.priority ASC
      `,
      [deptId, res.locals.orgId],
    );

    res.json({
      success: true,
      data: {
        relationships: result.rows,
        total: result.rows.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[DeptRelationships] Failed to get relationships:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch relationships",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/departments/relationships
 * Create a new department relationship
 */
router.post(
  "/relationships",
  verifyAdminRole,
  async (req: Request, res: Response) => {
    try {
      const {
        sourceDepartmentId,
        targetDepartmentId,
        relationshipType,
        priority,
        notificationRequired,
        approvalRequired,
        escalateIfNotRespondedHours,
      } = req.body;

      if (!sourceDepartmentId || !targetDepartmentId || !relationshipType) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: sourceDepartmentId, targetDepartmentId, relationshipType",
          timestamp: new Date().toISOString(),
        });
      }

      const result = await db.query(
        `
        INSERT INTO department_relationships (
          org_id, source_department_id, target_department_id,
          relationship_type, priority, notification_required,
          approval_required, escalate_if_not_responded_hours,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, source_department_id, target_department_id, relationship_type
      `,
        [
          res.locals.orgId,
          sourceDepartmentId,
          targetDepartmentId,
          relationshipType,
          priority || 1,
          notificationRequired !== false,
          approvalRequired || false,
          escalateIfNotRespondedHours,
          res.locals.userId,
        ],
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[DeptRelationships] Failed to create relationship:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create relationship",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * DELETE /api/departments/relationships/:relationshipId
 * Delete a department relationship
 */
router.delete(
  "/relationships/:relationshipId",
  verifyAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { relationshipId } = req.params;

      const result = await db.query(
        `
        DELETE FROM department_relationships
        WHERE id = $1 AND org_id = $2
        RETURNING id
      `,
        [relationshipId, res.locals.orgId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Relationship not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[DeptRelationships] Failed to delete relationship:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete relationship",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// NOTIFICATION CASCADING ENDPOINTS
// =====================================================

/**
 * POST /api/departments/cascade-notifications/:eventId
 * Cascade notifications for an event to all dependent departments
 */
router.post(
  "/cascade-notifications/:eventId",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { sourceDepartmentId } = req.body;

      if (!sourceDepartmentId) {
        return res.status(400).json({
          success: false,
          error: "Missing sourceDepartmentId",
          timestamp: new Date().toISOString(),
        });
      }

      const cascaded =
        await departmentNotificationCascader.cascadeNotificationForEvent(
          eventId,
          sourceDepartmentId,
          res.locals.orgId,
        );

      res.json({
        success: true,
        data: {
          cascadedCount: cascaded.length,
          notifications: cascaded,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[DeptRelationships] Cascade failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to cascade notifications",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/departments/notification-queue/:eventId
 * Get notification queue status for an event
 */
router.get(
  "/notification-queue/:eventId",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const result = await db.query(
        `
        SELECT
          dnq.id,
          od.name as target_department,
          dnq.notification_status,
          dnq.approval_required,
          dnq.approval_status,
          dnq.notification_sent_at,
          dnq.acknowledged_at,
          dnq.cascade_level
        FROM department_notification_queue dnq
        JOIN organization_departments od ON dnq.target_department_id = od.id
        WHERE dnq.event_id = $1
        ORDER BY dnq.cascade_level ASC, od.name ASC
      `,
        [eventId],
      );

      res.json({
        success: true,
        data: {
          queue: result.rows,
          total: result.rows.length,
          statuses: {
            notified: result.rows.filter(
              (r) => r.notification_status === "notified",
            ).length,
            acknowledged: result.rows.filter(
              (r) => r.notification_status === "acknowledged",
            ).length,
            escalated: result.rows.filter(
              (r) => r.notification_status === "escalated",
            ).length,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[DeptRelationships] Failed to get notification queue:",
        error,
      );
      res.status(500).json({
        success: false,
        error: "Failed to fetch notification queue",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/departments/acknowledge-notification/:eventId
 * Acknowledge a notification from a department
 */
router.post(
  "/acknowledge-notification/:eventId",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { departmentId } = req.body;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          error: "Missing departmentId",
          timestamp: new Date().toISOString(),
        });
      }

      const success =
        await departmentNotificationCascader.acknowledgeDepartmentNotification(
          eventId,
          departmentId,
          res.locals.userId,
        );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Notification not found or already acknowledged",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { acknowledged: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[DeptRelationships] Failed to acknowledge:", error);
      res.status(500).json({
        success: false,
        error: "Failed to acknowledge",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/departments/approval-status/:eventId
 * Get approval status across departments
 */
router.get("/approval-status/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const status =
      await departmentNotificationCascader.getApprovalStatus(eventId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[DeptRelationships] Failed to get approval status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch approval status",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/departments/submit-approval/:eventId
 * Submit approval/rejection from a department
 */
router.post(
  "/submit-approval/:eventId",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { departmentId, approved } = req.body;

      if (!departmentId || approved === undefined) {
        return res.status(400).json({
          success: false,
          error: "Missing departmentId or approved",
          timestamp: new Date().toISOString(),
        });
      }

      const success = await departmentNotificationCascader.submitApproval(
        eventId,
        departmentId,
        approved,
        res.locals.userId,
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Approval request not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          approved,
          eventId,
          departmentId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[DeptRelationships] Failed to submit approval:", error);
      res.status(500).json({
        success: false,
        error: "Failed to submit approval",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/departments/cascade-history/:eventId
 * Get cascade notification history for an event
 */
router.get("/cascade-history/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const history =
      await departmentNotificationCascader.getCascadeHistory(eventId);

    res.json({
      success: true,
      data: {
        history,
        total: history.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[DeptRelationships] Failed to get cascade history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch cascade history",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
