/**
 * Toast (POS) connector — Integration SDK adapter
 * Partial read-only ingestion: fetch orders/menu, map to LUCCCA entities, validate, emitTrace, reconcile.
 */

import type {
  Adapter,
  AdapterConfig,
  SourceRecord,
  MappedEntity,
  ReconcileResult,
  IngestionTraceEvent,
} from "../adapter";
import { buildIngestionTrace } from "../adapter";
import { ToastClient } from "../../toast/client";
import { logger } from "../../../lib/logger";

const CONNECTOR_ID = "toast";

async function getToastClient(config: AdapterConfig): Promise<ToastClient | null> {
  const { credentials } = config;
  if (!credentials?.clientId || !credentials?.clientSecret) return null;
  try {
    const client = new ToastClient({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      redirectUri: credentials.redirectUri || "https://localhost/callback",
      baseUrl: credentials.baseUrl || "https://ws-api.toasttab.com",
    });
    if (credentials.accessToken) (client as any).accessToken = credentials.accessToken;
    return client;
  } catch (e) {
    logger.warn("[ToastAdapter] Init failed", { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export const toastAdapter: Adapter = {
  async fetch(config, options = {}) {
    const client = await getToastClient(config);
    if (!client) return [];
    const limit = options.limit ?? 10;
    const since = options.since;
    const records: SourceRecord[] = [];
    try {
      const locations = await client.getLocations();
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startStr = since || start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      for (const loc of (locations as any[]).slice(0, 2)) {
        const orders = await client.getOrders(loc.guid, startStr, endStr, 1, limit);
        for (const o of (orders as any[])) {
          records.push({
            id: o.guid ?? o.id ?? `order-${Date.now()}`,
            source: CONNECTOR_ID,
            raw: o,
            fetchedAt: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      logger.warn("[ToastAdapter] Fetch error", { error: e instanceof Error ? e.message : String(e) });
    }
    return records;
  },

  async map(record, config) {
    const raw = record.raw as any;
    const guid = raw.guid ?? raw.id ?? record.id;
    const entityId = `toast-order-${config.orgId}-${guid}`;
    return {
      entityType: "sale",
      entityId,
      payload: {
        sourceId: guid,
        locationGuid: raw.locationGuid,
        grandTotal: raw.grandTotal,
        createdDate: raw.createdDate,
        closedDate: raw.closedDate,
        covers: raw.covers,
      },
      sourceId: guid,
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
      logger.warn("[ToastAdapter] emitTrace failed", { error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  async reconcile(config, sourceRecord, luccaRecord) {
    const at = new Date().toISOString();
    if (!luccaRecord) {
      return { match: false, reasonCode: "MISSING_IN_LUCCCA", sourceId: sourceRecord.id, at };
    }
    const raw = sourceRecord.raw as any;
    const luccaTotal = (luccaRecord as any).grandTotal ?? (luccaRecord as any).total;
    const sourceTotal = raw.grandTotal ?? raw.total;
    if (sourceTotal != null && luccaTotal != null && Math.abs(Number(sourceTotal) - Number(luccaTotal)) > 0.01) {
      return {
        match: false,
        reasonCode: "AMOUNT_MISMATCH",
        sourceId: sourceRecord.id,
        luccaId: (luccaRecord as any).id,
        diff: { grandTotal: { source: sourceTotal, lucca: luccaTotal } },
        at,
      };
    }
    return { match: true, reasonCode: "MATCH", sourceId: sourceRecord.id, luccaId: (luccaRecord as any).id, at };
  },
};
