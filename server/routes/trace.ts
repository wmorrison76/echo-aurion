/**
 * Trace API Route
 * 
 * Receives client-side trace events, validates structure,
 * enriches with server context, and emits via TraceLedgerService.
 */

import { RequestHandler } from "express";
import { z } from "zod";
import { emitTrace } from "../lib/trace-emitter";
import { logger } from "../lib/logger";
import type { TraceEvent } from "../../shared/types/trace-ledger";

const TraceEventRequestSchema = z.object({
  event: z.object({
    actor: z.object({
      userId: z.string(),
      role: z.string(),
      system: z.string().optional(),
    }),
    sourcePanel: z.string(),
    domain: z.string(),
    inputs: z.record(z.unknown()),
    outputs: z.record(z.unknown()),
    downstreamImplications: z.array(z.any()).optional(),
    confidence: z.number().optional(),
    assumptions: z.array(z.string()).optional(),
    timestamp: z.string(),
    traceId: z.string(),
  }),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  sourceRef: z.string().optional(),
});

/**
 * POST /api/trace
 * Receive and process client-side trace event
 */
export const handleTrace: RequestHandler = async (req, res) => {
  try {
    // Validate request body
    const validation = TraceEventRequestSchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn("[TraceRoute] Invalid trace event request", {
        errors: validation.error.errors,
      });
      return res.status(400).json({
        ok: false,
        error: "Invalid trace event structure",
        details: validation.error.errors,
      });
    }

    const { event, entityType, entityId, sourceRef } = validation.data;

    // Emit trace via server-side emitter (enriches with server context)
    const result = await emitTrace(
      req,
      entityType,
      entityId,
      event.sourcePanel,
      event.domain,
      event.inputs,
      event.outputs,
      {
        downstreamImplications: event.downstreamImplications,
        confidence: event.confidence,
        assumptions: event.assumptions,
        traceId: event.traceId,
        sourceRef: sourceRef,
        system: event.actor.system,
      }
    );

    if (result) {
      return res.json({
        ok: true,
        traceId: result.traceId,
        entryId: result.entry?.id,
      });
    } else {
      // Emission failed but we don't want to return error to client
      // (graceful degradation)
      logger.warn("[TraceRoute] Trace emission failed silently", {
        traceId: event.traceId,
        entityType,
        entityId,
      });
      return res.json({
        ok: true,
        traceId: event.traceId,
        warning: "Trace emission may have failed",
      });
    }
  } catch (error) {
    logger.error("[TraceRoute] Unexpected error processing trace event", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return success to client even on error (graceful degradation)
    return res.json({
      ok: true,
      warning: "Trace event may not have been processed",
    });
  }
};