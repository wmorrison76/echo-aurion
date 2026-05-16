/**
 * Sysco (vendor) connector — Integration SDK adapter
 * Partial read-only: fetch invoices/orders, map to receipts/POs, validate, emitTrace, reconcile.
 */

import type {
  Adapter,
  AdapterConfig,
  SourceRecord,
  MappedEntity,
  ReconcileResult,
} from "../adapter";
import { buildIngestionTrace } from "../adapter";
import { logger } from "../../../lib/logger";

const CONNECTOR_ID = "sysco";

export const syscoAdapter: Adapter = {
  async fetch(config, options = {}) {
    const { credentials } = config;
    if (!credentials?.apiKey) return [];
    const limit = options.limit ?? 10;
    const records: SourceRecord[] = [];
    try {
      // Stub: real implementation would call Sysco API (e.g. GET /invoices)
      const mock = [{ id: "sysco-inv-1", invoiceNumber: "INV001", total: 150.0, date: new Date().toISOString() }];
      for (const inv of mock.slice(0, limit)) {
        records.push({
          id: inv.id,
          source: CONNECTOR_ID,
          raw: inv,
          fetchedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      logger.warn("[SyscoAdapter] Fetch error", { error: e instanceof Error ? e.message : String(e) });
    }
    return records;
  },

  async map(record, config) {
    const raw = record.raw as any;
    const entityId = `sysco-invoice-${config.orgId}-${record.id}`;
    return {
      entityType: "vendor_invoice",
      entityId,
      payload: {
        sourceId: record.id,
        invoiceNumber: raw.invoiceNumber,
        total: raw.total,
        date: raw.date,
      },
      sourceId: record.id,
      sourceRecordId: record.id,
    };
  },

  async validate(mapped, config) {
    const errors: string[] = [];
    if (!mapped.entityId) errors.push("entityId required");
    if (!mapped.sourceRecordId) errors.push("sourceRecordId required");
    return { valid: errors.length === 0, errors };
  },

  async emitTrace(config, event, request) {
    const trace = buildIngestionTrace(
      CONNECTOR_ID,
      event.eventType,
      event.sourceRecordId,
      event.entityType,
      event.entityId,
      event.inputs,
      event.outputs
    );
    try {
      const { emitTrace: serverEmit } = await import("../../../lib/trace-emitter");
      const res = await serverEmit(request as any, event.entityType, event.entityId, trace.sourcePanel, trace.domain, trace.inputs, trace.outputs, {
        traceId: trace.traceId,
        sourceRef: `integration:${CONNECTOR_ID}:${event.sourceRecordId}`,
        system: CONNECTOR_ID,
      });
      return res ? { traceId: trace.traceId } : null;
    } catch (e) {
      logger.warn("[SyscoAdapter] emitTrace failed", { error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  async reconcile(config, sourceRecord, luccaRecord) {
    const at = new Date().toISOString();
    if (!luccaRecord) {
      return { match: false, reasonCode: "MISSING_IN_LUCCCA", sourceId: sourceRecord.id, at };
    }
    const raw = sourceRecord.raw as any;
    const luccaTotal = (luccaRecord as any).total;
    const sourceTotal = raw.total;
    if (sourceTotal != null && luccaTotal != null && Math.abs(Number(sourceTotal) - Number(luccaTotal)) > 0.01) {
      return {
        match: false,
        reasonCode: "AMOUNT_MISMATCH",
        sourceId: sourceRecord.id,
        luccaId: (luccaRecord as any).id,
        diff: { total: { source: sourceTotal, lucca: luccaTotal } },
        at,
      };
    }
    return { match: true, reasonCode: "MATCH", sourceId: sourceRecord.id, luccaId: (luccaRecord as any).id, at };
  },
};
