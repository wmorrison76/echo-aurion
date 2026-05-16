import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getSupabaseClient } from "../lib/supabase";
import { logger } from "../lib/logger";
import { CommissionEngine } from "../services/commission-engine";
import {
  buildCadenceMetrics,
  buildProfitabilitySummaries,
  buildStageVelocity,
  normalizeNextActions,
} from "../services/crm/metrics";

const router = Router();

const STAGE_WEIGHTS: Record<string, number> = {
  prospect: 0.2,
  qualified: 0.4,
  proposal: 0.6,
  negotiation: 0.75,
  won: 1,
  beo_created: 1,
  lost: 0,
};

function daysBetween(a: Date, b: Date) {
  const ms = Math.max(0, b.getTime() - a.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

router.use(requireAuth);

router.get("/next-actions", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const status = String(req.query.status || "");
    const ownerId = String(req.query.ownerId || "");
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const now = new Date();

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    let query = supabase
      .from("crm_next_actions")
      .select("*")
      .eq("org_id", orgId)
      .order("due_at", { ascending: true })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (ownerId) query = query.eq("owner_id", ownerId);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: "Failed to fetch next actions" });
    }

    const { items, summary } = normalizeNextActions(data || [], now);

    return res.json({
      success: true,
      data: {
        items,
        summary,
      },
    });
  } catch (err) {
    logger.error("[CRM] next-actions error", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/next-actions", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    const { prospectId, ownerId, title, dueAt, status = "due" } = req.body;

    if (!prospectId || !title || !dueAt) {
      return res.status(400).json({ error: "prospectId, title, dueAt required" });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    const { data, error } = await supabase
      .from("crm_next_actions")
      .insert([
        {
          org_id: orgId,
          prospect_id: prospectId,
          owner_id: ownerId || userId,
          title,
          due_at: dueAt,
          status,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to create next action" });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error("[CRM] next-actions create error", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stage-velocity", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const stallDays = Math.max(1, Number(req.query.stallDays || 14));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    const { data: prospects, error } = await supabase
      .from("prospects")
      .select("id, status, updated_at, created_by, estimated_revenue")
      .eq("org_id", orgId)
      .is("deleted_at", null);

    if (error) {
      return res.status(500).json({ error: "Failed to fetch prospects" });
    }

    const now = new Date();
    const { entries, summary } = buildStageVelocity(prospects || [], stallDays, now);

    return res.json({
      success: true,
      data: {
        entries,
        summary,
      },
    });
  } catch (err) {
    logger.error("[CRM] stage-velocity error", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/scorecards", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    const { data: prospects, error } = await supabase
      .from("prospects")
      .select("id, status, updated_at, created_by, estimated_revenue")
      .eq("org_id", orgId)
      .is("deleted_at", null);

    if (error) {
      return res.status(500).json({ error: "Failed to fetch prospects" });
    }

    const { data: actions } = await supabase
      .from("crm_next_actions")
      .select("id, owner_id, status, due_at")
      .eq("org_id", orgId);

    const now = new Date();
    const byManager = new Map<string, any>();
    for (const p of prospects || []) {
      const managerId = p.created_by || "unassigned";
      if (!byManager.has(managerId)) {
        byManager.set(managerId, {
          managerId,
          openPipelineValue: 0,
          weightedPipelineValue: 0,
          closeRate: 0,
          avgDaysInStage: 0,
          overdueActions: 0,
          stalledDeals: 0,
          totalDeals: 0,
          totalClosed: 0,
          totalDays: 0,
        });
      }
      const entry = byManager.get(managerId);
      const revenue = Number(p.estimated_revenue || 0);
      const weight = STAGE_WEIGHTS[p.status] ?? 0;
      entry.openPipelineValue += p.status === "lost" ? 0 : revenue;
      entry.weightedPipelineValue += revenue * weight;
      entry.totalDeals += 1;
      if (p.status === "won" || p.status === "beo_created" || p.status === "lost") {
        entry.totalClosed += 1;
      }
      const updated = p.updated_at ? new Date(p.updated_at) : now;
      entry.totalDays += daysBetween(updated, now);
      if (daysBetween(updated, now) >= 14 && p.status !== "lost") {
        entry.stalledDeals += 1;
      }
    }

    for (const action of actions || []) {
      const managerId = action.owner_id || "unassigned";
      const entry = byManager.get(managerId);
      if (!entry) continue;
      const dueAt = new Date(action.due_at);
      if (action.status !== "completed" && dueAt < now) {
        entry.overdueActions += 1;
      }
    }

    const scorecards = Array.from(byManager.values()).map((entry) => ({
      managerId: entry.managerId,
      openPipelineValue: entry.openPipelineValue,
      weightedPipelineValue: entry.weightedPipelineValue,
      closeRate: entry.totalDeals ? entry.totalClosed / entry.totalDeals : 0,
      avgDaysInStage: entry.totalDeals ? entry.totalDays / entry.totalDeals : 0,
      overdueActions: entry.overdueActions,
      stalledDeals: entry.stalledDeals,
    }));

    return res.json({ success: true, data: scorecards });
  } catch (err) {
    logger.error("[CRM] scorecards error", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cadence", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const cadenceDays = Math.max(1, Number(req.query.cadenceDays || 7));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, created_by")
      .eq("org_id", orgId)
      .is("deleted_at", null);

    const { data: activities } = await supabase
      .from("prospect_activities")
      .select("prospect_id, timestamp")
      .eq("tenant_id", orgId)
      .order("timestamp", { ascending: false });

    const now = new Date();
    const items = buildCadenceMetrics(prospects || [], activities || [], cadenceDays, now);

    return res.json({ success: true, data: items });
  } catch (err) {
    logger.error("[CRM] cadence error", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profitability", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const eventId = String(req.query.eventId || "");
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    let eventsQuery = supabase
      .from("calendar_events")
      .select("id, revenue, beo_id")
      .eq("org_id", orgId);
    if (eventId) eventsQuery = eventsQuery.eq("id", eventId);
    const { data: events, error } = await eventsQuery;
    if (error) {
      return res.status(500).json({ error: "Failed to fetch events" });
    }

    const { data: allocations } = await supabase
      .from("event_cost_allocations")
      .select("event_id, total_cost")
      .eq("organization_id", orgId);

    const items = buildProfitabilitySummaries(events || [], allocations || []);

    return res.json({ success: true, data: items });
  } catch (err) {
    logger.error("[CRM] profitability error", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/commission/summary", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = String(req.query.userId || "");
    const start = String(req.query.start || "");
    const end = String(req.query.end || "");

    if (!start || !end) {
      return res.status(400).json({ error: "start and end required (YYYY-MM-DD)" });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    let eventsQuery = supabase
      .from("calendar_events")
      .select("id, outlet_id, revenue, date, created_by, metadata")
      .eq("org_id", orgId)
      .gte("date", start)
      .lte("date", end);

    if (userId) {
      eventsQuery = eventsQuery.eq("created_by", userId);
    }

    const { data: events, error } = await eventsQuery;
    if (error) {
      return res.status(500).json({ error: "Failed to fetch events" });
    }

    let totalRevenue = 0;
    let totalCommission = 0;
    const entries = [];

    for (const ev of events || []) {
      const revenue = Number(ev.revenue || 0);
      totalRevenue += revenue;
      const rule = await CommissionEngine.getActiveRule(orgId, ev.outlet_id, ev.date);
      const result = CommissionEngine.calculate(revenue, rule);
      totalCommission += result.commissionAmount;
      entries.push({
        id: `commission-${ev.id}`,
        eventId: ev.id,
        userId: ev.created_by,
        outletId: ev.outlet_id,
        revenue,
        commissionAmount: result.commissionAmount,
        model: result.model,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: {
        userId,
        periodStart: start,
        periodEnd: end,
        totalRevenue,
        totalCommission,
        entries,
      },
    });
  } catch (err) {
    logger.error("[CRM] commission summary error", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/commission/rules", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const {
      outletId,
      model,
      effectiveFrom,
      effectiveTo,
      baseSalary,
      commissionRate,
      tiers,
    } = req.body;

    if (!model || !effectiveFrom) {
      return res.status(400).json({ error: "model and effectiveFrom required" });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    const { data, error } = await supabase
      .from("crm_commission_rules")
      .insert([
        {
          org_id: orgId,
          outlet_id: outletId || null,
          model,
          effective_from: effectiveFrom,
          effective_to: effectiveTo || null,
          base_salary: baseSalary ?? null,
          commission_rate: commissionRate ?? null,
          tiers: tiers ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to save commission rule" });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error("[CRM] commission rule error", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
