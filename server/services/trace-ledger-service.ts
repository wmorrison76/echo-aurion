import { z } from "zod";
import { randomUUID } from "crypto";
import { getSupabaseServiceClient } from "../lib/supabase-service-client";
import { logger } from "../lib/logger";
import type {
  TraceLedgerAppendInput,
  TraceLedgerEntry,
  TraceEvent,
} from "../../shared/types/trace-ledger";

const TraceLedgerAppendSchema = z.object({
  orgId: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  sourceRef: z.string().nullable().optional(),
  payload: z.record(z.unknown()),
});

const mapRowToEntry = (row: any): TraceLedgerEntry => ({
  id: row.id,
  orgId: row.org_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  sourceRef: row.source_ref ?? null,
  payload: row.payload ?? {},
  createdAt: row.created_at,
});

export class TraceLedgerService {
  async getById(orgId: string, id: string): Promise<TraceLedgerEntry | null> {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("trace_ledger")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logger.error("[TraceLedger] getById failed", { error });
      throw error;
    }

    return data ? mapRowToEntry(data) : null;
  }
  async append(input: TraceLedgerAppendInput): Promise<TraceLedgerEntry> {
    const payload = TraceLedgerAppendSchema.parse(input);
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("trace_ledger")
      .insert({
        org_id: payload.orgId,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        source_ref: payload.sourceRef ?? null,
        payload: payload.payload,
      })
      .select("*")
      .single();

    if (error) {
      logger.error("[TraceLedger] append failed", { error });
      throw error;
    }

    return mapRowToEntry(data);
  }

  async listByEntity(
    orgId: string,
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<TraceLedgerEntry[]> {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("trace_ledger")
      .select("*")
      .eq("org_id", orgId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("[TraceLedger] listByEntity failed", { error });
      throw error;
    }

    return (data ?? []).map(mapRowToEntry);
  }

  async listBySourceRef(
    orgId: string,
    sourceRef: string,
    limit = 100,
  ): Promise<TraceLedgerEntry[]> {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("trace_ledger")
      .select("*")
      .eq("org_id", orgId)
      .eq("source_ref", sourceRef)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("[TraceLedger] listBySourceRef failed", { error });
      throw error;
    }

    return (data ?? []).map(mapRowToEntry);
  }

  /**
   * Emit a standardized trace event
   * 
   * Validates required fields and stores event in payload.
   * Handles missing links gracefully (creates gap entries instead of errors).
   * 
   * @param orgId Organization ID
   * @param event TraceEvent with all required fields
   * @param entityType Entity type (e.g., "menu", "forecast", "inventory")
   * @param entityId Entity ID
   * @param sourceRef Optional source reference for linking related traces
   * @returns TraceLedgerEntry
   */
  async emitTraceEvent(
    orgId: string,
    event: TraceEvent,
    entityType: string,
    entityId: string,
    sourceRef?: string | null,
  ): Promise<TraceLedgerEntry> {
    // Validate required fields
    if (!event.actor || !event.actor.userId || !event.actor.role) {
      logger.warn("[TraceLedger] Missing required actor fields", {
        event: { sourcePanel: event.sourcePanel, domain: event.domain },
      });
      // Continue with defaults - don't throw
    }

    if (!event.sourcePanel || !event.domain || !event.traceId) {
      logger.warn("[TraceLedger] Missing required trace event fields", {
        hasSourcePanel: !!event.sourcePanel,
        hasDomain: !!event.domain,
        hasTraceId: !!event.traceId,
      });
      // Continue anyway - graceful degradation
    }

    // Handle missing downstream implications gracefully (gaps, not errors)
    if (event.downstreamImplications && event.downstreamImplications.length === 0) {
      logger.debug("[TraceLedger] Trace event has no downstream implications (gap)", {
        traceId: event.traceId,
        sourcePanel: event.sourcePanel,
        domain: event.domain,
      });
    }

    // Store event in payload field
    const payload: Record<string, unknown> = {
      ...event,
      // Ensure all required fields are present
      actor: event.actor || { userId: "system", role: "system" },
      sourcePanel: event.sourcePanel || "unknown",
      domain: event.domain || "unknown",
      inputs: event.inputs || {},
      outputs: event.outputs || {},
      timestamp: event.timestamp || new Date().toISOString(),
      traceId: event.traceId || randomUUID(),
    };

    // Use append method to store
    return this.append({
      orgId,
      entityType,
      entityId,
      sourceRef: sourceRef ?? null,
      payload,
    });
  }
}
