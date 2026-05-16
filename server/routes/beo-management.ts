import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { beoManagementService } from "../services/beo-management.js";
import { calendarChangeFeedService } from "../services/calendar-change-feed.js";
import { logger } from "../lib/logger.js";

export const router = express.Router();

// Middleware to ensure org_id is available
router.use(requireAuth);

// ==================== BEO CRUD ENDPOINTS ====================

/**
 * POST /api/beo/create
 * Create a new BEO for an event
 * Supports new enhanced BEO numbering with event types
 */
router.post("/create", async (req, res) => {
  try {
    const {
      eventId,
      departmentId,
      contentData,
      outletId,
      eventDate,
      eventTypeCode,
    } = req.body;
    const orgId = req.user?.org_id;
    const userId = req.user?.sub;

    if (!eventId || !departmentId || !contentData) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: eventId, departmentId, contentData",
      });
    }

    if (!orgId || !userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const beo = await beoManagementService.createBEO({
      orgId,
      eventId,
      outletId,
      eventDate,
      eventTypeCode,
      departmentId,
      contentData,
      createdByUserId: userId,
    });

    res.json({
      success: true,
      data: beo,
    });
  } catch (error) {
    logger.error("[API] Error creating BEO", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/beo/:beoId
 * Get BEO by ID with full details
 */
router.get("/:beoId", async (req, res) => {
  try {
    const { beoId } = req.params;

    const beo = await beoManagementService.getBEO(beoId);

    if (!beo) {
      return res.status(404).json({
        success: false,
        error: "BEO not found",
      });
    }

    // Check authorization
    if (beo.orgId !== req.user?.org_id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    res.json({
      success: true,
      data: beo,
    });
  } catch (error) {
    logger.error("[API] Error fetching BEO", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/beo/:beoId
 * Update BEO content
 */
router.patch("/:beoId", async (req, res) => {
  try {
    const { beoId } = req.params;
    const { contentData, changeSummary } = req.body;
    const userId = req.user?.sub;

    if (!contentData || !changeSummary) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: contentData, changeSummary",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const beo = await beoManagementService.getBEO(beoId);

    if (!beo) {
      return res.status(404).json({
        success: false,
        error: "BEO not found",
      });
    }

    // Check authorization
    if (beo.orgId !== req.user?.org_id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const updatedBEO = await beoManagementService.updateBEO(beoId, {
      contentData,
      changeSummary,
      userId,
    });

    // Notify Maestro of change
    await calendarChangeFeedService.notifyMaestroOnBEOUpdate(
      beoId,
      "updated",
      contentData,
    );

    res.json({
      success: true,
      data: updatedBEO,
    });
  } catch (error) {
    logger.error("[API] Error updating BEO", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/beo/:beoId/approve
 * Approve a BEO for execution
 */
router.post("/:beoId/approve", async (req, res) => {
  try {
    const { beoId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const beo = await beoManagementService.getBEO(beoId);

    if (!beo) {
      return res.status(404).json({
        success: false,
        error: "BEO not found",
      });
    }

    // Check authorization
    if (beo.orgId !== req.user?.org_id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const approvedBEO = await beoManagementService.approveBEO(beoId, {
      userId,
    });

    // Notify Maestro of approval
    await calendarChangeFeedService.notifyMaestroOnBEOUpdate(beoId, "approved");

    res.json({
      success: true,
      data: approvedBEO,
    });
  } catch (error) {
    logger.error("[API] Error approving BEO", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// ==================== VERSION MANAGEMENT ====================

/**
 * GET /api/beo/:beoId/versions
 * Get all versions of a BEO
 */
router.get("/:beoId/versions", async (req, res) => {
  try {
    const { beoId } = req.params;

    const beo = await beoManagementService.getBEO(beoId);

    if (!beo) {
      return res.status(404).json({
        success: false,
        error: "BEO not found",
      });
    }

    // Check authorization
    if (beo.orgId !== req.user?.org_id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const versions = await beoManagementService.getBEOVersions(beoId);

    res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    logger.error("[API] Error fetching BEO versions", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/beo/:beoId/version/:versionNumber
 * Get specific version of a BEO
 */
router.get("/:beoId/version/:versionNumber", async (req, res) => {
  try {
    const { beoId, versionNumber } = req.params;

    const beo = await beoManagementService.getBEO(beoId);

    if (!beo) {
      return res.status(404).json({
        success: false,
        error: "BEO not found",
      });
    }

    // Check authorization
    if (beo.orgId !== req.user?.org_id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const version = await beoManagementService.getBEOVersion(
      beoId,
      parseInt(versionNumber, 10),
    );

    if (!version) {
      return res.status(404).json({
        success: false,
        error: "Version not found",
      });
    }

    res.json({
      success: true,
      data: version,
    });
  } catch (error) {
    logger.error("[API] Error fetching BEO version", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/beo/:beoId/restore/:versionNumber
 * Restore BEO to specific version
 */
router.post("/:beoId/restore/:versionNumber", async (req, res) => {
  try {
    const { beoId, versionNumber } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const beo = await beoManagementService.getBEO(beoId);

    if (!beo) {
      return res.status(404).json({
        success: false,
        error: "BEO not found",
      });
    }

    // Check authorization
    if (beo.orgId !== req.user?.org_id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const restoredBEO = await beoManagementService.restoreBEOVersion(
      beoId,
      parseInt(versionNumber, 10),
      userId,
    );

    res.json({
      success: true,
      data: restoredBEO,
    });
  } catch (error) {
    logger.error("[API] Error restoring BEO version", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// ==================== PDF MANAGEMENT ====================

/**
 * POST /api/beo/:beoId/export-pdf
 * Generate and export BEO as PDF
 */
router.post("/:beoId/export-pdf", async (req, res) => {
  try {
    const { beoId } = req.params;

    const beo = await beoManagementService.getBEO(beoId);

    if (!beo) {
      return res.status(404).json({
        success: false,
        error: "BEO not found",
      });
    }

    // Check authorization
    if (beo.orgId !== req.user?.org_id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const pdfPath = await beoManagementService.generateAndStorePDF(beoId);

    res.json({
      success: true,
      data: {
        pdfPath,
        downloadUrl: `/api/beo/${beoId}/download-pdf`,
      },
    });
  } catch (error) {
    logger.error("[API] Error exporting PDF", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// ==================== CHANGE FEED ====================

/**
 * GET /api/beo/:beoId/changes
 * Get change feed for a BEO
 */
router.get("/:beoId/changes", async (req, res) => {
  try {
    const { beoId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const beo = await beoManagementService.getBEO(beoId);

    if (!beo) {
      return res.status(404).json({
        success: false,
        error: "BEO not found",
      });
    }

    // Check authorization
    if (beo.orgId !== req.user?.org_id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const changes = await calendarChangeFeedService.getBEOChangeFeedWithUsers(
      beoId,
      limit,
    );

    res.json({
      success: true,
      data: changes,
    });
  } catch (error) {
    logger.error("[API] Error fetching change feed", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// ==================== LIST ENDPOINTS ====================

/**
 * GET /api/beo/event/:eventId
 * Get all BEOs for an event
 */
router.get("/event/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    const beos = await beoManagementService.getBEOsByEvent(eventId);

    // Filter by org
    const filtered = beos.filter((b) => b.orgId === req.user?.org_id);

    res.json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    logger.error("[API] Error fetching event BEOs", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/beo/department/:departmentId
 * Get all BEOs for a department
 */
router.get("/department/:departmentId", async (req, res) => {
  try {
    const { departmentId } = req.params;
    const orgId = req.user?.org_id;
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const beos = await beoManagementService.getBEOsByDepartment(
      orgId,
      departmentId,
      status,
      limit,
    );

    res.json({
      success: true,
      data: beos,
    });
  } catch (error) {
    logger.error("[API] Error fetching department BEOs", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// ==================== EVENT TYPES ====================

/**
 * GET /api/beo/event-types
 * Get all event types for the organization
 */
router.get("/event-types/list", async (req, res) => {
  try {
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const { db } = await import("../db.js");
    const result = await db.query(
      `
      SELECT
        id,
        code,
        label,
        description,
        color,
        icon,
        is_active,
        sort_order
      FROM event_types
      WHERE org_id = $1 AND is_active = true
      ORDER BY sort_order ASC
      `,
      [orgId],
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error("[API] Error fetching event types", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// ==================== OUTLET GL CODES ====================

/**
 * GET /api/beo/outlets/:outletId/gl-code
 * Get GL code for an outlet
 */
router.get("/outlets/:outletId/gl-code", async (req, res) => {
  try {
    const { outletId } = req.params;
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const { db } = await import("../db.js");
    const result = await db.query(
      `
      SELECT
        id,
        gl_code,
        gl_account_code
      FROM outlet_gl_codes
      WHERE org_id = $1 AND outlet_id = $2
      `,
      [orgId, outletId],
    );

    const glCode = result.rows[0] || {
      id: null,
      gl_code: "0",
      gl_account_code: null,
    };

    res.json({
      success: true,
      data: glCode,
    });
  } catch (error) {
    logger.error("[API] Error fetching outlet GL code", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/beo/outlets/:outletId/gl-code
 * Set GL code for an outlet
 */
router.post("/outlets/:outletId/gl-code", async (req, res) => {
  try {
    const { outletId } = req.params;
    const { glCode, glAccountCode } = req.body;
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    if (!glCode) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: glCode",
      });
    }

    const { db } = await import("../db.js");
    const result = await db.query(
      `
      INSERT INTO outlet_gl_codes (org_id, outlet_id, gl_code, gl_account_code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (org_id, outlet_id)
      DO UPDATE SET
        gl_code = $3,
        gl_account_code = $4,
        updated_at = NOW()
      RETURNING id, gl_code, gl_account_code
      `,
      [orgId, outletId, glCode, glAccountCode || null],
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error("[API] Error setting outlet GL code", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});
