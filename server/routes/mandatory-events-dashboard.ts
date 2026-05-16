/**
 * Mandatory Events Dashboard Route
 * Provides manager/admin visibility into mandatory event acknowledgment status
 * Shows real-time status, escalation alerts, and enforcement metrics
 */

import { Router, Request, Response } from "express";
import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

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

router.use(verifyOrgContext);

// =====================================================
// DASHBOARD ENDPOINTS
// =====================================================

/**
 * GET /api/mandatory-events-dashboard/summary
 * Get high-level summary of all mandatory events and acknowledgments
 */
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `
      SELECT
        COUNT(DISTINCT ce.id) as total_mandatory_events,
        COUNT(DISTINCT CASE WHEN ce.start_time > NOW() THEN ce.id END) as upcoming_events,
        SUM(CASE WHEN ceaq.status = 'pending' THEN 1 ELSE 0 END) as total_pending_acks,
        SUM(CASE WHEN ceaq.status = 'escalated' THEN 1 ELSE 0 END) as total_escalated_acks,
        SUM(CASE WHEN ceaq.status = 'acknowledged' THEN 1 ELSE 0 END) as total_acknowledged,
        ROUND(
          100.0 * COUNT(CASE WHEN ceaq.status = 'acknowledged' THEN 1 END) / 
          NULLIF(COUNT(*), 0), 1
        ) as overall_acknowledgment_percent
      FROM calendar_events ce
      LEFT JOIN calendar_event_acknowledgment_queue ceaq ON ce.id = ceaq.event_id
      WHERE ce.org_id = $1 AND ce.is_mandatory = true
    `,
      [res.locals.orgId],
    );

    const summary = result.rows[0];

    res.json({
      success: true,
      data: {
        ...summary,
        metric_interpretation: {
          pending: `${summary.total_pending_acks} staff still need to acknowledge`,
          escalated: `${summary.total_escalated_acks} items escalated to managers`,
          acknowledged: `${summary.total_acknowledged} staff acknowledged (${summary.overall_acknowledgment_percent}%)`,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Dashboard] Error fetching summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch summary",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events-dashboard/upcoming
 * List upcoming mandatory events with acknowledgment progress
 */
router.get("/upcoming", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await db.query(
      `
      SELECT
        ce.id,
        ce.title,
        ce.start_time,
        ce.end_time,
        ce.department,
        ce.enforcement_policy,
        COUNT(ceaq.id) as total_required,
        SUM(CASE WHEN ceaq.status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledged_count,
        SUM(CASE WHEN ceaq.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN ceaq.status = 'escalated' THEN 1 ELSE 0 END) as escalated_count,
        ROUND(
          100.0 * SUM(CASE WHEN ceaq.status = 'acknowledged' THEN 1 ELSE 0 END) /
          NULLIF(COUNT(ceaq.id), 0), 1
        ) as acknowledgment_percent
      FROM calendar_events ce
      LEFT JOIN calendar_event_acknowledgment_queue ceaq ON ce.id = ceaq.event_id
      WHERE ce.org_id = $1 AND ce.is_mandatory = true AND ce.start_time > NOW()
      GROUP BY ce.id, ce.title, ce.start_time, ce.end_time, ce.department, ce.enforcement_policy
      ORDER BY ce.start_time ASC
      LIMIT $2 OFFSET $3
    `,
      [res.locals.orgId, limit, offset],
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { limit, offset, count: result.rows.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Dashboard] Error fetching upcoming events:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch upcoming events",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events-dashboard/events/:eventId/status
 * Get detailed acknowledgment status for a specific event
 */
router.get("/events/:eventId/status", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Get event details
    const eventResult = await db.query(
      `
      SELECT id, title, start_time, end_time, enforcement_policy
      FROM calendar_events
      WHERE id = $1 AND org_id = $2
    `,
      [eventId, res.locals.orgId],
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        timestamp: new Date().toISOString(),
      });
    }

    const event = eventResult.rows[0];

    // Get acknowledgment stats by department
    const deptResult = await db.query(
      `
      SELECT
        department,
        status,
        COUNT(*) as count,
        ARRAY_AGG(DISTINCT required_role) as roles
      FROM calendar_event_acknowledgment_queue
      WHERE event_id = $1
      GROUP BY department, status
      ORDER BY department, status
    `,
      [eventId],
    );

    // Get escalated items with manager info
    const escalatedResult = await db.query(
      `
      SELECT
        ceaq.id,
        ceaq.employee_id,
        ceaq.department,
        ceaq.required_role,
        ceaq.escalation_target_id,
        ep.first_name,
        ep.last_name,
        ep.position_title,
        em.first_name as mgr_first_name,
        em.last_name as mgr_last_name
      FROM calendar_event_acknowledgment_queue ceaq
      LEFT JOIN employee_profiles ep ON ceaq.employee_id = ep.id
      LEFT JOIN employee_profiles em ON ceaq.escalation_target_id = em.id
      WHERE ceaq.event_id = $1 AND ceaq.status = 'escalated'
      ORDER BY ceaq.department, ep.last_name
    `,
      [eventId],
    );

    // Build department summary
    const byDepartment: Record<
      string,
      {
        total: number;
        acknowledged: number;
        pending: number;
        escalated: number;
      }
    > = {};

    for (const row of deptResult.rows) {
      if (!byDepartment[row.department]) {
        byDepartment[row.department] = {
          total: 0,
          acknowledged: 0,
          pending: 0,
          escalated: 0,
        };
      }

      if (row.status === "acknowledged") {
        byDepartment[row.department].acknowledged += row.count;
      } else if (row.status === "pending") {
        byDepartment[row.department].pending += row.count;
      } else if (row.status === "escalated") {
        byDepartment[row.department].escalated += row.count;
      }

      byDepartment[row.department].total += row.count;
    }

    res.json({
      success: true,
      data: {
        event,
        by_department: byDepartment,
        escalated_items: escalatedResult.rows,
        summary: {
          total_required: Object.values(byDepartment).reduce(
            (sum, dept) => sum + dept.total,
            0,
          ),
          total_acknowledged: Object.values(byDepartment).reduce(
            (sum, dept) => sum + dept.acknowledged,
            0,
          ),
          total_pending: Object.values(byDepartment).reduce(
            (sum, dept) => sum + dept.pending,
            0,
          ),
          total_escalated: Object.values(byDepartment).reduce(
            (sum, dept) => sum + dept.escalated,
            0,
          ),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Dashboard] Error fetching event status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch event status",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events-dashboard/my-pending
 * Get pending mandatory events for current user (employee view)
 */
router.get("/my-pending", async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `
      SELECT
        ce.id,
        ce.title,
        ce.start_time,
        ce.end_time,
        ce.description,
        ceaq.status,
        ceaq.created_at as queue_created_at,
        ceaq.acknowledgment_deadline,
        EXTRACT(EPOCH FROM (ceaq.acknowledgment_deadline - NOW())) / 3600 as hours_until_deadline
      FROM calendar_event_acknowledgment_queue ceaq
      JOIN calendar_events ce ON ceaq.event_id = ce.id
      WHERE ceaq.employee_id = $1
        AND ceaq.status IN ('pending', 'escalated')
        AND ce.start_time > NOW()
      ORDER BY ce.start_time ASC
    `,
      [res.locals.userId],
    );

    res.json({
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Dashboard] Error fetching my pending events:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending events",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events-dashboard/my-team
 * Get pending acknowledgments for current user's team/department
 */
router.get("/my-team", async (req: Request, res: Response) => {
  try {
    // Get current user's department/team
    const userResult = await db.query(
      `
      SELECT department FROM employee_profiles WHERE id = $1
    `,
      [res.locals.userId],
    );

    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
    }

    const userDepartment = userResult.rows[0].department;

    // Get team's pending acknowledgments
    const result = await db.query(
      `
      SELECT
        ce.id as event_id,
        ce.title as event_title,
        ce.start_time,
        ce.end_time,
        ceaq.employee_id,
        ep.first_name,
        ep.last_name,
        ep.position_title,
        ceaq.status,
        ceaq.acknowledged_at,
        CASE WHEN ceaq.status = 'pending' THEN
          EXTRACT(EPOCH FROM (ce.start_time - NOW())) / 3600
        ELSE 0 END as hours_until_event
      FROM calendar_event_acknowledgment_queue ceaq
      JOIN calendar_events ce ON ceaq.event_id = ce.id
      JOIN employee_profiles ep ON ceaq.employee_id = ep.id
      WHERE ceaq.department = $1
        AND ceaq.status IN ('pending', 'escalated')
        AND ce.start_time > NOW()
      ORDER BY ce.start_time ASC, ep.last_name ASC
    `,
      [userDepartment],
    );

    res.json({
      success: true,
      data: {
        department: userDepartment,
        pending_items: result.rows,
        total_pending: result.rows.filter((r) => r.status === "pending").length,
        total_escalated: result.rows.filter((r) => r.status === "escalated")
          .length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Dashboard] Error fetching team status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch team status",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/mandatory-events-dashboard/enforcement-log
 * Get enforcement action audit log
 */
router.get("/enforcement-log", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const eventFilter = req.query.event_id as string;

    let query = `
      SELECT
        ceea.id,
        ceea.event_id,
        ceea.employee_id,
        ceea.enforcement_action,
        ceea.enforcement_reason,
        ceea.action_timestamp,
        ce.title as event_title,
        ep.first_name,
        ep.last_name
      FROM calendar_event_enforcement_audit ceea
      JOIN calendar_events ce ON ceea.event_id = ce.id
      LEFT JOIN employee_profiles ep ON ceea.employee_id = ep.id
      WHERE ce.org_id = $1
    `;

    const params: any[] = [res.locals.orgId];

    if (eventFilter) {
      query += ` AND ceea.event_id = $2`;
      params.push(eventFilter);
    }

    query += ` ORDER BY ceea.action_timestamp DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Dashboard] Error fetching enforcement log:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch enforcement log",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
