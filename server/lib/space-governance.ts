/********************************************************************
 * LUCCCA — BUILD 8
 * SpaceGovernanceEngine
 *
 * GOALS:
 *  - Evaluate events for conflict
 *  - Reserve / lock spaces
 *  - Enforce cleaning/engineering buffers
 *  - Severity scoring
 *  - Escalation rules
 *  - Push change events to feed
 *********************************************************************/

export type EventInput = {
  id: string;
  space: string;
  start: number;
  end: number;
  type: string;
};

export type GovernanceResult = {
  ok: boolean;
  severity?: "info" | "warn" | "danger";
  reason?: string;
  overrideRequired?: boolean;
};

/**
 * Evaluate an incoming event against existing events
 * Returns conflicts, buffer violations, and severity
 */
export function evaluateEvent(
  incoming: EventInput,
  existing: EventInput[]
): GovernanceResult {
  // 1. FIND OVERLAPS - Direct time conflicts
  const overlaps = existing.filter(
    (e) =>
      e.space === incoming.space &&
      e.end > incoming.start &&
      incoming.end > e.start
  );

  if (overlaps.length > 0) {
    return {
      ok: false,
      severity: "danger",
      reason: `Time conflict with ${overlaps.length} event${overlaps.length > 1 ? "s" : ""}`,
      overrideRequired: true,
    };
  }

  // 2. BUFFER RULE - 90 minutes before/after for engineering/cleaning
  const BUFFER_MS = 90 * 60 * 1000; // 90 minutes
  const bufferViolations = existing.filter(
    (e) =>
      e.space === incoming.space &&
      (Math.abs(e.end - incoming.start) < BUFFER_MS ||
        Math.abs(incoming.end - e.start) < BUFFER_MS)
  );

  if (bufferViolations.length > 0) {
    return {
      ok: false,
      severity: "warn",
      reason: "Insufficient buffer time for setup/cleanup",
      overrideRequired: true,
    };
  }

  // 3. OK - Event is clear
  return { ok: true };
}

/**
 * Calculate severity score (0-100) for event scheduling
 * Higher = more problematic
 */
export function calculateSeverity(result: GovernanceResult): number {
  if (result.ok) return 0;

  switch (result.severity) {
    case "danger":
      return 100;
    case "warn":
      return 50;
    case "info":
      return 25;
    default:
      return 0;
  }
}

/**
 * Check if event requires escalation to Director/EC
 */
export function requiresEscalation(severity: number): boolean {
  return severity >= 80;
}

/**
 * Format change event for feed
 */
export function formatChangeEvent(
  eventId: string,
  result: GovernanceResult,
  source: string
) {
  return {
    id: crypto.randomUUID?.() || `event-${Date.now()}`,
    ts: Date.now(),
    type: result.ok ? "update" : result.severity === "danger" ? "conflict" : "warning",
    source,
    message: result.reason || "Event processed",
    severity: result.severity || "info",
    overrideRequired: result.overrideRequired,
  };
}

/**
 * Batch evaluate multiple events
 */
export function evaluateEventBatch(
  events: EventInput[],
  existingEvents: EventInput[]
): Map<string, GovernanceResult> {
  const results = new Map<string, GovernanceResult>();

  for (const event of events) {
    results.set(event.id, evaluateEvent(event, existingEvents));
  }

  return results;
}
