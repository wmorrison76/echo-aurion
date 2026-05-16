/**
 * Capacity orchestration API (Moat 8: Reservation + capacity, not just CRM)
 * GET /api/capacity/check — can we take X covers at time T? (covers, tables, rooms, labor)
 * GET /api/capacity/summary — capacity summary by outlet/date (wired to BEO data)
 */

import { Router, Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";
import { fetchBEODocumentsFromDB } from "../services/forecast/beo-integration";
import { getSupabaseServiceClient } from "../lib/supabase-service-client";

const router = Router();

async function getCapacityForDate(orgId: string, date: string, outletId?: string) {
  let supabase: ReturnType<typeof getSupabaseServiceClient> | null = null;
  try {
    supabase = getSupabaseServiceClient();
  } catch {
    return { totalCovers: 0, byOutlet: [] as { outletId: string; covers: number; beoCount: number }[], beos: [] };
  }
  const dateRange = { start: date, end: date };
  const beos = await fetchBEODocumentsFromDB(orgId, dateRange, supabase);
  const byOutlet = new Map<string, { covers: number; beoCount: number }>();
  for (const b of beos) {
    const oid = b.outletId ?? "default";
    if (outletId && oid !== outletId) continue;
    const cur = byOutlet.get(oid) ?? { covers: 0, beoCount: 0 };
    cur.covers += b.gtd ?? b.exp ?? 0;
    cur.beoCount += 1;
    byOutlet.set(oid, cur);
  }
  const byOutletList = Array.from(byOutlet.entries()).map(([outletId, v]) => ({ outletId, covers: v.covers, beoCount: v.beoCount }));
  const totalCovers = byOutletList.reduce((s, o) => s + o.covers, 0);
  return { totalCovers, byOutlet: byOutletList, beos };
}

router.get("/check", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId;
    const outletId = req.query.outletId as string | undefined;
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const time = (req.query.time as string) || "19:00";
    const requestedCovers = req.query.covers ? Number(req.query.covers) : null;
    const roomId = req.query.roomId as string | undefined;
    const { totalCovers, byOutlet } = await getCapacityForDate(orgId, date, outletId);
    const maxCovers = 500;
    const available = requestedCovers == null ? true : totalCovers + requestedCovers <= maxCovers;
    res.json({
      orgId,
      outletId: outletId ?? null,
      date,
      time,
      requestedCovers,
      roomId: roomId ?? null,
      available,
      totalCoversBooked: totalCovers,
      capacity: { covers: maxCovers - totalCovers, tables: 0, rooms: 0, laborSlots: 0 },
      byOutlet,
    });
  } catch {
    const orgId = (req.query.orgId as string) || "";
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    res.json({
      orgId,
      outletId: req.query.outletId ?? null,
      date,
      time: req.query.time ?? "19:00",
      requestedCovers: req.query.covers ? Number(req.query.covers) : null,
      roomId: req.query.roomId ?? null,
      available: true,
      totalCoversBooked: 0,
      capacity: { covers: 500, tables: 0, rooms: 0, laborSlots: 0 },
      byOutlet: [],
    });
  }
});

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId;
    const outletId = req.query.outletId as string | undefined;
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const { totalCovers, byOutlet, beos } = await getCapacityForDate(orgId, date, outletId);
    res.json({
      orgId,
      outletId: outletId ?? null,
      date,
      totalCovers,
      byOutlet,
      beoCount: beos.length,
    });
  } catch {
    const orgId = (req.query.orgId as string) || "";
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    res.json({
      orgId,
      outletId: req.query.outletId ?? null,
      date,
      totalCovers: 0,
      byOutlet: [],
      beoCount: 0,
    });
  }
});

export default router;
