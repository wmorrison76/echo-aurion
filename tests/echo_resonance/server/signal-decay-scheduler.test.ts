/**
 * ===========================================================================
 * signal-decay-scheduler tests
 * ===========================================================================
 * Layer:    Substrate: Signal Graph (operational glue)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Verify the in-process scheduler:
 *             - is idempotent on start/stop
 *             - honors ECHO_DECAY_DISABLED
 *             - guards against re-entry when a pass is still running
 *             - swallows pass errors without throwing (so the next interval
 *               still fires)
 *
 *  Uses fake timers + a mocked signalDecay service so no DB is required.
 * ===========================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the signal-decay service before importing the scheduler.
const mockPurge = vi.fn();
vi.mock('../../../server/services/signals/signal-decay', () => ({
  signalDecay: {
    purgeExpiredSignals: () => mockPurge(),
  },
}));

import {
  startSignalDecayScheduler,
  stopSignalDecayScheduler,
  runOnce,
} from '../../../server/lib/signal-decay-scheduler';

describe('signal-decay-scheduler', () => {
  beforeEach(() => {
    mockPurge.mockReset();
    delete process.env.ECHO_DECAY_DISABLED;
    delete process.env.ECHO_DECAY_INTERVAL_MS;
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopSignalDecayScheduler();
    vi.useRealTimers();
  });

  it('start/stop are idempotent', () => {
    startSignalDecayScheduler(60_000);
    startSignalDecayScheduler(60_000); // second start: no-op
    stopSignalDecayScheduler();
    stopSignalDecayScheduler(); // second stop: no-op
    // No exception thrown = pass
    expect(true).toBe(true);
  });

  it('ECHO_DECAY_DISABLED=1 prevents start', () => {
    process.env.ECHO_DECAY_DISABLED = '1';
    startSignalDecayScheduler(60_000);
    vi.advanceTimersByTime(120_000);
    expect(mockPurge).not.toHaveBeenCalled();
  });

  it('ECHO_DECAY_DISABLED=true also prevents start', () => {
    process.env.ECHO_DECAY_DISABLED = 'true';
    startSignalDecayScheduler(60_000);
    vi.advanceTimersByTime(120_000);
    expect(mockPurge).not.toHaveBeenCalled();
  });

  it('runOnce calls purgeExpiredSignals once', async () => {
    mockPurge.mockResolvedValue({ deleted: 0, bySensitivity: {} });
    await runOnce();
    expect(mockPurge).toHaveBeenCalledTimes(1);
  });

  it('runOnce swallows errors without throwing', async () => {
    mockPurge.mockRejectedValue(new Error('db down'));
    await expect(runOnce()).resolves.toBeUndefined();
    expect(mockPurge).toHaveBeenCalledTimes(1);
  });

  it('re-entry guard: overlapping calls do not duplicate work', async () => {
    let resolveFn: (v: unknown) => void = () => undefined;
    mockPurge.mockImplementation(
      () => new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    // Kick off first pass; do not await yet
    const first = runOnce();
    // Second call while first is still in flight
    await runOnce();
    expect(mockPurge).toHaveBeenCalledTimes(1); // second was guarded out
    // Resolve first so it completes
    resolveFn({ deleted: 0, bySensitivity: {} });
    await first;
  });

  it('honors ECHO_DECAY_INTERVAL_MS env var with 1-minute floor', () => {
    process.env.ECHO_DECAY_INTERVAL_MS = '30000'; // 30s — below floor
    startSignalDecayScheduler();
    // Should fall back to the 60_000 floor; advancing 30s should NOT fire
    vi.advanceTimersByTime(30_000);
    expect(mockPurge).not.toHaveBeenCalled();
    // Advancing another 30s gets us to the 60s minimum interval
    mockPurge.mockResolvedValue({ deleted: 0, bySensitivity: {} });
    vi.advanceTimersByTime(30_000);
    // Allow microtasks to flush
    return Promise.resolve().then(() => {
      expect(mockPurge).toHaveBeenCalledTimes(1);
    });
  });
});
