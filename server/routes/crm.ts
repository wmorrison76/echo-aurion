/**
 * CRM API Routes (EchoEventStudio / EchoEvents)
 *
 * Backed by Supabase persistence (service-role) with strict org scoping.
 *
 * Primary entities:
 * - Contacts: stored in `clients` table (org-scoped)
 * - Pipeline: stored in `prospects` table (org-scoped)
 * - Goals: stored in `crm_monthly_revenue_goals` (org-scoped)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { getSupabaseServiceClient } from "../lib/supabase-service-client.js";
import { logger } from "../lib/logger";
import {
  buildRequiredProspectsByMonth,
  calculateCoverageRatio,
  calculateRequiredProspects,
} from "@shared/crm/pipeline-health";
import {
  ensureLocalCrmSeed,
  listClients as listLocalClients,
  createClient as createLocalClient,
  getClient as getLocalClient,
  updateClient as updateLocalClient,
  deleteClient as deleteLocalClient,
  listGoals as listLocalGoals,
  upsertGoal as upsertLocalGoal,
  listProspects as listLocalProspects,
  listSalesGoals as listLocalSalesGoals,
  upsertSalesGoal as upsertLocalSalesGoal,
} from "../lib/local-crm-store";

const router = Router();
router.use(requireAuth);

const CreateContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  address_street: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
  address_zip: z.string().optional().nullable(),
  address_country: z.string().optional().nullable(),
  event_type: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  guest_count: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

const UpdateContactSchema = CreateContactSchema.partial();

function getOrgUser(req: Request): { orgId: string; userId: string } {
  const orgId = (req as any).user?.org_id;
  const userId = (req as any).user?.id;
  if (!orgId || !userId) throw new Error("Not authenticated");
  return { orgId, userId };
}

function normalizeMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function addMonths(monthStartIso: string, months: number): string {
  const d = new Date(`${monthStartIso}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return normalizeMonth(d);
}

function buildYearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, idx) =>
    normalizeMonth(new Date(Date.UTC(year, idx, 1))),
  );
}

function tryGetSupabase() {
  try {
    return getSupabaseServiceClient();
  } catch (error) {
    logger.warn("[CRM] Supabase service client not configured, using local CRM store fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

const PROSPECT_PROBABILITY: Record<string, number> = {
  prospect: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.7,
  won: 0.9,
  beo_created: 1.0,
  lost: 0,
  lead: 0.1, // legacy
  completed: 1.0, // legacy
};

function emitBudgetForecastEvent(payload: {
  orgId: string;
  userId: string;
  year: number;
  type: "goal_updated" | "goal_submitted" | "goal_reviewed";
  status?: string;
}) {
  logger.info("[CRM] Budget forecast event", payload);
}

async function listContacts(req: Request, res: Response) {
  try {
    const { orgId } = getOrgUser(req);
    const search = (req.query.search as string | undefined)?.trim();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const { total, clients } = await listLocalClients({
        orgId,
        search,
        limit,
        offset,
      });
      return res.json({
        success: true,
        total,
        contacts: clients,
        limit,
        offset,
      });
    }

    let query = supabase
      .from("clients")
      .select("*", { count: "exact" })
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const q = `%${search}%`;
      query = query.or(`name.ilike.${q},email.ilike.${q},company.ilike.${q}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      total: count || 0,
      contacts: data || [],
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error("[CRM] Contacts list error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
}

router.get("/contacts", listContacts);
router.get("/clients", listContacts);

router.post("/contacts", async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = getOrgUser(req);
    const validated = CreateContactSchema.parse(req.body);

    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      try {
        const created = await createLocalClient({
          orgId,
          userId,
          client: {
            name: validated.name,
            email: validated.email || null,
            phone: validated.phone || null,
            company: validated.company || null,
            address_street: validated.address_street || null,
            address_city: validated.address_city || null,
            address_state: validated.address_state || null,
            address_zip: validated.address_zip || null,
            address_country: validated.address_country || "USA",
            event_type: validated.event_type || null,
            budget: validated.budget ?? null,
            guest_count: validated.guest_count ?? null,
            notes: validated.notes || null,
            tags: validated.tags || [],
          },
        });
        return res.json({ success: true, contact: created });
      } catch (e: any) {
        if (String(e?.code || "") === "DUPLICATE_EMAIL") {
          return res
            .status(409)
            .json({ success: false, error: "Contact with that email already exists" });
        }
        throw e;
      }
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        org_id: orgId,
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        company: validated.company || null,
        address_street: validated.address_street || null,
        address_city: validated.address_city || null,
        address_state: validated.address_state || null,
        address_zip: validated.address_zip || null,
        address_country: validated.address_country || "USA",
        event_type: validated.event_type || null,
        budget: validated.budget ?? null,
        guest_count: validated.guest_count ?? null,
        notes: validated.notes || null,
        tags: validated.tags || [],
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      // Supabase/PostgREST may surface unique violations as 409-ish messages
      if (String((error as any).code || "").includes("23505")) {
        return res
          .status(409)
          .json({ success: false, error: "Contact with that email already exists" });
      }
      throw error;
    }

    res.json({ success: true, contact: data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request", details: error.errors });
    }
    logger.error("[CRM] Create contact error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

router.get("/contacts/:id", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const { id } = req.params;

    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const found = await getLocalClient({ orgId, id });
      if (!found) return res.status(404).json({ success: false, error: "Not found" });
      return res.json({ success: true, contact: found });
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .single();

    if (error) throw error;
    res.json({ success: true, contact: data });
  } catch (error: any) {
    logger.error("[CRM] Get contact error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

router.put("/contacts/:id", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const { id } = req.params;
    const validated = UpdateContactSchema.parse(req.body);

    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const updated = await updateLocalClient({
        orgId,
        id,
        updates: { ...validated },
      });
      if (!updated) return res.status(404).json({ success: false, error: "Not found" });
      return res.json({ success: true, contact: updated });
    }

    const { data, error } = await supabase
      .from("clients")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    res.json({ success: true, contact: data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request", details: error.errors });
    }
    logger.error("[CRM] Update contact error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

router.delete("/contacts/:id", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const { id } = req.params;

    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const ok = await deleteLocalClient({ orgId, id });
      if (!ok) return res.status(404).json({ success: false, error: "Not found" });
      return res.json({ success: true, message: "Contact deleted" });
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("org_id", orgId)
      .eq("id", id);
    if (error) throw error;

    res.json({ success: true, message: "Contact deleted" });
  } catch (error: any) {
    logger.error("[CRM] Delete contact error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/crm/metrics
 * Lightweight counters for dashboards.
 */
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const supabase = tryGetSupabase();

    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const [prospectRows, clientList] = await Promise.all([
        listLocalProspects({ orgId }),
        listLocalClients({ orgId, limit: 10000, offset: 0 }),
      ]);
      const clientsCount = clientList.total;
      const vipClientsCount = clientList.clients.filter((c) =>
        Array.isArray(c.tags) ? c.tags.includes("vip") : false,
      ).length;

      const now = new Date();
      const nowDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const plus72h = new Date(nowDay);
      plus72h.setUTCDate(plus72h.getUTCDate() + 3);
      const plus30d = new Date(nowDay);
      plus30d.setUTCDate(plus30d.getUTCDate() + 30);

      const startMonth = normalizeMonth(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      );
      const end18 = addMonths(startMonth, 18);
      const end18Date = new Date(`${end18}T00:00:00.000Z`);

      let pipeline18 = 0;
      let weighted18 = 0;
      let openProspects = 0;
      let pipeline30d = 0;
      let weighted30d = 0;
      let rush72hCount = 0;

      for (const p of prospectRows || []) {
        const date = p.event_date
          ? new Date(`${p.event_date}T00:00:00.000Z`)
          : null;
        if (!date) continue;
        const revenue = Number(p.estimated_revenue || 0);
        const status = String(p.status || "");
        const prob = PROSPECT_PROBABILITY[status] ?? 0.2;
        const isLost = prob === 0;

        if (!isLost && date >= nowDay && date <= plus72h) {
          rush72hCount += 1;
        }

        if (date >= nowDay && date <= plus30d && revenue > 0) {
          pipeline30d += revenue;
          weighted30d += revenue * prob;
        }

        if (date < end18Date && revenue > 0) {
          pipeline18 += revenue;
          weighted18 += revenue * prob;
        }

        if (prob > 0 && prob < 1) openProspects += 1;
      }

      return res.json({
        success: true,
        data: {
          clientsCount,
          vipClientsCount,
          prospectsCount: (prospectRows || []).length,
          openProspectsCount: openProspects,
          rush72hCount,
          pipeline30d,
          weighted30d,
          pipeline18,
          weighted18,
        },
      });
    }

    const [
      { count: clientsCount, error: clientsErr },
      { count: vipClientsCount, error: vipErr },
      { data: prospectRows, error: prospectsErr },
    ] = await Promise.all([
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .contains("tags", ["vip"]),
      supabase
        .from("prospects")
        .select("event_date, estimated_revenue, status")
        .eq("org_id", orgId)
        .is("deleted_at", null),
    ]);

    if (clientsErr) throw clientsErr;
    if (vipErr) throw vipErr;
    if (prospectsErr) throw prospectsErr;

    const now = new Date();
    const nowDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const plus72h = new Date(nowDay);
    plus72h.setUTCDate(plus72h.getUTCDate() + 3);
    const plus30d = new Date(nowDay);
    plus30d.setUTCDate(plus30d.getUTCDate() + 30);

    const startMonth = normalizeMonth(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    );
    const end18 = addMonths(startMonth, 18);
    const end18Date = new Date(`${end18}T00:00:00.000Z`);

    let pipeline18 = 0;
    let weighted18 = 0;
    let openProspects = 0;
    let pipeline30d = 0;
    let weighted30d = 0;
    let rush72hCount = 0;

    for (const p of prospectRows || []) {
      const date = p.event_date
        ? new Date(`${p.event_date}T00:00:00.000Z`)
        : null;
      if (!date) continue;
      const revenue = Number(p.estimated_revenue || 0);
      const status = String(p.status || "");
      const prob = PROSPECT_PROBABILITY[status] ?? 0.2;
      const isLost = prob === 0;

      if (!isLost && date >= nowDay && date <= plus72h) {
        rush72hCount += 1;
      }

      if (date >= nowDay && date <= plus30d && revenue > 0) {
        pipeline30d += revenue;
        weighted30d += revenue * prob;
      }

      if (date < end18Date && revenue > 0) {
        pipeline18 += revenue;
        weighted18 += revenue * prob;
      }

      if (prob > 0 && prob < 1) openProspects += 1;
    }

    res.json({
      success: true,
      data: {
        clientsCount: clientsCount || 0,
        vipClientsCount: vipClientsCount || 0,
        prospectsCount: (prospectRows || []).length,
        openProspectsCount: openProspects,
        rush72hCount,
        pipeline30d,
        weighted30d,
        pipeline18,
        weighted18,
      },
    });
  } catch (error: any) {
    logger.error("[CRM] Metrics error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * PUT /api/crm/goals
 * Upsert a monthly goal: { month: "YYYY-MM-01", goalRevenue: number }
 */
router.put("/goals", async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = getOrgUser(req);
    const Body = z.object({
      month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      goalRevenue: z.number().nonnegative(),
    });
    const { month, goalRevenue } = Body.parse(req.body);

    const monthNorm = normalizeMonth(new Date(`${month}T00:00:00.000Z`));
    const year = Number(monthNorm.slice(0, 4));
    const supabase = tryGetSupabase();

    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const data = await upsertLocalGoal({
        orgId,
        userId,
        month: monthNorm,
        goalRevenue,
      });
      emitBudgetForecastEvent({
        orgId,
        userId,
        year,
        type: "goal_updated",
      });
      return res.json({ success: true, data });
    }

    const { data, error } = await supabase
      .from("crm_monthly_revenue_goals")
      .upsert(
        {
          org_id: orgId,
          month: monthNorm,
          goal_revenue: goalRevenue,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,month" },
      )
      .select("*")
      .single();

    if (error) throw error;
    emitBudgetForecastEvent({
      orgId,
      userId,
      year,
      type: "goal_updated",
    });
    res.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request", details: error.errors });
    }
    logger.error("[CRM] Goals upsert error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/crm/goals?from=YYYY-MM-01&months=18
 */
router.get("/goals", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const months = Math.min(parseInt(req.query.months as string) || 18, 36);
    const from =
      (req.query.from as string | undefined) ||
      normalizeMonth(
        new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
      );
    const fromNorm = normalizeMonth(new Date(`${from}T00:00:00.000Z`));
    const toNorm = addMonths(fromNorm, months);

    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const data = await listLocalGoals({
        orgId,
        fromMonth: fromNorm,
        toMonthExclusive: toNorm,
      });
      return res.json({ success: true, data });
    }
    const { data, error } = await supabase
      .from("crm_monthly_revenue_goals")
      .select("*")
      .eq("org_id", orgId)
      .gte("month", fromNorm)
      .lt("month", toNorm)
      .order("month", { ascending: true });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    logger.error("[CRM] Goals list error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * PUT /api/crm/sales-goals
 * Upsert annual + monthly sales goals for a sales manager.
 */
router.put("/sales-goals", async (req: Request, res: Response) => {
  try {
    const { orgId, userId: requesterId } = getOrgUser(req);
    const Body = z.object({
      userId: z.string().optional(),
      year: z.number().int(),
      annualTarget: z.number().nonnegative(),
      monthlyTargets: z.record(z.string(), z.number().nonnegative()).optional(),
      conversionRatio: z
        .object({
          prospects: z.number().positive(),
          clients: z.number().positive(),
          wins: z.number().positive(),
        })
        .optional(),
      pipelineTarget: z.number().nonnegative().optional(),
    });
    const payload = Body.parse(req.body);
    const targetUserId = payload.userId || requesterId;
    const months = buildYearMonths(payload.year);
    const perMonth = payload.annualTarget / 12;
    const normalizedTargets: Record<string, number> = {};

    for (const month of months) {
      normalizedTargets[month] = Math.round(perMonth);
    }

    if (payload.monthlyTargets) {
      for (const [month, value] of Object.entries(payload.monthlyTargets)) {
        const normalized = normalizeMonth(new Date(`${month}T00:00:00.000Z`));
        if (normalized.startsWith(`${payload.year}-`)) {
          normalizedTargets[normalized] = Math.round(value);
        }
      }
    }

    const conversionRatio = payload.conversionRatio || {
      prospects: 10,
      clients: 3,
      wins: 1,
    };
    const pipelineTarget = payload.pipelineTarget ?? 80;

    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const data = await upsertLocalSalesGoal({
        orgId,
        userId: targetUserId,
        year: payload.year,
        annualTarget: payload.annualTarget,
        monthlyTargets: normalizedTargets,
        conversionRatio,
        pipelineTarget,
        createdBy: requesterId,
      });
      return res.json({ success: true, data });
    }

    const { data: existing } = await supabase
      .from("crm_sales_goals")
      .select("goal_status")
      .eq("org_id", orgId)
      .eq("user_id", targetUserId)
      .eq("year", payload.year)
      .maybeSingle();

    const goalStatus = existing?.goal_status || "draft";

    const { data, error } = await supabase
      .from("crm_sales_goals")
      .upsert(
        {
          org_id: orgId,
          user_id: targetUserId,
          year: payload.year,
          annual_target: payload.annualTarget,
          monthly_targets: normalizedTargets,
          conversion_ratio: conversionRatio,
          pipeline_target: pipelineTarget,
          goal_status: goalStatus,
          created_by: requesterId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,user_id,year" },
      )
      .select("*")
      .single();

    if (error) throw error;
    emitBudgetForecastEvent({
      orgId,
      userId: targetUserId,
      year: payload.year,
      type: "goal_updated",
      status: data?.goal_status,
    });
    return res.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request", details: error.errors });
    }
    logger.error("[CRM] Sales goals upsert error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/crm/sales-goals?year=YYYY
 */
router.get("/sales-goals", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const data = await listLocalSalesGoals({ orgId, year });
      return res.json({ success: true, data });
    }

    const { data, error } = await supabase
      .from("crm_sales_goals")
      .select("*")
      .eq("org_id", orgId)
      .eq("year", year)
      .order("user_id", { ascending: true });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (error: any) {
    logger.error("[CRM] Sales goals list error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/crm/sales-goals/submit
 * Manager submits goals for review.
 */
router.post("/sales-goals/submit", async (req: Request, res: Response) => {
  try {
    const { orgId, userId: requesterId } = getOrgUser(req);
    const Body = z.object({
      userId: z.string().optional(),
      year: z.number().int(),
    });
    const payload = Body.parse(req.body);
    const targetUserId = payload.userId || requesterId;

    const supabase = tryGetSupabase();
    if (!supabase) {
      return res.status(501).json({
        success: false,
        error: "Supabase not configured for goal submissions",
      });
    }

    const { data, error } = await supabase
      .from("crm_sales_goals")
      .update({
        goal_status: "submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId)
      .eq("user_id", targetUserId)
      .eq("year", payload.year)
      .select("*")
      .single();

    if (error) throw error;
    emitBudgetForecastEvent({
      orgId,
      userId: targetUserId,
      year: payload.year,
      type: "goal_submitted",
      status: data?.goal_status,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request", details: error.errors });
    }
    logger.error("[CRM] Sales goals submit error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/crm/sales-goals/review
 * Head-of-sales review for approval/revision request.
 */
router.post(
  "/sales-goals/review",
  requireRole("admin", "head-of-sales", "sales-lead"),
  async (req: Request, res: Response) => {
    try {
      const { orgId, userId: reviewerId } = getOrgUser(req);
      const Body = z.object({
        userId: z.string(),
        year: z.number().int(),
        status: z.enum(["approved", "revision_requested"]),
        reviewNotes: z.string().optional(),
      });
      const payload = Body.parse(req.body);

      const supabase = tryGetSupabase();
      if (!supabase) {
        return res.status(501).json({
          success: false,
          error: "Supabase not configured for goal reviews",
        });
      }

      const { data, error } = await supabase
        .from("crm_sales_goals")
        .update({
          goal_status: payload.status,
          review_notes: payload.reviewNotes || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: reviewerId,
        })
        .eq("org_id", orgId)
        .eq("user_id", payload.userId)
        .eq("year", payload.year)
        .select("*")
        .single();

      if (error) throw error;
      emitBudgetForecastEvent({
        orgId,
        userId: payload.userId,
        year: payload.year,
        type: "goal_reviewed",
        status: data?.goal_status,
      });
      res.json({ success: true, data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid request", details: error.errors });
      }
      logger.error("[CRM] Sales goals review error", { error });
      res.status(error?.message === "Not authenticated" ? 401 : 500).json({
        success: false,
        error: error?.message || "Internal server error",
      });
    }
  },
);

/**
 * GET /api/crm/sales-goals/summary?year=YYYY
 * Returns actuals vs goals per sales manager.
 */
router.get("/sales-goals/summary", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const months = buildYearMonths(year);
    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);

      const [prospects, goals] = await Promise.all([
        listLocalProspects({ orgId }),
        listLocalSalesGoals({ orgId, year }),
      ]);

      const goalsByUser = new Map(
        goals.map((g) => [g.user_id, g] as const),
      );

      const summary: Record<
        string,
        {
          userId: string;
          year: number;
          annualTarget: number;
          pipelineTarget: number;
          conversionRatio: { prospects: number; clients: number; wins: number };
          monthlyTargets: Record<string, number>;
          monthlyActuals: Record<string, number>;
          monthlyPipeline: Record<string, number>;
          actualRevenue: number;
          pipelineRevenue: number;
          pipelineCount: number;
          requiredProspects: number;
          coverageRatio: number;
          monthlyRequiredProspects: Record<string, number>;
        }
      > = {};

      const addUser = (userId: string) => {
        if (summary[userId]) return;
        const goal = goalsByUser.get(userId);
        const monthlyTargets: Record<string, number> = {};
        const monthlyActuals: Record<string, number> = {};
        const monthlyPipeline: Record<string, number> = {};
        for (const month of months) {
          monthlyTargets[month] = goal?.monthly_targets?.[month] || 0;
          monthlyActuals[month] = 0;
          monthlyPipeline[month] = 0;
        }
        summary[userId] = {
          userId,
          year,
          annualTarget: goal?.annual_target || 0,
          pipelineTarget: goal?.pipeline_target || 80,
          conversionRatio: goal?.conversion_ratio || { prospects: 10, clients: 3, wins: 1 },
          monthlyTargets,
          monthlyActuals,
          monthlyPipeline,
          actualRevenue: 0,
          pipelineRevenue: 0,
          pipelineCount: 0,
          requiredProspects: 0,
          coverageRatio: 0,
          monthlyRequiredProspects: {},
        };
      };

      for (const p of prospects) {
        const userId = (p as any).created_by || "local";
        addUser(userId);
        const eventDate = String((p as any).event_date || "");
        if (!eventDate) continue;
        const month = normalizeMonth(new Date(`${eventDate}T00:00:00.000Z`));
        if (!summary[userId].monthlyPipeline[month]) {
          summary[userId].monthlyPipeline[month] = 0;
          summary[userId].monthlyActuals[month] = 0;
        }
        const revenue = Number((p as any).estimated_revenue || 0);
        summary[userId].pipelineRevenue += revenue;
        summary[userId].pipelineCount += 1;
        summary[userId].monthlyPipeline[month] =
          (summary[userId].monthlyPipeline[month] || 0) + revenue;
        const status = String((p as any).status || "");
        if (status === "won" || status === "beo_created") {
          summary[userId].actualRevenue += revenue;
          summary[userId].monthlyActuals[month] =
            (summary[userId].monthlyActuals[month] || 0) + revenue;
        }
      }

      const data = Object.values(summary).map((row) => {
        const avgDealSize = row.pipelineCount
          ? row.pipelineRevenue / row.pipelineCount
          : 0;
        const ratioProspects = row.conversionRatio?.prospects || 10;
        const requiredProspects = calculateRequiredProspects({
          targetRevenue: row.annualTarget,
          avgDealSize,
          ratioProspects,
        });
        const monthlyRequiredProspects = buildRequiredProspectsByMonth({
          monthlyTargets: row.monthlyTargets,
          avgDealSize,
          ratioProspects,
        });
        return {
          ...row,
          requiredProspects,
          monthlyRequiredProspects,
          coverageRatio: calculateCoverageRatio(row.pipelineCount, requiredProspects),
          gap: row.annualTarget - row.actualRevenue,
          attainment: row.annualTarget
            ? Number((row.actualRevenue / row.annualTarget).toFixed(3))
            : 0,
        };
      });

      return res.json({ success: true, data });
    }

    const start = normalizeMonth(new Date(Date.UTC(year, 0, 1)));
    const end = normalizeMonth(new Date(Date.UTC(year + 1, 0, 1)));
    const [{ data: prospects, error: pErr }, { data: goals, error: gErr }] =
      await Promise.all([
        supabase
          .from("prospects")
          .select("event_date, estimated_revenue, status, owner_id, created_by")
          .eq("org_id", orgId)
          .is("deleted_at", null)
          .gte("event_date", start)
          .lt("event_date", end),
        supabase
          .from("crm_sales_goals")
          .select("*")
          .eq("org_id", orgId)
          .eq("year", year),
      ]);

    if (pErr) throw pErr;
    if (gErr) throw gErr;

    const goalsByUser = new Map(
      (goals || []).map((g) => [String(g.user_id), g] as const),
    );

    const summary: Record<
      string,
      {
        userId: string;
        year: number;
        annualTarget: number;
        pipelineTarget: number;
        conversionRatio: { prospects: number; clients: number; wins: number };
        monthlyTargets: Record<string, number>;
        monthlyActuals: Record<string, number>;
        monthlyPipeline: Record<string, number>;
        actualRevenue: number;
        pipelineRevenue: number;
        pipelineCount: number;
      requiredProspects: number;
      coverageRatio: number;
      monthlyRequiredProspects: Record<string, number>;
      }
    > = {};

    const addUser = (userId: string) => {
      if (summary[userId]) return;
      const goal = goalsByUser.get(String(userId));
      const monthlyTargets: Record<string, number> = {};
      const monthlyActuals: Record<string, number> = {};
      const monthlyPipeline: Record<string, number> = {};
      const rawTargets =
        goal?.monthly_targets && typeof goal.monthly_targets === "object"
          ? (goal.monthly_targets as Record<string, number>)
          : {};
      const ratio =
        goal?.conversion_ratio && typeof goal.conversion_ratio === "object"
          ? (goal.conversion_ratio as { prospects: number; clients: number; wins: number })
          : { prospects: 10, clients: 3, wins: 1 };
      for (const month of months) {
        monthlyTargets[month] = Number(rawTargets?.[month] || 0);
        monthlyActuals[month] = 0;
        monthlyPipeline[month] = 0;
      }
      summary[userId] = {
        userId,
        year,
        annualTarget: Number(goal?.annual_target || 0),
        pipelineTarget: Number(goal?.pipeline_target || 80),
        conversionRatio: ratio,
        monthlyTargets,
        monthlyActuals,
        monthlyPipeline,
        actualRevenue: 0,
        pipelineRevenue: 0,
        pipelineCount: 0,
        requiredProspects: 0,
        coverageRatio: 0,
        monthlyRequiredProspects: {},
      };
    };

    for (const p of prospects || []) {
      const userId =
        (p as any).owner_id || (p as any).created_by || "unassigned";
      addUser(userId);
      const eventDate = String((p as any).event_date || "");
      if (!eventDate) continue;
      const month = normalizeMonth(new Date(`${eventDate}T00:00:00.000Z`));
      const revenue = Number((p as any).estimated_revenue || 0);
      summary[userId].pipelineRevenue += revenue;
      summary[userId].pipelineCount += 1;
      summary[userId].monthlyPipeline[month] =
        (summary[userId].monthlyPipeline[month] || 0) + revenue;
      const status = String((p as any).status || "");
      if (status === "won" || status === "beo_created") {
        summary[userId].actualRevenue += revenue;
        summary[userId].monthlyActuals[month] =
          (summary[userId].monthlyActuals[month] || 0) + revenue;
      }
    }

    const data = Object.values(summary).map((row) => {
      const avgDealSize = row.pipelineCount
        ? row.pipelineRevenue / row.pipelineCount
        : 0;
      const ratioProspects = row.conversionRatio?.prospects || 10;
      const requiredProspects = calculateRequiredProspects({
        targetRevenue: row.annualTarget,
        avgDealSize,
        ratioProspects,
      });
      const monthlyRequiredProspects = buildRequiredProspectsByMonth({
        monthlyTargets: row.monthlyTargets,
        avgDealSize,
        ratioProspects,
      });
      return {
        ...row,
        requiredProspects,
        monthlyRequiredProspects,
        coverageRatio: calculateCoverageRatio(row.pipelineCount, requiredProspects),
        gap: row.annualTarget - row.actualRevenue,
        attainment: row.annualTarget
          ? Number((row.actualRevenue / row.annualTarget).toFixed(3))
          : 0,
      };
    });

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error("[CRM] Sales goals summary error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/crm/budget-rollup?year=YYYY
 * Returns 12-month budget/forecast/actual rollup.
 */
router.get("/budget-rollup", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const months = buildYearMonths(year);
    const start = normalizeMonth(new Date(Date.UTC(year, 0, 1)));
    const end = normalizeMonth(new Date(Date.UTC(year + 1, 0, 1)));

    const supabase = tryGetSupabase();
    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const [prospects, monthlyGoals, salesGoals] = await Promise.all([
        listLocalProspects({ orgId }),
        listLocalGoals({ orgId, fromMonth: start, toMonthExclusive: end }),
        listLocalSalesGoals({ orgId, year }),
      ]);
      const monthlyGoalMap = new Map<string, number>();
      for (const goal of monthlyGoals || []) {
        monthlyGoalMap.set(String(goal.month), Number(goal.goal_revenue || 0));
      }
      const salesGoalMap = new Map<string, number>();
      for (const goal of salesGoals || []) {
        Object.entries(goal.monthly_targets || {}).forEach(([month, value]) => {
          salesGoalMap.set(month, (salesGoalMap.get(month) || 0) + Number(value || 0));
        });
      }

      const bucket: Record<string, { month: string; goal: number; forecast: number; actual: number }> =
        {};
      months.forEach((month) => {
        bucket[month] = {
          month,
          goal: monthlyGoalMap.get(month) ?? salesGoalMap.get(month) ?? 0,
          forecast: 0,
          actual: 0,
        };
      });

      for (const p of prospects || []) {
        const eventDate = String((p as any).event_date || "");
        if (!eventDate) continue;
        const month = normalizeMonth(new Date(`${eventDate}T00:00:00.000Z`));
        if (!bucket[month]) continue;
        const revenue = Number((p as any).estimated_revenue || 0);
        const stage = String((p as any).status || "");
        const prob = PROSPECT_PROBABILITY[stage] ?? 0.2;
        bucket[month].forecast += revenue * prob;
        if (stage === "won" || stage === "beo_created") {
          bucket[month].actual += revenue;
        }
      }

      return res.json({
        success: true,
        data: {
          year,
          months: Object.values(bucket).map((m) => ({
            ...m,
            gap: m.goal - m.actual,
          })),
        },
      });
    }

    const [
      { data: prospects, error: pErr },
      { data: monthlyGoals, error: mErr },
      { data: salesGoals, error: sErr },
    ] = await Promise.all([
      supabase
        .from("prospects")
        .select("event_date, estimated_revenue, status")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .gte("event_date", start)
        .lt("event_date", end),
      supabase
        .from("crm_monthly_revenue_goals")
        .select("month, goal_revenue")
        .eq("org_id", orgId)
        .gte("month", start)
        .lt("month", end),
      supabase
        .from("crm_sales_goals")
        .select("monthly_targets")
        .eq("org_id", orgId)
        .eq("year", year),
    ]);

    if (pErr) throw pErr;
    if (mErr) throw mErr;
    if (sErr) throw sErr;

    const monthlyGoalMap = new Map<string, number>();
    for (const goal of monthlyGoals || []) {
      monthlyGoalMap.set(String(goal.month), Number(goal.goal_revenue || 0));
    }
    const salesGoalMap = new Map<string, number>();
    for (const goal of salesGoals || []) {
      const targets =
        goal.monthly_targets && typeof goal.monthly_targets === "object"
          ? (goal.monthly_targets as Record<string, number>)
          : {};
      Object.entries(targets).forEach(([month, value]) => {
        salesGoalMap.set(month, (salesGoalMap.get(month) || 0) + Number(value || 0));
      });
    }

    const bucket: Record<string, { month: string; goal: number; forecast: number; actual: number }> =
      {};
    months.forEach((month) => {
      bucket[month] = {
        month,
        goal: monthlyGoalMap.get(month) ?? salesGoalMap.get(month) ?? 0,
        forecast: 0,
        actual: 0,
      };
    });

    for (const p of prospects || []) {
      const eventDate = String((p as any).event_date || "");
      if (!eventDate) continue;
      const month = normalizeMonth(new Date(`${eventDate}T00:00:00.000Z`));
      if (!bucket[month]) continue;
      const revenue = Number((p as any).estimated_revenue || 0);
      const stage = String((p as any).status || "");
      const prob = PROSPECT_PROBABILITY[stage] ?? 0.2;
      bucket[month].forecast += revenue * prob;
      if (stage === "won" || stage === "beo_created") {
        bucket[month].actual += revenue;
      }
    }

    res.json({
      success: true,
      data: {
        year,
        months: Object.values(bucket).map((m) => ({
          ...m,
          gap: m.goal - m.actual,
        })),
      },
    });
  } catch (error: any) {
    logger.error("[CRM] Budget rollup error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/crm/forecast?months=18
 * Computes month buckets based on prospects.event_date and estimated_revenue.
 */
router.get("/forecast", async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgUser(req);
    const months = Math.min(parseInt(req.query.months as string) || 18, 36);

    const now = new Date();
    const start = normalizeMonth(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    );
    const end = addMonths(start, months);

    const supabase = tryGetSupabase();

    if (!supabase) {
      await ensureLocalCrmSeed(orgId);
      const [prospects, goals] = await Promise.all([
        listLocalProspects({ orgId }),
        listLocalGoals({ orgId, fromMonth: start, toMonthExclusive: end }),
      ]);
      const goalByMonth = new Map<string, number>();
      for (const g of goals || []) {
        goalByMonth.set(String(g.month), Number(g.goal_revenue || 0));
      }

      const bucket: Record<
        string,
        {
          month: string;
          pipeline: number;
          weighted: number;
          goal: number;
          gap: number;
          byStage: Record<string, number>;
        }
      > = {};

      for (let i = 0; i < months; i++) {
        const m = addMonths(start, i);
        const goal = goalByMonth.get(m) || 0;
        bucket[m] = {
          month: m,
          pipeline: 0,
          weighted: 0,
          goal,
          gap: 0,
          byStage: {},
        };
      }

      for (const p of prospects || []) {
        const eventDate = String((p as any).event_date || "");
        if (!eventDate) continue;
        const month = normalizeMonth(new Date(`${eventDate}T00:00:00.000Z`));
        if (!bucket[month]) continue;

        const revenue = Number((p as any).estimated_revenue || 0);
        if (revenue <= 0) continue;

        const stage = String((p as any).status || "");
        const prob = PROSPECT_PROBABILITY[stage] ?? 0.2;

        bucket[month].pipeline += revenue;
        bucket[month].weighted += revenue * prob;
        bucket[month].byStage[stage] =
          (bucket[month].byStage[stage] || 0) + revenue;
      }

      const monthsOut = Object.values(bucket)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((m) => ({ ...m, gap: m.goal - m.weighted }));

      return res.json({ success: true, data: { start, months: monthsOut } });
    }

    const [{ data: prospects, error: pErr }, { data: goals, error: gErr }] =
      await Promise.all([
        supabase
          .from("prospects")
          .select("event_date, estimated_revenue, status")
          .eq("org_id", orgId)
          .is("deleted_at", null)
          .gte("event_date", start)
          .lt("event_date", end),
        supabase
          .from("crm_monthly_revenue_goals")
          .select("month, goal_revenue")
          .eq("org_id", orgId)
          .gte("month", start)
          .lt("month", end),
      ]);

    if (pErr) throw pErr;
    if (gErr) throw gErr;

    const goalByMonth = new Map<string, number>();
    for (const g of goals || []) {
      goalByMonth.set(String(g.month), Number(g.goal_revenue || 0));
    }

    const bucket: Record<
      string,
      {
        month: string;
        pipeline: number;
        weighted: number;
        goal: number;
        gap: number;
        byStage: Record<string, number>;
      }
    > = {};

    for (let i = 0; i < months; i++) {
      const m = addMonths(start, i);
      const goal = goalByMonth.get(m) || 0;
      bucket[m] = {
        month: m,
        pipeline: 0,
        weighted: 0,
        goal,
        gap: 0,
        byStage: {},
      };
    }

    for (const p of prospects || []) {
      const eventDate = String(p.event_date || "");
      if (!eventDate) continue;
      const month = normalizeMonth(new Date(`${eventDate}T00:00:00.000Z`));
      if (!bucket[month]) continue;

      const revenue = Number(p.estimated_revenue || 0);
      if (revenue <= 0) continue;

      const stage = String(p.status || "");
      const prob = PROSPECT_PROBABILITY[stage] ?? 0.2;

      bucket[month].pipeline += revenue;
      bucket[month].weighted += revenue * prob;
      bucket[month].byStage[stage] =
        (bucket[month].byStage[stage] || 0) + revenue;
    }

    const monthsOut = Object.values(bucket)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ ...m, gap: m.goal - m.weighted }));

    res.json({ success: true, data: { start, months: monthsOut } });
  } catch (error: any) {
    logger.error("[CRM] Forecast error", { error });
    res.status(error?.message === "Not authenticated" ? 401 : 500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

export default router;

