/**
 * API: Aggregated forecast from all sources (BEO, Calendar, Hotel, Reservations, POS).
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getOrgContext } from "../lib/org-resolver";
import { aggregateForecastData, type SourceFetcher } from "../services/forecast/aggregation-engine";
import { extractBEOForecastData } from "../services/forecast/beo-integration";
import { extractCalendarForecastData } from "../services/forecast/calendar-integration";
import { extractReservationForecastData } from "../services/forecast/reservation-integration";
import { extractHotelForecastData } from "../services/forecast/hotel-integration";
import { extractPOSForecastData } from "../services/forecast/pos-integration";
import { getSupabaseServiceClient } from "../lib/supabase-service-client";
import { calendarService } from "../services/EnterpriseCalendarService";

const router = Router();
router.use(requireAuth);

const QuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function trySupabase() {
  try {
    return getSupabaseServiceClient();
  } catch {
    return null;
  }
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId;
    const userId = orgContext.userId ?? (req as any).user?.id ?? "system";
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end } = parsed.data;
    const dateRange = { start, end };
    const supabase = trySupabase();

    const listEventsFn = async (
      oid: string,
      uid: string,
      filters: { start_date: string; end_date: string },
    ) => {
      const { events } = await calendarService.listEvents(oid, uid, {
        start_date: filters.start_date,
        end_date: filters.end_date,
        limit: 500,
        offset: 0,
      });
      return {
        events: events.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start_time ?? e.start,
          end: e.end_time ?? e.end,
          start_time: e.start_time,
          end_time: e.end_time,
          date: e.date,
          outlet_id: e.outlet_id,
          outletId: e.outlet_id,
          guest_count: e.guest_count,
          metadata: e.metadata,
        })),
      };
    };

    const fetchReservationsFn = async (
      oid: string,
      _outletId: string | null,
      range: { start: string; end: string },
    ) => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("reservations")
        .select("id, outlet_id, reservation_date, time, party_size, outlet_name")
        .eq("org_id", oid)
        .gte("reservation_date", range.start)
        .lte("reservation_date", range.end);
      if (error) return [];
      return (data ?? []).map((row: any) => ({
        id: row.id,
        outletId: row.outlet_id,
        outletName: row.outlet_name,
        date: String(row.reservation_date).slice(0, 10),
        time: row.time ?? "12:00",
        partySize: Number(row.party_size ?? 1),
      }));
    };

    const fetchers: Record<string, SourceFetcher> = {
      beo: (oid, range, ctx) =>
        extractBEOForecastData(oid, range, ctx.supabase),
      calendar: async (oid, range, ctx) =>
        extractCalendarForecastData(oid, range, listEventsFn, ctx.userId ?? userId),
      reservations: (oid, range) =>
        extractReservationForecastData(oid, null, range, fetchReservationsFn),
      hotel: (oid, range, ctx) =>
        extractHotelForecastData(oid, range, ctx.supabase),
      pos: (oid, range, ctx) =>
        extractPOSForecastData(oid, null, range, ctx.supabase),
    };

    const context = { supabase, userId };
    const result = await aggregateForecastData(orgId, dateRange, fetchers, context);

    return res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
});

export default router;
