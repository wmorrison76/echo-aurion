/**
 * Payroll adapter placeholder — ADP or UKG
 * Integration SDK adapter interface + reconciliation hooks; no full payroll rebuild.
 */

import type { Adapter, AdapterConfig, SourceRecord, MappedEntity, ReconcileResult } from "../adapter";
import { buildIngestionTrace } from "../adapter";
import { logger } from "../../../lib/logger";

const CONNECTOR_ID = "payroll-adp-ukg";

export const payrollAdpUkgAdapter: Adapter = {
  async fetch(config, options = {}) {
    const { credentials } = config;
    if (!credentials?.clientId) return [];
    const limit = options.limit ?? 10;
    const records: SourceRecord[] = [];
    try {
      // Stub: real implementation would call ADP/UKG API (e.g. pay runs, employee hours)
      const mock = [{ id: "payrun-1", periodStart: "2025-01-01", periodEnd: "2025-01-15", totalWages: 0 }];
      for (const r of mock.slice(0, limit)) {
        records.push({ id: r.id, source: CONNECTOR_ID, raw: r, fetchedAt: new Date().toISOString() });
      }
    } catch (e) {
      logger.warn("[PayrollAdapter] Fetch error", { error: e instanceof Error ? e.message : String(e) });
    }
    return records;
  },

  async map(record, config) {
    const raw = record.raw as any;
    const entityId = `payroll-run-${config.orgId}-${record.id}`;
    return {
      entityType: "payroll_run",
      entityId,
      payload: { sourceId: record.id, periodStart: raw.periodStart, periodEnd: raw.periodEnd, totalWages: raw.totalWages },
      sourceId: record.id,
      sourceRecordId: record.id,
    };
  },

  async validate(mapped, config) {
    const errors: string[] = [];
    if (!mapped.entityId) errors.push("entityId required");
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
      logger.warn("[PayrollAdapter] emitTrace failed", { error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  async reconcile(config, sourceRecord, luccaRecord) {
    const at = new Date().toISOString();
    if (!luccaRecord) return { match: false, reasonCode: "MISSING_IN_LUCCCA", sourceId: sourceRecord.id, at };
    const raw = sourceRecord.raw as any;
    const luccaTotal = (luccaRecord as any).totalWages ?? (luccaRecord as any).total;
    const sourceTotal = raw.totalWages ?? raw.total;
    if (sourceTotal != null && luccaTotal != null && Math.abs(Number(sourceTotal) - Number(luccaTotal)) > 0.01) {
      return {
        match: false,
        reasonCode: "AMOUNT_MISMATCH",
        sourceId: sourceRecord.id,
        luccaId: (luccaRecord as any).id,
        diff: { totalWages: { source: sourceTotal, lucca: luccaTotal } },
        at,
      };
    }
    return { match: true, reasonCode: "MATCH", sourceId: sourceRecord.id, luccaId: (luccaRecord as any).id, at };
  },
};
