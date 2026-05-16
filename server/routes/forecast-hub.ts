/**
 * ForecastHub API: BEO breakdown, hotel context, capture rates, transient, summary.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getOrgId } from "../lib/org-resolver";
import { getSupabaseServiceClient } from "../lib/supabase-service-client";
import { getBEOBreakdownRows } from "../services/forecast/beo-integration";
import { getHotelContextByDate } from "../services/forecast/hotel-integration";
import {
  getCaptureRates,
  putCaptureRates,
  getTransientOverrides,
  putTransientOverride,
  getReservationCoversByDate,
  computeSummaryByDate,
} from "../services/forecast/forecast-hub-service";
import { getHolidaysForRange } from "../services/holidays-service";

const router = Router();
router.use(requireAuth);

function trySupabase() {
  try {
    return getSupabaseServiceClient();
  } catch {
    return null;
  }
}

const DateRangeQuery = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** GET /api/forecast/hub/beo-breakdown?start=YYYY-MM-DD&end=YYYY-MM-DD */
router.get("/beo-breakdown", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = DateRangeQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end } = parsed.data;
    const supabase = trySupabase();
    const rows = await getBEOBreakdownRows(orgId, { start, end }, supabase);
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

/** GET /api/forecast/hub/hotel-context?start=YYYY-MM-DD&end=YYYY-MM-DD */
router.get("/hotel-context", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = DateRangeQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end } = parsed.data;
    const supabase = trySupabase();
    const result = await getHotelContextByDate(orgId, { start, end }, supabase);
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

/** GET /api/forecast/hub/capture-rates */
router.get("/capture-rates", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const supabase = trySupabase();
    const rates = await getCaptureRates(orgId, supabase);
    return res.json({ success: true, data: { rates } });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

/** PUT /api/forecast/hub/capture-rates body: { rates: { [outletId]: number } } */
router.put("/capture-rates", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const body = z.object({ rates: z.record(z.string(), z.number()) }).parse(req.body);
    const supabase = trySupabase();
    await putCaptureRates(orgId, body.rates, supabase);
    return res.json({ success: true });
  } catch (e) {
    return res.status(e instanceof z.ZodError ? 400 : 500).json({
      success: false,
      error: e instanceof Error ? e.message : "Bad request",
    });
  }
});

/** GET /api/forecast/hub/transient?start=YYYY-MM-DD&end=YYYY-MM-DD */
router.get("/transient", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = DateRangeQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end } = parsed.data;
    const supabase = trySupabase();
    const byDate = await getTransientOverrides(orgId, { start, end }, supabase);
    return res.json({ success: true, data: { byDate } });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

/** PUT /api/forecast/hub/transient body: { date: string, transientGuestCount: number } */
router.put("/transient", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const body = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        transientGuestCount: z.number().min(0),
      })
      .parse(req.body);
    const supabase = trySupabase();
    await putTransientOverride(orgId, body.date, body.transientGuestCount, supabase);
    return res.json({ success: true });
  } catch (e) {
    return res.status(e instanceof z.ZodError ? 400 : 500).json({
      success: false,
      error: e instanceof Error ? e.message : "Bad request",
    });
  }
});

/** GET /api/forecast/hub/holidays?start=YYYY-MM-DD&end=YYYY-MM-DD — US federal + religious holidays in range */
router.get("/holidays", async (req: Request, res: Response) => {
  try {
    const parsed = DateRangeQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end } = parsed.data;
    const events = getHolidaysForRange(start, end);
    const data = events.map((h) => ({
      date: h.date,
      title: h.title,
      type: h.outlet_id === "us-holidays" ? "us" : "religious",
    }));
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

/** GET /api/forecast/hub/summary?start=YYYY-MM-DD&end=YYYY-MM-DD */
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = DateRangeQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end } = parsed.data;
    const dateRange = { start, end };
    const supabase = trySupabase();

    const [beoRows, hotelContext, captureRates, reservationCoversByDate, transientByDate] =
      await Promise.all([
        getBEOBreakdownRows(orgId, dateRange, supabase),
        getHotelContextByDate(orgId, dateRange, supabase),
        getCaptureRates(orgId, supabase),
        getReservationCoversByDate(orgId, dateRange, supabase),
        getTransientOverrides(orgId, dateRange, supabase),
      ]);

    const byDate = computeSummaryByDate({
      beoRows,
      hotelContext,
      captureRates,
      reservationCoversByDate,
      transientByDate,
    });

    return res.json({ success: true, data: { byDate } });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

export default router;
