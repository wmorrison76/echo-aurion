import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/checkbook/realtime", async (req: Request, res: Response) => {
  try {
    const orgId = (req.headers["x-org-id"] as string) || (req.query.orgId as string);
    if (!orgId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const { data: plRows, error } = await supabase
      .from("profit_loss")
      .select("outlet_id, period, revenue, cogs, updated_at")
      .eq("tenant_id", orgId)
      .order("period", { ascending: false })
      .limit(200);

    if (error) throw error;

    const latestByOutlet = new Map<string, any>();
    for (const row of plRows || []) {
      if (!latestByOutlet.has(row.outlet_id)) {
        latestByOutlet.set(row.outlet_id, row);
      }
    }

    const payload = Array.from(latestByOutlet.values()).map((row) => ({
      outletId: row.outlet_id,
      period: row.period,
      revenue: row.revenue || 0,
      cogs: row.cogs || 0,
      updatedAt: row.updated_at,
    }));

    res.json({ generatedAt: new Date().toISOString(), outlets: payload });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Checkbook data error",
    });
  }
});

export default router;
