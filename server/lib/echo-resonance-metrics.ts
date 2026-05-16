/**
 * ===========================================================================
 * Echo Resonance metrics — lightweight in-process counters
 * ===========================================================================
 * Layer:    Resonance + Substrate (operational glue)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  In-memory counters for Phase 1 observability. The numbers
 *           reset every server restart — that is intentional. This module
 *           exists so the Phase 1 demo has SOMETHING the GM can point at
 *           ("we recorded 142 readings tonight, 14 interventions proposed,
 *           11 completed, 3 skipped"). Real production observability with
 *           histograms, percentiles, and alarms is post-Phase-1 work that
 *           lands when we wire prom-client / OpenTelemetry.
 *
 *           Counters are uint-shaped JS numbers that monotonically
 *           increase. Over a long-running process they could overflow at
 *           Number.MAX_SAFE_INTEGER (~9 quadrillion); not a concern in
 *           practice and out of scope for Phase 1.
 *
 * Counters:
 *   signals.recorded             — successful signal-recorder writes
 *   signals.decay_passes         — decay-cron pass count
 *   signals.decay_rows_deleted   — total rows deleted by decay
 *
 *   readings.recorded            — successful resonance-engine.createReading
 *
 *   interventions.candidates_listed — findCandidates calls (cheap reads)
 *   interventions.proposed       — recordProposal successes
 *   interventions.approved       — recordApproval successes
 *   interventions.executed       — recordExecution successes
 *   interventions.skipped        — recordSkip successes
 *   interventions.completed      — recordOutcome successes (the terminal
 *                                  state — what the dashboard celebrates)
 *
 *   routes.success_total         — every 2xx response from resonance routes
 *   routes.client_error_total    — 4xx (validation, auth, conflict)
 *   routes.server_error_total    — 5xx (real bugs)
 *
 * Health endpoint exposes a snapshot. Tests can read raw and reset.
 *
 * WARNING: Use the inc() / read() helpers only. Do not mutate the counter
 * object directly — it makes the test surface unstable.
 * ===========================================================================
 */

export interface MetricsSnapshot {
  startedAt: string;
  uptimeMs: number;
  signals: {
    recorded: number;
    decayPasses: number;
    decayRowsDeleted: number;
  };
  readings: {
    recorded: number;
  };
  interventions: {
    candidatesListed: number;
    proposed: number;
    approved: number;
    executed: number;
    skipped: number;
    completed: number;
  };
  routes: {
    successTotal: number;
    clientErrorTotal: number;
    serverErrorTotal: number;
  };
}

const startedAtMs = Date.now();
const startedAtIso = new Date(startedAtMs).toISOString();

const counters = {
  'signals.recorded': 0,
  'signals.decay_passes': 0,
  'signals.decay_rows_deleted': 0,
  'readings.recorded': 0,
  'interventions.candidates_listed': 0,
  'interventions.proposed': 0,
  'interventions.approved': 0,
  'interventions.executed': 0,
  'interventions.skipped': 0,
  'interventions.completed': 0,
  'routes.success_total': 0,
  'routes.client_error_total': 0,
  'routes.server_error_total': 0,
};

export type CounterKey = keyof typeof counters;

/**
 * Increment a counter. Default delta = 1. Negative deltas are coerced to
 * 0 (counters are monotonically non-decreasing — see file header).
 */
export function inc(key: CounterKey, delta = 1): void {
  const safe = Number.isFinite(delta) && delta > 0 ? delta : 0;
  counters[key] += safe;
}

/**
 * Read a single counter (for tests or admin probes).
 */
export function read(key: CounterKey): number {
  return counters[key];
}

/**
 * Reset all counters. ONLY for tests. Production startup uses module
 * initialization (counters start at 0 naturally).
 */
export function resetForTesting(): void {
  for (const k of Object.keys(counters) as CounterKey[]) {
    counters[k] = 0;
  }
}

/**
 * Build a JSON-friendly snapshot. Used by the health endpoint.
 */
export function snapshot(): MetricsSnapshot {
  return {
    startedAt: startedAtIso,
    uptimeMs: Date.now() - startedAtMs,
    signals: {
      recorded: counters['signals.recorded'],
      decayPasses: counters['signals.decay_passes'],
      decayRowsDeleted: counters['signals.decay_rows_deleted'],
    },
    readings: {
      recorded: counters['readings.recorded'],
    },
    interventions: {
      candidatesListed: counters['interventions.candidates_listed'],
      proposed: counters['interventions.proposed'],
      approved: counters['interventions.approved'],
      executed: counters['interventions.executed'],
      skipped: counters['interventions.skipped'],
      completed: counters['interventions.completed'],
    },
    routes: {
      successTotal: counters['routes.success_total'],
      clientErrorTotal: counters['routes.client_error_total'],
      serverErrorTotal: counters['routes.server_error_total'],
    },
  };
}
