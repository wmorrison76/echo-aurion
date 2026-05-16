/**
 * Maestro Events Routes
 *
 * Endpoints for managing events in the Maestro dashboard.
 * Central API for event list, detail, creation, and updates.
 *
 * ENDPOINTS:
 * - GET /api/maestro/events - List all events with filters
 * - GET /api/maestro/events/:id - Get single event with full detail
 * - POST /api/maestro/events - Create new event
 * - PATCH /api/maestro/events/:id - Update event
 * - POST /api/maestro/events/:id/confirm - Confirm event (draft → confirmed)
 */

import express, { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { getOrgContext, getOrgId, getUserId } from "../lib/org-resolver";
import type {
  Event,
  EventListResponse,
  EventDetailResponse,
} from "@shared/types/maestro";

const router = express.Router();

/**
 * GET /api/maestro/events
 * List events with filtering and pagination
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const {
      status,
      startDate,
      endDate,
      outlet,
      limit = "50",
      offset = "0",
    } = req.query;

    let query = supabase
      .from("events")
      .select(
        "id, name, date, status, guestCount, guaranteedGuests, eventTypeCode",
        { count: "exact" },
      )
      .eq("orgId", orgContext.orgId);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    if (outlet) {
      query = query.eq("outlettId", outlet);
    }

    // Pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 1000);
    const offsetNum = parseInt(offset as string) || 0;

    query = query
      .order("date", { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[MAESTRO-EVENTS] Query error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch events",
      });
    }

    res.json({
      success: true,
      events: data || [],
      total: count || 0,
      orgId: orgContext.orgId,
    } as EventListResponse);
  } catch (err) {
    console.error("[MAESTRO-EVENTS] GET error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch events",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * GET /api/maestro/events/:id
 * Get single event with full details (all related data)
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgContext = getOrgContext(req);

    // Fetch main event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("orgId", orgContext.orgId)
      .single();

    if (eventError || !event) {
      console.warn("[MAESTRO-EVENTS] Event not found:", id);
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    // Fetch related data in parallel
    const [
      { data: recipes },
      { data: production },
      { data: labor },
      { data: inventory },
      { data: changelog },
      { data: risks },
      { data: timeline },
    ] = await Promise.all([
      supabase.from("recipes").select("*").eq("eventId", id),
      supabase.from("production_breakdown").select("*").eq("eventId", id),
      supabase.from("labor_requirements").select("*").eq("eventId", id),
      supabase.from("inventory_delta").select("*").eq("eventId", id),
      supabase
        .from("changelog")
        .select("*")
        .eq("eventId", id)
        .order("timestamp", { ascending: false }),
      supabase
        .from("risk_flags")
        .select("*")
        .eq("eventId", id)
        .eq("resolved", false),
      supabase
        .from("timeline_events")
        .select("*")
        .eq("eventId", id)
        .order("scheduledAt", { ascending: true }),
    ]);

    // Construct complete event object
    const completeEvent: Event = {
      ...event,
      recipes: recipes || [],
      productionBreakdown: production || [],
      laborPlan: labor || [],
      inventoryImpact: inventory || [],
      changelog: changelog || [],
      riskFlags: risks || [],
      timeline: timeline || [],
    };

    res.json({
      success: true,
      event: completeEvent,
      orgId: orgContext.orgId,
    } as EventDetailResponse);
  } catch (err) {
    console.error("[MAESTRO-EVENTS] GET :id error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch event details",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * POST /api/maestro/events
 * Create a new event
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const userId = getUserId(req) || "system";
    const {
      name,
      date,
      guestCount,
      guaranteedGuests,
      eventTypeCode,
      clientName,
      clientEmail,
    } = req.body;

    if (!name || !date || !guestCount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, date, guestCount",
      });
    }

    const newEvent: Partial<Event> = {
      orgId: orgContext.orgId,
      name,
      date,
      guestCount: parseInt(guestCount),
      guaranteedGuests: parseInt(guaranteedGuests) || parseInt(guestCount),
      eventTypeCode: (eventTypeCode || "BAN") as any,
      status: "draft",
      clientName,
      clientEmail,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recipes: [],
      productionBreakdown: [],
      laborPlan: [],
      inventoryImpact: [],
      changelog: [],
      riskFlags: [],
      timeline: [],
    };

    const { data, error } = await supabase
      .from("events")
      .insert([newEvent])
      .select()
      .single();

    if (error) {
      console.error("[MAESTRO-EVENTS] Insert error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create event",
      });
    }

    res.status(201).json({
      success: true,
      event: data,
      orgId: orgContext.orgId,
    } as EventDetailResponse);
  } catch (err) {
    console.error("[MAESTRO-EVENTS] POST error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create event",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * PATCH /api/maestro/events/:id
 * Update event details
 */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgContext = getOrgContext(req);
    const userId = getUserId(req) || "system";

    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .eq("orgId", orgContext.orgId)
      .select()
      .single();

    if (error) {
      console.error("[MAESTRO-EVENTS] Update error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update event",
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    // TODO: Create changelog entry for this change
    // await addChangelogEntry(id, { ...updates }, userId);

    // Emit Stratus event
    try {
      const { stratusEventEmitter } = await import('../lib/stratus-event-emitter.js');
      await stratusEventEmitter.emit(
        'event.beo.revised.v1',
        id,
        {
          eventId: id,
          changes: updates,
          guestCount: data.guestCount,
          scheduledTime: data.scheduledTime,
          outletId: data.outletId,
        },
        {
          tenantId: orgContext.orgId,
          producer: 'maestro_events',
        }
      );
    } catch (error) {
      console.error('[MAESTRO-EVENTS] Failed to emit Stratus event:', error);
      // Don't fail the request if event emission fails
    }

    res.json({
      success: true,
      event: data,
      orgId: orgContext.orgId,
    } as EventDetailResponse);
  } catch (err) {
    console.error("[MAESTRO-EVENTS] PATCH error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update event",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * POST /api/maestro/events/:id/confirm
 * Confirm event (draft → confirmed)
 */
router.post("/:id/confirm", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgContext = getOrgContext(req);
    const userId = getUserId(req) || "system";

    const { data, error } = await supabase
      .from("events")
      .update({
        status: "confirmed",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("orgId", orgContext.orgId)
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({
        success: false,
        error: "Failed to confirm event",
      });
    }

    // TODO: Create changelog entry
    // TODO: Trigger production planning auto-actions

    res.json({
      success: true,
      event: data,
      orgId: orgContext.orgId,
      message: "Event confirmed successfully",
    } as EventDetailResponse);
  } catch (err) {
    console.error("[MAESTRO-EVENTS] Confirm error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to confirm event",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
