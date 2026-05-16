/**
 * EDI Monitoring routes
 *
 * C0.4: replaces the prior all-zero mock returns with real Supabase
 * queries. The endpoints now compute stats from the canonical edi_messages
 * table when it exists; if it doesn't (e.g. the deployment doesn't run
 * EDI), the route returns an explicit 501 Not Implemented with a helpful
 * message rather than an all-zero JSON that looks healthy to schema
 * validators but is fiction.
 *
 * The retry endpoint enqueues a real retry job in edi_retry_queue (or
 * 501s if that table doesn't exist).
 */

import { Router, Request, Response } from "express";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";

const router = Router();
router.use(basicAuthMiddleware);

/** Returns true if a probed query succeeds. Used to detect whether the
 *  EDI tables exist in the current DB before pretending to query them. */
async function probeTable(table: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(table).select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

const NOT_PROVISIONED = {
  status: 501,
  body: {
    error: "EDI monitoring not provisioned",
    detail:
      "The edi_messages / edi_retry_queue tables are not present in this database. " +
      "Provision the EDI integration migrations before calling this endpoint, " +
      "or remove EDI from the deployment scope.",
    provisioned: false,
  },
};

/**
 * GET /api/edi-monitoring/stats
 * Real EDI message statistics computed from edi_messages.
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.query;
    if (!organization_id) {
      return res.status(400).json({ error: "organization_id required" });
    }

    if (!(await probeTable("edi_messages"))) {
      return res.status(NOT_PROVISIONED.status).json(NOT_PROVISIONED.body);
    }

    const { data: rows, error } = await supabase
      .from("edi_messages")
      .select(
        "id, supplier_id, supplier_name, message_type, status, direction, error_message, created_at, sent_at, received_at",
      )
      .eq("organization_id", organization_id);

    if (error) {
      logger.error("[EDI] stats fetch failed", { error: error.message ?? String(error) });
      return res.status(500).json({ error: error.message ?? String(error) });
    }

    const messages = Array.isArray(rows) ? rows : [];
    const total = messages.length;
    const errors = messages.filter((m) => m.status === "error").length;
    const successful = messages.filter((m) =>
      ["sent", "received", "acknowledged"].includes(m.status),
    ).length;
    const successRate = total === 0 ? 0 : Number(((successful / total) * 100).toFixed(2));
    const errorRate = total === 0 ? 0 : Number(((errors / total) * 100).toFixed(2));

    const messagesByType: Record<string, { sent: number; received: number; errors: number }> = {
      PO: { sent: 0, received: 0, errors: 0 },
      INVOICE: { sent: 0, received: 0, errors: 0 },
      ASN: { sent: 0, received: 0, errors: 0 },
    };
    for (const m of messages) {
      const t = (m.message_type ?? "").toUpperCase();
      const bucket = messagesByType[t] ?? (messagesByType[t] = { sent: 0, received: 0, errors: 0 });
      if (m.status === "error") bucket.errors += 1;
      else if (m.direction === "outbound") bucket.sent += 1;
      else if (m.direction === "inbound") bucket.received += 1;
    }

    const messagesByStatus: Record<string, number> = {
      pending: 0,
      sent: 0,
      received: 0,
      error: 0,
    };
    for (const m of messages) {
      const s = m.status ?? "pending";
      messagesByStatus[s] = (messagesByStatus[s] ?? 0) + 1;
    }

    const supplierAgg = new Map<
      string,
      { supplier_id: string; supplier_name: string; total: number; success: number; errors: number }
    >();
    for (const m of messages) {
      if (!m.supplier_id) continue;
      const agg = supplierAgg.get(m.supplier_id) ?? {
        supplier_id: m.supplier_id,
        supplier_name: m.supplier_name ?? m.supplier_id,
        total: 0,
        success: 0,
        errors: 0,
      };
      agg.total += 1;
      if (m.status === "error") agg.errors += 1;
      else if (["sent", "received", "acknowledged"].includes(m.status)) agg.success += 1;
      supplierAgg.set(m.supplier_id, agg);
    }
    const messagesBySupplier = Array.from(supplierAgg.values()).map((s) => ({
      ...s,
      successRate: s.total === 0 ? 0 : Number(((s.success / s.total) * 100).toFixed(2)),
    }));

    const recentErrors = messages
      .filter((m) => m.status === "error")
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 20)
      .map((m) => ({
        id: m.id,
        supplier_id: m.supplier_id,
        message_type: m.message_type,
        error_message: m.error_message ?? "(no error message)",
        created_at: m.created_at,
      }));

    const last24Cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const last24 = messages.filter(
      (m) => m.created_at && new Date(m.created_at).getTime() >= last24Cutoff,
    );
    const last24Hours = {
      sent: last24.filter((m) => m.direction === "outbound").length,
      received: last24.filter((m) => m.direction === "inbound").length,
      errors: last24.filter((m) => m.status === "error").length,
    };

    res.json({
      provisioned: true,
      totalMessages: total,
      successRate,
      errorRate,
      messagesByType,
      messagesByStatus,
      messagesBySupplier,
      recentErrors,
      last24Hours,
    });
  } catch (error) {
    logger.error("Failed to get EDI stats", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/edi-monitoring/messages
 * Real paginated message feed.
 */
router.get("/messages", async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      supplier_id,
      message_type,
      status,
      direction,
      limit = "50",
      offset = "0",
    } = req.query;
    if (!organization_id) {
      return res.status(400).json({ error: "organization_id required" });
    }
    if (!(await probeTable("edi_messages"))) {
      return res.status(NOT_PROVISIONED.status).json(NOT_PROVISIONED.body);
    }

    const lim = Math.min(500, Math.max(1, parseInt(limit as string) || 50));
    const off = Math.max(0, parseInt(offset as string) || 0);

    let q = supabase
      .from("edi_messages")
      .select("*", { count: "exact" })
      .eq("organization_id", organization_id);
    if (supplier_id) q = q.eq("supplier_id", supplier_id);
    if (message_type) q = q.eq("message_type", String(message_type).toUpperCase());
    if (status) q = q.eq("status", status);
    if (direction) q = q.eq("direction", direction);

    const { data, error, count } = await q
      .order("created_at", { ascending: false })
      .range(off, off + lim - 1);
    if (error) {
      return res.status(500).json({ error: error.message ?? String(error) });
    }
    res.json({
      provisioned: true,
      messages: data ?? [],
      total: count ?? (data?.length ?? 0),
      limit: lim,
      offset: off,
    });
  } catch (error) {
    logger.error("Failed to get EDI messages", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/edi-monitoring/suppliers
 * Real per-supplier EDI health, computed from edi_messages.
 */
router.get("/suppliers", async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.query;
    if (!organization_id) {
      return res.status(400).json({ error: "organization_id required" });
    }
    if (!(await probeTable("edi_messages"))) {
      return res.status(NOT_PROVISIONED.status).json(NOT_PROVISIONED.body);
    }
    const { data, error } = await supabase
      .from("edi_messages")
      .select("supplier_id, supplier_name, status, created_at")
      .eq("organization_id", organization_id);
    if (error) {
      return res.status(500).json({ error: error.message ?? String(error) });
    }
    const agg = new Map<
      string,
      {
        supplier_id: string;
        supplier_name: string;
        edi_enabled: boolean;
        last_message_at?: string;
        total_messages: number;
        successes: number;
        errors: number;
        status: "active" | "inactive" | "error";
      }
    >();
    for (const m of data ?? []) {
      if (!m.supplier_id) continue;
      const a = agg.get(m.supplier_id) ?? {
        supplier_id: m.supplier_id,
        supplier_name: m.supplier_name ?? m.supplier_id,
        edi_enabled: true,
        total_messages: 0,
        successes: 0,
        errors: 0,
        status: "active" as const,
      };
      a.total_messages += 1;
      if (m.status === "error") a.errors += 1;
      else if (["sent", "received", "acknowledged"].includes(m.status)) a.successes += 1;
      if (!a.last_message_at || (m.created_at && m.created_at > a.last_message_at)) {
        a.last_message_at = m.created_at;
      }
      agg.set(m.supplier_id, a);
    }
    const suppliers = Array.from(agg.values()).map((s) => ({
      supplier_id: s.supplier_id,
      supplier_name: s.supplier_name,
      edi_enabled: s.edi_enabled,
      last_message_at: s.last_message_at,
      total_messages: s.total_messages,
      success_rate:
        s.total_messages === 0
          ? 0
          : Number(((s.successes / s.total_messages) * 100).toFixed(2)),
      status:
        s.errors > 0 && s.errors / s.total_messages > 0.2
          ? "error"
          : s.total_messages > 0
            ? "active"
            : "inactive",
    }));
    res.json({ provisioned: true, suppliers });
  } catch (error) {
    logger.error("Failed to get supplier EDI status", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/edi-monitoring/retry
 * Real retry — inserts a row into edi_retry_queue. The EDI sender worker
 * picks rows up; we don't replay synchronously to avoid blocking the
 * request thread.
 */
router.post("/retry", async (req: Request, res: Response) => {
  try {
    const { message_id, organization_id } = req.body ?? {};
    if (!message_id) {
      return res.status(400).json({ error: "message_id required" });
    }
    if (!(await probeTable("edi_retry_queue"))) {
      return res.status(NOT_PROVISIONED.status).json({
        ...NOT_PROVISIONED.body,
        detail:
          "edi_retry_queue table not present — retry cannot be enqueued. " +
          "Provision the EDI integration migrations before retrying.",
      });
    }
    const { data, error } = await supabase
      .from("edi_retry_queue")
      .insert({
        message_id,
        organization_id: organization_id ?? null,
        status: "queued",
        requested_at: new Date().toISOString(),
      })
      .select("id");
    if (error) {
      return res.status(500).json({ error: error.message ?? String(error) });
    }
    logger.info("[EDI] retry queued", { message_id, queueId: data?.[0]?.id });
    res.json({ success: true, message_id, status: "queued", queueId: data?.[0]?.id });
  } catch (error) {
    logger.error("Failed to retry EDI message", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
