/**
 * EchoAi³ Executive Narrative Synthesis
 * Translate operations (from TraceLedger entries) into executive narratives.
 * Uses only payload fields that exist; no fabrication.
 */

import type { TraceLedgerEntry } from "@shared/types/trace-ledger";
import type { ExecutiveSegment } from "./types";

/**
 * Convert TraceLedger entries to executive narrative segments (payload-only; no inference).
 */
export function toExecutiveSegments(entries: TraceLedgerEntry[]): ExecutiveSegment[] {
  return entries.map((entry) => {
    const p = entry.payload as Record<string, unknown>;
    const source =
      (p.sourcePanel as string) ??
      (p.source as string) ??
      entry.entityType;
    const summary =
      (p.summary as string) ??
      (p.reason as string) ??
      `${entry.entityType} ${entry.entityId}`;
    return {
      timestamp: entry.createdAt,
      source: String(source),
      summary: String(summary),
      traceId: entry.id,
    };
  });
}

/**
 * Build a short executive narrative string from segments (e.g. for teaching or reports).
 */
export function toExecutiveNarrative(
  segments: ExecutiveSegment[],
  maxSegments = 10,
): string {
  const slice = segments.slice(0, maxSegments);
  if (slice.length === 0) return "No trace activity in scope.";
  return slice
    .map((s) => `[${s.timestamp}] ${s.source}: ${s.summary}`)
    .join("\n");
}
