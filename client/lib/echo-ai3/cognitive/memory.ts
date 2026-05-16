/**
 * EchoAi³ Memory & Confidence Modeling
 * Trace-anchored memory and confidence; no inferred state.
 * References only (sourceRef, entityType, entityId); confidence from payload or evidence count.
 */

import type { TraceLedgerEntry } from "@shared/types/trace-ledger";
import type { TraceAnchoredMemory } from "./types";

const STORAGE_KEY = "echo-ai3-cognitive-memory";
const MAX_MEMORY_ENTRIES = 500;

function readMemory(): TraceAnchoredMemory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMemory(entries: TraceAnchoredMemory[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_MEMORY_ENTRIES)));
  } catch {
    // ignore
  }
}

/**
 * Derive confidence from trace payload (0–1). No inference; use payload.confidence or evidence count.
 */
export function confidenceFromPayload(payload: Record<string, unknown>, evidenceCount: number): number {
  const c = payload.confidence;
  if (typeof c === "number" && c >= 0 && c <= 1) return c;
  if (evidenceCount <= 0) return 0;
  if (evidenceCount >= 10) return 1;
  return Math.min(1, 0.2 + evidenceCount * 0.08);
}

/**
 * Store trace-anchored memory entry (references only).
 */
export function remember(
  entry: TraceLedgerEntry,
  confidence: number,
): void {
  const mem: TraceAnchoredMemory = {
    sourceRef: entry.sourceRef ?? null,
    entityType: entry.entityType,
    entityId: entry.entityId,
    traceId: entry.id,
    createdAt: entry.createdAt,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
  const entries = readMemory();
  entries.unshift(mem);
  writeMemory(entries);
}

/**
 * Recall trace-anchored memory by entity or sourceRef (no inferred state).
 */
export function recall(
  options: { entityType?: string; entityId?: string; sourceRef?: string; limit?: number },
): TraceAnchoredMemory[] {
  const limit = options.limit ?? 50;
  let entries = readMemory();
  if (options.entityType) entries = entries.filter((e) => e.entityType === options.entityType);
  if (options.entityId) entries = entries.filter((e) => e.entityId === options.entityId);
  if (options.sourceRef) entries = entries.filter((e) => e.sourceRef === options.sourceRef);
  return entries.slice(0, limit);
}

/**
 * Build memory from a perception slice and store (trace-anchored).
 */
export function rememberFromPerception(
  entries: TraceLedgerEntry[],
): void {
  entries.forEach((entry) => {
    const confidence = confidenceFromPayload(entry.payload, 1);
    remember(entry, confidence);
  });
}
