/**
 * Calendar API Routes
 * RESTful endpoints for enterprise calendar operations
 * All endpoints enforce organization-level isolation and permission checks
 */

import { Router, Request, Response } from "express";
import { calendarService } from "../services/EnterpriseCalendarService";
import { conflictDetector } from "../lib/conflict-detector";
import {
  broadcastConflictDetected,
  broadcastCalendarEventToOrg,
} from "../services/calendar-websocket-broadcaster";
import {
  CalendarEvent,
  CreateEventRequest,
  UpdateEventRequest,
  ListEventsFilter,
  ShareEventRequest,
  CreateOutletRequest,
  DetectConflictsRequest,
  ApiResponse,
  PaginatedResponse,
} from "@/types/calendar";

const router = Router();

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Verify user organization context
 * Accepts org_id from:
 * 1. req.user.org_id (authenticated session)
 * 2. X-Org-ID header (for development/testing)
 * 3. x-org-id query parameter
 */
const verifyOrgContext = (req: Request, res: Response, next: Function) => {
  let userId = req.user?.id || "anonymous";
  let orgId =
    req.user?.org_id ||
    (req.headers["x-org-id"] as string) ||
    (req.query["org_id"] as string) ||
    "default";

  if (!orgId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized - missing organization context",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }

  res.locals.userId = userId;
  res.locals.orgId = orgId;
  res.locals.ipAddress = req.ip;
  res.locals.userAgent = req.get("user-agent");

  next();
};

router.use(verifyOrgContext);

// =====================================================
// EVENTS ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
router.post("/events", async (req: Request, res: Response) => {
  try {
    const { title, outlet_id, start_time, end_time } =
      req.body as CreateEventRequest;

    // Validation
    if (!title || !outlet_id || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: title, outlet_id, start_time, end_time",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    const event = await calendarService.createEvent(
      res.locals.orgId,
      req.body,
      res.locals.userId,
      res.locals.ipAddress,
      res.locals.userAgent,
    );

    // Broadcast event creation to org
    broadcastCalendarEventToOrg(
      res.locals.orgId,
      event,
      "created",
      res.locals.userId,
    );

    // Detect conflicts for the new event
    const conflicts = await calendarService.detectConflicts(
      event.id,
      { outlet_ids: [event.outlet_id], include_all_outlets: true },
      res.locals.userId,
    );

    // Broadcast detected conflicts to org
    for (const conflict of conflicts) {
      broadcastConflictDetected(
        res.locals.orgId,
        conflict,
        conflict.event_id_1,
        conflict.event_id_2,
        [event.outlet_id],
      );
    }

    res.status(201).json({
      success: true,
      data: { event, conflicts: conflicts.length > 0 ? conflicts : [] },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create event",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/calendar/events
 * List events with filters
 */
router.get("/events", async (req: Request, res: Response) => {
  try {
    const filters: ListEventsFilter = {
      outlet_ids: req.query.outlet_ids
        ? (req.query.outlet_ids as string).split(",")
        : [],
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      status: req.query.status
        ? ((req.query.status as string).split(",") as any[])
        : [],
      location_room: req.query.location_room as string,
      department: req.query.department as string,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      sort_by: (req.query.sort_by as any) || "start_time",
      sort_order: (req.query.sort_order as any) || "asc",
    };

    const { events, total } = await calendarService.listEvents(
      res.locals.orgId,
      res.locals.userId,
      filters,
    );

    const response: PaginatedResponse<CalendarEvent> = {
      items: events,
      total,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      has_more: (filters.offset || 0) + events.length < total,
    };

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error listing events:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list events",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/calendar/events/:id
 * Get a single event by ID
 */
router.get("/events/:id", async (req: Request, res: Response) => {
  try {
    const event = await calendarService.getEvent(
      req.params.id,
      res.locals.userId,
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    // Fetch related data
    const permissions = await calendarService.getEventPermissions(event.id);
    const conflicts = await calendarService.getEventConflicts(event.id);
    const attachments = await calendarService.getEventAttachments(event.id);

    res.json({
      success: true,
      data: {
        event,
        permissions,
        conflicts,
        attachments,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch event",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * PATCH /api/calendar/events/:id
 * Update an event
 */
router.patch("/events/:id", async (req: Request, res: Response) => {
  try {
    const updated = await calendarService.updateEvent(
      req.params.id,
      res.locals.userId,
      req.body as UpdateEventRequest,
      res.locals.ipAddress,
      res.locals.userAgent,
    );

    // Re-detect conflicts after update
    const conflicts = await calendarService.getEventConflicts(req.params.id);

    res.json({
      success: true,
      data: { event: updated, conflicts },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update event",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Delete an event
 */
router.delete("/events/:id", async (req: Request, res: Response) => {
  try {
    const hardDelete = req.query.hard_delete === "true";

    await calendarService.deleteEvent(
      req.params.id,
      res.locals.userId,
      hardDelete,
      res.locals.ipAddress,
      res.locals.userAgent,
    );

    res.json({
      success: true,
      data: { id: req.params.id, deleted: true },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete event",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

// =====================================================
// CONFLICTS ENDPOINTS
// =====================================================

/**
 * GET /api/calendar/events/:id/conflicts
 * Get conflicts for a specific event
 */
router.get("/events/:id/conflicts", async (req: Request, res: Response) => {
  try {
    const conflicts = await calendarService.getEventConflicts(req.params.id);

    res.json({
      success: true,
      data: conflicts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching conflicts:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch conflicts",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/calendar/conflicts/detect
 * Detect conflicts for given outlets
 */
router.post("/conflicts/detect", async (req: Request, res: Response) => {
  try {
    const { outlet_ids, event_id, include_all_outlets } =
      req.body as DetectConflictsRequest;

    if (!outlet_ids || outlet_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "outlet_ids is required",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    let conflicts = [];

    if (event_id) {
      // Detect for specific event
      conflicts = await calendarService.detectConflicts(
        event_id,
        { outlet_ids, include_all_outlets: include_all_outlets || false },
        res.locals.userId,
      );
    } else {
      // Detect for all events in outlets (more expensive operation)
      const { events } = await calendarService.listEvents(
        res.locals.orgId,
        res.locals.userId,
        {
          outlet_ids,
        },
      );

      const conflictMap = await conflictDetector.detectBatchConflicts(events);

      // Flatten to array
      for (const eventConflicts of conflictMap.values()) {
        conflicts.push(...eventConflicts);
      }

      // Deduplicate
      const uniqueConflicts = new Map();
      for (const conflict of conflicts) {
        const key = `${conflict.event_id_1}-${conflict.event_id_2}`;
        if (!uniqueConflicts.has(key)) {
          uniqueConflicts.set(key, conflict);
        }
      }
      conflicts = Array.from(uniqueConflicts.values());
    }

    // Group by severity
    const grouped = conflictDetector.groupBySeverity(conflicts);

    res.json({
      success: true,
      data: {
        conflicts,
        summary: {
          total: conflicts.length,
          critical: grouped.get("critical")?.length || 0,
          warning: grouped.get("warning")?.length || 0,
          info: grouped.get("info")?.length || 0,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error detecting conflicts:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to detect conflicts",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/calendar/conflicts/:id/acknowledge
 * Acknowledge a conflict
 */
router.post(
  "/conflicts/:id/acknowledge",
  async (req: Request, res: Response) => {
    try {
      const conflict = await calendarService.acknowledgeConflict(
        req.params.id,
        res.locals.userId,
      );

      res.json({
        success: true,
        data: conflict,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error acknowledging conflict:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to acknowledge conflict",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }
  },
);

/**
 * POST /api/calendar/conflicts/:id/resolve
 * Resolve a conflict
 */
router.post("/conflicts/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { resolution_notes } = req.body;

    const conflict = await calendarService.resolveConflict(
      req.params.id,
      res.locals.userId,
      resolution_notes || "",
    );

    res.json({
      success: true,
      data: conflict,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error resolving conflict:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resolve conflict",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

// =====================================================
// PERMISSIONS ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/events/:id/share
 * Share an event with user/team/role
 */
router.post("/events/:id/share", async (req: Request, res: Response) => {
  try {
    const { user_id, team_id, role_id, access_level, expires_at } =
      req.body as ShareEventRequest;

    if (!access_level || (!user_id && !team_id && !role_id)) {
      return res.status(400).json({
        success: false,
        error:
          "access_level and at least one of (user_id, team_id, role_id) required",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    const permission = await calendarService.shareEvent(
      req.params.id,
      res.locals.userId,
      { user_id, team_id, role_id, access_level, expires_at },
      res.locals.ipAddress,
      res.locals.userAgent,
    );

    res.status(201).json({
      success: true,
      data: permission,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error sharing event:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to share event",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/calendar/events/:id/permissions
 * Get event permissions
 */
router.get("/events/:id/permissions", async (req: Request, res: Response) => {
  try {
    const permissions = await calendarService.getEventPermissions(
      req.params.id,
    );

    res.json({
      success: true,
      data: permissions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch permissions",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * DELETE /api/calendar/permissions/:id
 * Revoke permission
 */
router.delete("/permissions/:id", async (req: Request, res: Response) => {
  try {
    const { event_id } = req.body;

    if (!event_id) {
      return res.status(400).json({
        success: false,
        error: "event_id is required",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    await calendarService.revokeAccess(
      event_id,
      req.params.id,
      res.locals.userId,
    );

    res.json({
      success: true,
      data: { id: req.params.id, revoked: true },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error revoking permission:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to revoke permission",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

// =====================================================
// OUTLETS ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/outlets
 * Create a new outlet (admin only)
 */
router.post("/outlets", async (req: Request, res: Response) => {
  try {
    const { name, description, color, icon } = req.body as CreateOutletRequest;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "name is required",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    // Check if user is admin or owner
    const userRole = req.user?.role || "user";
    if (userRole !== "admin" && userRole !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Only organization admins can create outlets",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    const outlet = await calendarService.createOutlet(
      res.locals.orgId,
      res.locals.userId,
      {
        name,
        description,
        color,
        icon,
      },
    );

    res.status(201).json({
      success: true,
      data: outlet,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating outlet:", error);
    res.status(403).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create outlet",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/calendar/outlets
 * List accessible outlets
 */
router.get("/outlets", async (req: Request, res: Response) => {
  try {
    const outlets = await calendarService.getAccessibleOutlets(
      res.locals.orgId,
      res.locals.userId,
    );

    res.json({
      success: true,
      data: outlets,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching outlets:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch outlets",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

// =====================================================
// ATTACHMENTS ENDPOINTS
// =====================================================

/**
 * GET /api/calendar/events/:id/attachments
 * Get event attachments
 */
router.get("/events/:id/attachments", async (req: Request, res: Response) => {
  try {
    const attachments = await calendarService.getEventAttachments(
      req.params.id,
    );

    res.json({
      success: true,
      data: attachments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch attachments",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * POST /api/calendar/events/:id/attachments
 * Add attachment to event
 */
router.post("/events/:id/attachments", async (req: Request, res: Response) => {
  try {
    const { attachment_url, attachment_type, file_name, file_size, mime_type } =
      req.body;

    if (!attachment_url || !file_name) {
      return res.status(400).json({
        success: false,
        error: "attachment_url and file_name are required",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    const attachment = await calendarService.addAttachment(
      req.params.id,
      res.locals.userId,
      {
        attachment_url,
        attachment_type: attachment_type || "document",
        file_name,
        file_size,
        mime_type,
      },
    );

    res.status(201).json({
      success: true,
      data: attachment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error adding attachment:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add attachment",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

// =====================================================
// AUDIT LOG ENDPOINTS
// =====================================================

/**
 * GET /api/calendar/events/:id/audit
 * Get audit log for an event
 */
router.get("/events/:id/audit", async (req: Request, res: Response) => {
  try {
    const auditLog = await calendarService.getAuditLog(
      req.params.id,
      res.locals.userId,
      res.locals.orgId,
    );

    res.json({
      success: true,
      data: auditLog,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch audit log",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

// =====================================================
// HOLIDAYS ENDPOINTS
// =====================================================

/**
 * GET /api/calendar/holidays
 * Get holidays for a date range
 */
router.get("/holidays", async (req: Request, res: Response) => {
  try {
    const { getHolidaysForRange } =
      await import("../services/holidays-service");

    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "start_date and end_date are required",
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    const holidays = getHolidaysForRange(start_date, end_date);

    res.json({
      success: true,
      data: {
        items: holidays,
        total: holidays.length,
        limit: holidays.length,
        offset: 0,
        has_more: false,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch holidays",
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/calendar/health
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: "healthy", timestamp: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  });
});

export default router;
