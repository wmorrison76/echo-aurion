/**
 * TraceLedger API
 * Query endpoint for trace ledger entries
 */

import { Router, Request, Response } from "express";
import { TraceLedgerEntry } from "@shared/types/trace-ledger";

const router = Router();

type TraceLink = {
  id: string;
  label: string;
  entityType: string;
  entityId: string;
};

type TraceRecord = {
  id: string;
  timestamp: string;
  source: string;
  entityType: string;
  entityId: string;
  summary: string;
  chain: TraceLink[];
  sourceRef?: string | null;
};

// In-memory trace ledger (in production, this would be a database)
const TRACE_LEDGER: TraceRecord[] = [
  {
    id: "trace-001",
    timestamp: new Date().toISOString(),
    source: "Inventory Ingest",
    entityType: "Invoice",
    entityId: "INV-00412",
    summary: "Invoice captured from vendor delivery batch.",
    chain: [
      { id: "inv", label: "Invoice", entityType: "Invoice", entityId: "INV-00412" },
      { id: "stg", label: "Storage", entityType: "Storage", entityId: "STO-77A" },
      { id: "rec", label: "Recipe", entityType: "Recipe", entityId: "REC-LOBSTER" },
      { id: "plt", label: "Plate", entityType: "Plate", entityId: "PLT-LOBSTER-2" },
    ],
  },
  {
    id: "trace-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    source: "Storage Sync",
    entityType: "Storage",
    entityId: "STO-77A",
    summary: "Inventory lot stored and tagged for traceability.",
    chain: [
      { id: "inv", label: "Invoice", entityType: "Invoice", entityId: "INV-00412" },
      { id: "stg", label: "Storage", entityType: "Storage", entityId: "STO-77A" },
      { id: "rec", label: "Recipe", entityType: "Recipe", entityId: "REC-LOBSTER" },
      { id: "plt", label: "Plate", entityType: "Plate", entityId: "PLT-LOBSTER-2" },
    ],
  },
  {
    id: "trace-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    source: "Culinary Assembly",
    entityType: "Recipe",
    entityId: "REC-LOBSTER",
    summary: "Recipe execution linked to inventory lot and plating.",
    chain: [
      { id: "inv", label: "Invoice", entityType: "Invoice", entityId: "INV-00412" },
      { id: "stg", label: "Storage", entityType: "Storage", entityId: "STO-77A" },
      { id: "rec", label: "Recipe", entityType: "Recipe", entityId: "REC-LOBSTER" },
      { id: "plt", label: "Plate", entityType: "Plate", entityId: "PLT-LOBSTER-2" },
    ],
  },
];

router.get("/trace-ledger", async (req: Request, res: Response) => {
  try {
    const entity = String(req.query.entity || "").toLowerCase();
    const source = String(req.query.source || "").toLowerCase();
    const sourceRef = String(req.query.sourceRef || req.query.source_ref || "");
    const q = String(req.query.q || "").toLowerCase();

    // If sourceRef is provided, query by sourceRef for causality reconstruction
    if (sourceRef) {
      const { TraceLedgerService } = await import("../services/trace-ledger-service");
      const traceLedgerService = new TraceLedgerService();
      
      // Get orgId from request (or use default for demo)
      const orgId = (req as any).user?.org_id || "default";
      
      try {
        const entries = await traceLedgerService.listBySourceRef(orgId, sourceRef, 100);
        
        // Transform to TraceRecord format
        const records: TraceRecord[] = entries.map((entry) => {
          const payload = entry.payload as any;
          return {
            id: entry.id,
            timestamp: entry.createdAt,
            source: payload.sourcePanel || payload.source || "Unknown",
            entityType: entry.entityType,
            entityId: entry.entityId,
            summary: payload.summary || `${entry.entityType} ${entry.entityId} trace entry`,
            chain: payload.chain || [],
            sourceRef: entry.sourceRef || null,
          };
        });

        return res.json({ records, sourceRef });
      } catch (error) {
        // Fall back to in-memory if database query fails
        console.warn("[TraceLedger] Database query failed, using in-memory data", error);
      }
    }

    // Fallback to in-memory filtering
    const filtered = TRACE_LEDGER.filter((record) => {
      const matchesEntity =
        !entity ||
        record.entityId.toLowerCase().includes(entity) ||
        record.entityType.toLowerCase().includes(entity) ||
        record.chain.some((link) => link.entityId.toLowerCase().includes(entity));

      const matchesSource = !source || record.source.toLowerCase().includes(source);

      const matchesSearch =
        !q ||
        record.summary.toLowerCase().includes(q) ||
        record.chain.some((link) =>
          `${link.entityType} ${link.entityId}`.toLowerCase().includes(q),
        );

      return matchesEntity && matchesSource && matchesSearch;
    });

    res.json({ records: filtered });
  } catch (error) {
    console.error("[TraceLedger] Route error", error);
    res.status(500).json({ error: "Trace ledger query failed", records: [] });
  }
});

/**
 * GET /trace-ledger/replay?traceId=... or ?entityId=...
 * Cognitive replay: upstream/downstream chain + narrated explanation with citations.
 */
router.get("/trace-ledger/replay", async (req: Request, res: Response) => {
  try {
    const traceId = String(req.query.traceId || req.query.trace_id || "").trim();
    const entityId = String(req.query.entityId || req.query.entity_id || "").trim();
    if (!traceId && !entityId) {
      return res.status(400).json({ error: "traceId or entityId required", chain: [], narrative: "" });
    }
    const q = traceId || entityId;
    // Resolve from TraceLedgerService if available (listBySourceRef for traceId, listByEntity for entityId)
    try {
      const { TraceLedgerService } = await import("../services/trace-ledger-service");
      const svc = new TraceLedgerService();
      const orgId = (req as any).user?.org_id || "default";
      const entries = traceId
        ? await svc.listBySourceRef(orgId, traceId, 50)
        : await svc.listByEntity(orgId, "trace", entityId, 50);
      const chain = entries.map((e: any) => ({
        id: e.id,
        type: e.entityType,
        summary: (e.payload as any)?.summary || `${e.entityType} ${e.entityId}`,
      }));
      const narrative = chain.length
        ? `Trace chain: ${chain.map((c: any) => c.type + " " + c.id).join(" → ")}.`
        : "";
      return res.json({ chain, narrative, traceId: traceId || undefined, entityId: entityId || undefined });
    } catch {
      // Fallback: build chain from in-memory TRACE_LEDGER
      const record = TRACE_LEDGER.find(
        (r) => r.id === q || r.entityId === q || r.entityType.toLowerCase().includes(q.toLowerCase()),
      );
      const chain = record
        ? [
            { id: record.id, type: record.entityType, summary: record.summary },
            ...record.chain.map((l) => ({ id: l.id, type: l.entityType, summary: `${l.label} ${l.entityId}` })),
          ]
        : [];
      const narrative = chain.length
        ? `Trace chain: ${chain.map((c: any) => c.type + " " + c.id).join(" → ")}.`
        : "No chain found for this trace or entity.";
      return res.json({ chain, narrative, traceId: traceId || undefined, entityId: entityId || undefined });
    }
  } catch (error) {
    console.error("[TraceLedger] Replay error", error);
    res.status(500).json({ error: "Replay failed", chain: [], narrative: "" });
  }
});

export default router;
