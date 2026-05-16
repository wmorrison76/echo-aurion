import express, { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getSupabaseClient } from "../lib/supabase";
import { logger } from "../lib/logger";
import type { ProspectCalendarEvent, ProspectStage } from "@shared/types/prospect";

const router = express.Router();

// Zod validation schemas
const DateRangeSchema = z.object({
  date_from: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Valid date is required"),
  date_to: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Valid date is required"),
  outlet_id: z.string().optional(),
});

const ACTIVE_PROSPECT_STATUSES: ProspectStage[] = [
  "prospect",
  "qualified",
  "proposal",
  "negotiation",
  "won",
];

/**
 * GET /api/calendar/prospects
 * List prospects as potential calendar events for a given date range
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || "default";
    const { date_from, date_to, outlet_id } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({
        error: "date_from and date_to are required query parameters",
      });
    }

    const validation = DateRangeSchema.safeParse({
      date_from: date_from as string,
      date_to: date_to as string,
      outlet_id: outlet_id as string,
    });

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors,
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    // Fetch prospects within date range
    let query = supabase
      .from("prospects")
      .select(
        "id, name, event_type_code, event_date, guest_count, estimated_revenue, status, email, contact_name, scheduling_conflicts, outlet_id",
      )
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .gte("event_date", validation.data.date_from)
      .lte("event_date", validation.data.date_to);

    if (validation.data.outlet_id) {
      query = query.eq("outlet_id", validation.data.outlet_id);
    }

    const { data: prospects, error } = await query;

    if (error) {
      logger.error("[CalendarProspects] Fetch error", {
        error: error.message,
      });
      return res.status(500).json({ error: "Failed to fetch prospects" });
    }

    // Transform prospects into calendar events
    const activeProspects = (prospects || []).filter((prospect: any) =>
      ACTIVE_PROSPECT_STATUSES.includes(prospect.status),
    );

    const calendarEvents: ProspectCalendarEvent[] = activeProspects.map(
      (prospect: any) => {
        // Determine risk level based on scheduling conflicts
        const hasConflicts = !!prospect.scheduling_conflicts;
        const riskLevel = hasConflicts
          ? "high"
          : ["prospect", "qualified", "proposal"].includes(prospect.status)
            ? "medium"
            : "low";

        return {
          id: `prospect-${prospect.id}`,
          type: "potential" as const,
          prospect_id: prospect.id,
          title: `${prospect.name} (${prospect.event_type_code})`,
          date: prospect.event_date,
          outlet_id: prospect.outlet_id,
          guest_count: prospect.guest_count,
          estimated_revenue: prospect.estimated_revenue,
          event_type_code: prospect.event_type_code,
          status: prospect.status,
          contact_email: prospect.email,
          risk_level: riskLevel,
          scheduling_conflicts: prospect.scheduling_conflicts,
        };
      },
    );

    logger.info("[CalendarProspects] Fetched prospects for calendar", {
      count: calendarEvents.length,
      dateRange: {
        from: validation.data.date_from,
        to: validation.data.date_to,
      },
    });

    return res.json({
      success: true,
      events: calendarEvents,
      total: calendarEvents.length,
    });
  } catch (error) {
    logger.error("[CalendarProspects] GET error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/calendar/prospects/:prospectId/confirm-event
 * Convert prospect to confirmed event
 */
router.post(
  "/:prospectId/confirm-event",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { prospectId } = req.params;
      const orgId = (req as any).user?.org_id || "default";
      const userId = (req as any).user?.id || "system";

      const supabase = getSupabaseClient();
      if (!supabase) {
        return res
          .status(500)
          .json({ error: "Database connection unavailable" });
      }

      // Fetch prospect
      const { data: prospect, error: fetchError } = await supabase
        .from("prospects")
        .select("*")
        .eq("id", prospectId)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .single();

      if (fetchError || !prospect) {
        return res.status(404).json({ error: "Prospect not found" });
      }

      // Create calendar event
      const eventData = {
        org_id: orgId,
        outlet_id: prospect.outlet_id,
        title: prospect.name,
        start_time: new Date(prospect.event_date).toISOString(),
        end_time: new Date(
          new Date(prospect.event_date).getTime() + 4 * 60 * 60 * 1000,
        ).toISOString(), // Default 4 hours
        event_type: prospect.event_type_code,
        status: "confirmed",
        guest_count: prospect.guest_count,
        estimated_revenue: prospect.estimated_revenue,
        created_by: userId,
      };

      // Insert into calendar_events (assuming this table exists)
      const { data: createdEvent, error: createError } = await supabase
        .from("calendar_events")
        .insert([eventData])
        .select();

      if (createError) {
        logger.error("[CalendarProspects] Failed to create event", {
          error: createError.message,
        });
        return res.status(500).json({
          error: "Failed to create calendar event from prospect",
        });
      }

      // Update prospect with event mapping
      if (createdEvent?.[0]) {
        const { error: mapError } = await supabase
          .from("prospect_event_mappings")
          .insert([
            {
              prospect_id: prospectId,
              event_id: createdEvent[0].id,
            },
          ]);

        if (mapError) {
          logger.warn("[CalendarProspects] Failed to create event mapping", {
            error: mapError.message,
          });
        }

        // Update prospect status to "beo_created"
        const { data: updatedProspect, error: updateError } = await supabase
          .from("prospects")
          .update({ status: "beo_created" })
          .eq("id", prospectId)
          .select()
          .single();

        if (updateError) {
          logger.warn("[CalendarProspects] Failed to update prospect status", {
            error: updateError.message,
          });
        }

        return res.json({
          success: true,
          message: "Prospect confirmed as calendar event",
          event: createdEvent?.[0],
          prospect: updatedProspect || prospect,
        });
      }

      logger.info("[CalendarProspects] Prospect confirmed as event", {
        prospectId,
        eventId: createdEvent?.[0]?.id,
      });

      return res.json({
        success: true,
        message: "Prospect confirmed as calendar event",
        event: createdEvent?.[0],
        prospect,
      });
    } catch (error) {
      logger.error("[CalendarProspects] POST confirm-event error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
