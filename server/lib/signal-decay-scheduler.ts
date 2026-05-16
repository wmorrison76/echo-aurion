/**
 * ===========================================================================
 * Signal-decay scheduler — in-process Tenet 7/8 enforcement
 * ===========================================================================
 * Layer:    Substrate: Signal Graph (operational glue)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Wires server/services/signals/signal-decay.purgeExpiredSignals()
 *           to a running schedule so expired rows are physically deleted on
 *           cadence. Without this, signal-decay was a callable function with
 *           nothing calling it — storage would grow unbounded even though
 *           the read-side filter (expires_at >= NOW()) keeps consumers honest.
 *
 *           Phase 1 strategy: in-process setInterval gated by env var. Works
 *           in a single-process deployment (the demo property runs one
 *           Echo Resonance server). Replace with BullMQ-backed cron when
 *           multi-instance deployment lands (Phase 6 / Network).
 *
 *           Why in-process and not BullMQ now? The repo has BullMQ available
 *           (server/lib/bullmq-config.ts) but it's gated by ENABLE_BULLMQ +
 *           REDIS_URL. Phase 1 demo deployment does not require Redis. This
 *           module gives us Tenet 7 enforcement without an extra moving part.
 *
 *           When multi-instance Phase 6 deployment lands, the migration is:
 *           replace setInterval with a BullMQ repeatable job; stop importing
 *           this module from server/index.ts; everything else stays the same
 *           because purgeExpiredSignals() is the canonical primitive either
 *           way.
 *
 * Configuration:
 *   - ECHO_DECAY_INTERVAL_MS — interval in milliseconds; default 3,600,000
 *     (one hour, the cadence the master doc and TICKET_003 spec'd).
 *   - ECHO_DECAY_DISABLED — set to '1' or 'true' to disable in dev/CI.
 *
 * Idempotency:
 *   purgeExpiredSignals() runs `DELETE FROM signals WHERE expires_at < NOW()
 *   RETURNING sensitivity` — atomic at the row level. Concurrent invocations
 *   are safe (each sees the rows the other did not delete). Re-running
 *   immediately after a successful pass returns deleted=0.
 *
 * WARNING: This scheduler is the storage-layer enforcement of Tenet 7
 * (sensitive flags decay) and Tenet 8 (forbidden expired-on-creation).
 * Disabling it leaves doctrine-violating rows in the database after their
 * retention window. Only disable in CI / unit-test contexts.
 * ===========================================================================
 */

import { signalDecay } from '../services/signals/signal-decay';
import { logger } from './logger';
import { inc as metricsInc } from './echo-resonance-metrics';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // one hour

let timer: NodeJS.Timeout | null = null;
let running = false; // re-entry guard for overlapping passes

/**
 * Start the decay scheduler. Call once during server startup. Idempotent
 * — calling start() while already running is a no-op (logged at debug).
 */
export function startSignalDecayScheduler(intervalMsOverride?: number): void {
  if (timer) {
    logger.debug('[SignalDecayScheduler] already running; start() ignored');
    return;
  }

  if (process.env.ECHO_DECAY_DISABLED === '1' || process.env.ECHO_DECAY_DISABLED === 'true') {
    logger.info('[SignalDecayScheduler] disabled via ECHO_DECAY_DISABLED');
    return;
  }

  const envInterval = process.env.ECHO_DECAY_INTERVAL_MS;
  const intervalMs =
    intervalMsOverride ??
    (envInterval && Number.isFinite(Number(envInterval))
      ? Math.max(60_000, Number(envInterval)) // minimum 1 minute, defensive
      : DEFAULT_INTERVAL_MS);

  logger.info('[SignalDecayScheduler] starting', { intervalMs });

  // Don't fire immediately on boot — let the server stabilize first.
  // Fire once after the first interval, then on cadence.
  timer = setInterval(() => {
    void runOnce();
  }, intervalMs);

  // Allow Node to exit without waiting on this timer
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

/**
 * Stop the decay scheduler. Call during graceful shutdown. Idempotent.
 */
export function stopSignalDecayScheduler(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  logger.info('[SignalDecayScheduler] stopped');
}

/**
 * Run one decay pass directly. Exposed for admin endpoints / tests, and
 * used internally by the timer. The re-entry guard skips the call if a
 * prior pass is still running (prevents overlapping deletes when a sweep
 * takes longer than the interval — should never happen but be defensive).
 */
export async function runOnce(): Promise<void> {
  if (running) {
    logger.warn('[SignalDecayScheduler] previous pass still running; skipping');
    return;
  }
  running = true;
  const startMs = Date.now();
  try {
    const result = await signalDecay.purgeExpiredSignals();
    const durationMs = Date.now() - startMs;
    metricsInc('signals.decay_passes');
    metricsInc('signals.decay_rows_deleted', result.deleted);
    logger.info('[SignalDecayScheduler] pass complete', {
      ...result,
      durationMs,
    });
  } catch (err) {
    logger.error('[SignalDecayScheduler] pass failed', {
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startMs,
    });
    // Don't throw — let the next interval try again
  } finally {
    running = false;
  }
}
