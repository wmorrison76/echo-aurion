import type { UUID } from "../types/ops-gantt";

export type TimestampMs = number;

export function parseIsoToMs(iso: string): TimestampMs | null {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function formatMsToIso(ms: TimestampMs): string {
  // Always use ISO; consumers can format for display.
  return new Date(ms).toISOString();
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function safeUuid(id: string): UUID {
  // UUID is a string type alias; this function documents intent where we mint ids.
  return id;
}

