/**
 * Mandatory Events API Routes
 * Endpoints for creating mandatory events, tracking acknowledgments, and enforcement
 */

import { Router, Request, Response } from "express";
import { mandatoryEventService } from "../services/mandatory-event-service";
import { calendarService } from "../services/EnterpriseCalendarService";
import { logger } from "../lib/logger";

const router = Router();

// =====================================================
// MIDDLEWARE
// =====================================================

const verifyOrgContext = (req: Request, res: Response, next: Function) => {
  const userId = req.user?.id;
  const orgId = req.user?.org_id;

  if (!userId || !orgId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized - missing context",
      timestamp: new Date().toISOString(),
    });
  }

  res.locals.userId = userId;
  res.locals.orgId = orgId;
  next();
};

router.use(verifyOrgContext);

// =====================================================
// MANDATORY EVENTS ENDPOINTS
// =====================================================

/**
 * POST /api/mandatory-events
 * Create a new mandatory event with department dependencies
 *
 * Body:
 * {
 *   "event_id": "uuid",
 *   "departments": [
 *     {
 *       "name": "Culinary",
 *       "isPrimaryOrganizer": true,
 *       "requiredRole": "ALL_STAFF",
 *       "notificationType": "email_and_in_app"
 *     }
 *   ],
 *   "enforcementPolicy": "block_checkin",
 *   "enforcementEnabled": true
 * }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { event_id, departments, enforcementPolicy, enforcementEnabled } =
      req.body;

    if (!event_id || !departments || !Array.isArray(departments)) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: event_id, departments[]",
        timestamp: new Date().toISOString(),
      });
    }

    // Verify event exists
    const event = await calendarService.getEvent(event_id, res.locals.userId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Create mandatory event
    const success = await mandatoryEventService.createMandatoryEvent({
      eventId: event_id,
      orgId: res.locals.orgId,
      createdBy: res.locals.userId,
      departments: departments.map((d: any) => ({
        name: d.name,
        isPrimaryOrganizer: d.isPrimaryOrganizer || false,
        requiredRole: d.requiredRole || "ALL_STAFF",
        notificationType: d.notificationType || "email_and_in_app",
        reminderHoursBefore: d.reminderHoursBefore || 24,
        autoEscalateAfterHours: d.autoEscalateAfterHours || 48,
      })),
      enforcementPolicy: enforcementPolicy || "notify",
      enforcementEnabled: enforcementEnabled !== false,
    });

    if (!success) {
      throw new Error("Failed to create mandatory event");
    }

    res.status(201).json({
      success: true,
      data: {
        event_id,
        message: "Mandatory event created with department dependencies",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MandatoryEvents] Error creating mandatory event:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create mandatory event",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events/:eventId/acknowledgment-status
 * Get acknowledgment status for a mandatory event
 */
router.get(
  "/:eventId/acknowledgment-status",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const status =
        await mandatoryEventService.getAcknowledgmentStatus(eventId);

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[MandatoryEvents] Error getting acknowledgment status:",
        error,
      );
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get status",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/mandatory-events/:eventId/escalate
 * Trigger escalation for unacknowledged items
 */
router.post("/:eventId/escalate", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const escalatedCount =
      await mandatoryEventService.triggerEscalation(eventId);

    res.json({
      success: true,
      data: {
        escalatedCount,
        message: `${escalatedCount} items escalated to managers`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MandatoryEvents] Error triggering escalation:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to escalate",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// ACKNOWLEDGMENT ENDPOINTS
// =====================================================

/**
 * POST /api/mandatory-events/:eventId/acknowledge
 * Record acknowledgment for the current user
 */
router.post("/:eventId/acknowledge", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { method } = req.body;

    const success = await mandatoryEventService.recordAcknowledgment(
      eventId,
      res.locals.userId,
      method || "in_app",
    );

    if (!success) {
      return res.status(400).json({
        success: false,
        error: "Acknowledgment not found or already acknowledged",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        message: "Acknowledgment recorded",
        eventId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MandatoryEvents] Error recording acknowledgment:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to acknowledge",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events/pending
 * Get pending mandatory events for current user
 */
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const Database = (await import("../lib/database-client")).Database;
    const db = new Database();

    const result = await db.query(
      `
      SELECT DISTINCT
        ce.id, ce.title, ce.start_time, ce.end_time,
        ce.description, ceaq.status, ceaq.acknowledgment_deadline
      FROM calendar_event_acknowledgment_queue ceaq
      JOIN calendar_events ce ON ceaq.event_id = ce.id
      WHERE ceaq.employee_id = $1
        AND ceaq.status IN ('pending', 'escalated')
        AND ce.start_time > NOW()
      ORDER BY ce.start_time ASC
      LIMIT 50
    `,
      [res.locals.userId],
    );

    res.json({
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MandatoryEvents] Error fetching pending events:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch pending events",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events/:eventId/clock-in-check
 * Check if user can clock in (enforcement check)
 */
router.get("/:eventId/clock-in-check", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const result = await mandatoryEventService.canUserClockIn(
      res.locals.userId,
      eventId,
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "[MandatoryEvents] Error checking clock-in permission:",
      error,
    );
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check permission",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events/:eventId/departments
 * Get department dependencies for a mandatory event
 */
router.get("/:eventId/departments", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const Database = (await import("../lib/database-client")).Database;
    const db = new Database();

    const result = await db.query(
      `
      SELECT * FROM calendar_event_department_dependencies
      WHERE event_id = $1
      ORDER BY is_primary_organizer DESC, department ASC
    `,
      [eventId],
    );

    res.json({
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "[MandatoryEvents] Error fetching department dependencies:",
      error,
    );
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch dependencies",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
