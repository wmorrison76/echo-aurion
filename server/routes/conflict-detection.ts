/**
 * Conflict Detection API Routes
 * Analyze cross-department conflicts, get impact scores, and find alternative time slots
 */

import { Router, Request, Response } from "express";
import { crossDepartmentConflictAnalyzer } from "../services/cross-department-conflict-analyzer";
import { logger } from "../lib/logger";
import { Database } from "../lib/database-client";
import { requireAuth } from "../middleware/auth";

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

router.use(requireAuth, verifyOrgContext);

// =====================================================
// CONFLICT ANALYSIS ENDPOINTS
// =====================================================

/**
 * POST /api/conflict-detection/analyze/:eventId
 * Analyze an event for cross-department conflicts
 */
router.post("/analyze/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify event exists and belongs to org
    const eventResult = await db.query(
      `
      SELECT id FROM calendar_events
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

    // Run analysis
    const analysis =
      await crossDepartmentConflictAnalyzer.analyzeEventConflicts(eventId);

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[ConflictDetection] Analysis failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/conflict-detection/events/:eventId/conflicts
 * Get all conflicts for an event with department breakdown
 */
router.get(
  "/events/:eventId/conflicts",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const result = await db.query(
        `
      SELECT
        cc.id,
        cc.conflict_type,
        cc.severity,
        cc.affected_departments,
        cc.affected_staff_count,
        cc.impact_score,
        cc.conflict_breakdown,
        ce1.title as event_1_title,
        ce2.title as event_2_title,
        ce1.start_time as event_1_start,
        ce2.start_time as event_2_start,
        cc.is_hard_locked
      FROM calendar_conflicts cc
      LEFT JOIN calendar_events ce1 ON cc.event_id_1 = ce1.id
      LEFT JOIN calendar_events ce2 ON cc.event_id_2 = ce2.id
      WHERE (cc.event_id_1 = $1 OR cc.event_id_2 = $1)
        AND ce1.org_id = $2
      ORDER BY cc.impact_score DESC
    `,
        [eventId, res.locals.orgId],
      );

      res.json({
        success: true,
        data: {
          conflicts: result.rows,
          totalConflicts: result.rows.length,
          totalImpactScore: result.rows.reduce(
            (sum, c) => sum + (c.impact_score || 0),
            0,
          ),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[ConflictDetection] Failed to get conflicts:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch conflicts",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/conflict-detection/events/:eventId/affected-staff
 * Get list of staff affected by conflicts
 */
router.get(
  "/events/:eventId/affected-staff",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const result = await db.query(
        `
        SELECT DISTINCT
          cfas.employee_id,
          ep.first_name,
          ep.last_name,
          ep.department as primary_department,
          cfas.secondary_department,
          cfas.conflict_type,
          cfas.severity,
          ce1.title as primary_event,
          ce2.title as conflicting_event
        FROM calendar_conflict_affected_staff cfas
        LEFT JOIN employee_profiles ep ON cfas.employee_id = ep.id
        LEFT JOIN calendar_events ce1 ON cfas.primary_event_id = ce1.id
        LEFT JOIN calendar_events ce2 ON cfas.secondary_event_id = ce2.id
        JOIN calendar_conflicts cc ON cfas.conflict_id = cc.id
        WHERE (cc.event_id_1 = $1 OR cc.event_id_2 = $1)
          AND ce1.org_id = $2
        ORDER BY cfas.severity DESC, ep.last_name ASC
      `,
        [eventId, res.locals.orgId],
      );

      res.json({
        success: true,
        data: {
          affectedStaff: result.rows,
          total: result.rows.length,
          bySeverity: {
            critical: result.rows.filter((r) => r.severity === "critical")
              .length,
            warning: result.rows.filter((r) => r.severity === "warning").length,
            low: result.rows.filter((r) => r.severity === "low").length,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[ConflictDetection] Failed to get affected staff:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch affected staff",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/conflict-detection/events/:eventId/alternatives
 * Get suggested alternative time slots
 */
router.get(
  "/events/:eventId/alternatives",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const result = await db.query(
        `
        SELECT
          cca.id,
          cca.suggested_start_time,
          cca.suggested_end_time,
          cca.estimated_conflict_count,
          cca.estimated_affected_staff,
          cca.estimated_impact_score,
          cca.affected_departments_reduction,
          cca.estimated_savings_percent,
          cca.reasoning,
          cca.approved_at
        FROM calendar_conflict_alternatives cca
        WHERE cca.event_id = $1
          AND cca.approved_at IS NULL
        ORDER BY cca.estimated_impact_score ASC, cca.estimated_savings_percent DESC
      `,
        [eventId],
      );

      res.json({
        success: true,
        data: {
          alternatives: result.rows,
          bestOption: result.rows[0] || null,
          totalAlternatives: result.rows.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[ConflictDetection] Failed to get alternatives:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch alternatives",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/conflict-detection/events/:eventId/apply-alternative
 * Apply a suggested alternative time slot
 */
router.post(
  "/events/:eventId/apply-alternative",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { alternativeId } = req.body;

      if (!alternativeId) {
        return res.status(400).json({
          success: false,
          error: "Missing alternativeId",
          timestamp: new Date().toISOString(),
        });
      }

      // Get the alternative
      const altResult = await db.query(
        `
        SELECT * FROM calendar_conflict_alternatives
        WHERE id = $1 AND event_id = $2
      `,
        [alternativeId, eventId],
      );

      if (altResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Alternative not found",
          timestamp: new Date().toISOString(),
        });
      }

      const alternative = altResult.rows[0];

      // Update event with new time
      await db.query(
        `
        UPDATE calendar_events
        SET start_time = $2,
            end_time = $3,
            date = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
        [
          eventId,
          alternative.suggested_start_time,
          alternative.suggested_end_time,
          alternative.suggested_date,
        ],
      );

      // Mark alternative as applied
      await db.query(
        `
        UPDATE calendar_conflict_alternatives
        SET approved_by_user_id = $2,
            approved_at = NOW(),
            applied_at = NOW()
        WHERE id = $1
      `,
        [alternativeId, res.locals.userId],
      );

      res.json({
        success: true,
        data: {
          eventId,
          newStartTime: alternative.suggested_start_time,
          newEndTime: alternative.suggested_end_time,
          estimatedImpactScore: alternative.estimated_impact_score,
          conflictReduction: alternative.estimated_savings_percent,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[ConflictDetection] Failed to apply alternative:", error);
      res.status(500).json({
        success: false,
        error: "Failed to apply alternative",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/conflict-detection/events/:eventId/hard-lock
 * Apply hard lock to prevent conflicting shifts
 */
router.post(
  "/events/:eventId/hard-lock",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: "Missing reason for hard lock",
          timestamp: new Date().toISOString(),
        });
      }

      const success = await crossDepartmentConflictAnalyzer.applyHardLock(
        eventId,
        reason,
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Event or conflict not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          eventId,
          hardLocked: true,
          reason,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[ConflictDetection] Failed to apply hard lock:", error);
      res.status(500).json({
        success: false,
        error: "Failed to apply hard lock",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/conflict-detection/prevention-rules
 * Get all conflict prevention rules for organization
 */
router.get("/prevention-rules", async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        rule_name,
        rule_type,
        applies_to_departments,
        applies_to_roles,
        rule_value,
        enforcement_level,
        is_active
      FROM calendar_conflict_prevention_rules
      WHERE org_id = $1
      ORDER BY rule_type, rule_name ASC
    `,
      [res.locals.orgId],
    );

    res.json({
      success: true,
      data: {
        rules: result.rows,
        totalRules: result.rows.length,
        activeRules: result.rows.filter((r) => r.is_active).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[ConflictDetection] Failed to get prevention rules:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch prevention rules",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
