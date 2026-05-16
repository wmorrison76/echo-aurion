/**
 * POS Bridge API (Moat 5: unified POS abstraction layer)
 * Canonical schema for checks, line items, refunds; adapters per POS (Toast, Square, NCR, Micros).
 * GET /api/pos-bridge/checks — list checks (delegate by outlet/integration)
 * POST /api/pos-bridge/checks — create/open check (stub)
 * GET /api/pos-bridge/checks/:id — get check by canonical id
 */

import { Router, Request, Response } from "express";
import { getOrgId } from "../lib/org-resolver";
import { getSupabaseServiceClient } from "../lib/supabase-service-client";

const router = Router();

export interface POSBridgeCheck {
  id: string;
  outletId: string;
  posIntegrationId: string;
  posCheckId: string;
  tableId?: string;
  openedAt: string;
  closedAt?: string;
  status: "open" | "closed" | "voided";
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  guestCount?: number;
}

export interface POSBridgeLineItem {
  id: string;
  checkId: string;
  posItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; price: number }[];
  total: number;
  voided: boolean;
}

router.get("/checks", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const outletId = req.query.outletId as string | undefined;
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    let supabase: ReturnType<typeof getSupabaseServiceClient> | null = null;
    try {
      supabase = getSupabaseServiceClient();
    } catch {
      return res.json({ checks: [], message: "POS bridge: no DB; wire to adapters for live data" });
    }
    const { data: integrations } = await supabase
      .from("pos_integrations")
      .select("id, outlet_id, pos_type, last_sync_at")
      .eq("org_id", orgId)
      .eq("is_active", true);
    const checks: POSBridgeCheck[] = (integrations || []).slice(0, 20).map((row: any, i: number) => ({
      id: `ch_${row.id}_${i}`,
      outletId: row.outlet_id ?? orgId,
      posIntegrationId: row.id,
      posCheckId: `pos-${row.pos_type}-${Date.now()}-${i}`,
      openedAt: new Date(Date.now() - 3600000).toISOString(),
      status: "open" as const,
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
    }));
    const filtered = outletId ? checks.filter((c) => c.outletId === outletId) : checks;
    res.json({ orgId, date, checks: filtered });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Internal server error" });
  }
});

router.get("/checks/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Check id required" });
  res.json({
    id,
    outletId: "",
    posIntegrationId: "",
    posCheckId: id,
    openedAt: new Date().toISOString(),
    status: "open",
    subtotal: 0,
    tax: 0,
    tip: 0,
    total: 0,
    lineItems: [],
    message: "Wire to adapter by integration id for full check + line items",
  });
});

router.post("/checks", async (req: Request, res: Response) => {
  const body = req.body || {};
  const { outletId, posIntegrationId, tableId, guestCount } = body;
  const checkId = `ch_${Date.now()}`;
  res.status(201).json({
    id: checkId,
    outletId: outletId ?? "",
    posIntegrationId: posIntegrationId ?? "",
    posCheckId: checkId,
    tableId: tableId ?? null,
    openedAt: new Date().toISOString(),
    status: "open",
    subtotal: 0,
    tax: 0,
    tip: 0,
    total: 0,
    guestCount: guestCount ?? null,
    message: "Stub: adapter creates check in POS and returns canonical shape",
  });
});

export default router;
