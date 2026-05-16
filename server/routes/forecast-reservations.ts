/**
 * API endpoint for reservation-based forecast data.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getOrgId } from "../lib/org-resolver";
import { extractReservationForecastData } from "../services/forecast/reservation-integration";
import { getSupabaseServiceClient } from "../lib/supabase-service-client";

const router = Router();
router.use(requireAuth);

const QuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  outletId: z.string().uuid().optional(),
});

async function fetchReservationsFromDB(
  orgId: string,
  outletId: string | null,
  dateRange: { start: string; end: string },
) {
  let supabase: ReturnType<typeof getSupabaseServiceClient> | null = null;
  try {
    supabase = getSupabaseServiceClient();
  } catch {
    return [];
  }

  let query = supabase
    .from("reservations")
    .select("id, outlet_id, reservation_date, time, party_size, outlet_name")
    .eq("org_id", orgId)
    .gte("reservation_date", dateRange.start)
    .lte("reservation_date", dateRange.end);
  if (outletId) query = query.eq("outlet_id", outletId);
  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((row: any) => ({
    id: row.id,
    outletId: row.outlet_id,
    outletName: row.outlet_name,
    date: String(row.reservation_date ?? row.date).slice(0, 10),
    time: row.time ?? "12:00",
    partySize: Number(row.party_size ?? 1),
  }));
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end, outletId } = parsed.data;

    const points = await extractReservationForecastData(
      orgId,
      outletId ?? null,
      { start, end },
      fetchReservationsFromDB,
    );

    return res.json({ success: true, data: points });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
});

export default router;
