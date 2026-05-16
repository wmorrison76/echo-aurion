/**
 * ===========================================================================
 * api.ts retry/backoff tests
 * ===========================================================================
 * Layer:    Resonance (client)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Verify the retry policy in client/lib/resonance/api.ts:
 *             - retries on transient HTTP codes (429/502/503/504)
 *             - retries on network errors (fetch throws)
 *             - does NOT retry on 4xx (other than 429) or 500 (real bug)
 *             - mutations auto-receive an Idempotency-Key so retries are safe
 *             - max 3 attempts, fails after that
 *
 *  Mocks global fetch; uses real timers throttled with very short backoffs
 *  by relying on the jitter randomness staying within ~250ms of the floor.
 *  Tests stay fast (<1s) while still exercising the await path.
 * ===========================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Restore real fetch between tests
const realFetch = global.fetch;

import {
  submitReading,
  fetchFloorView,
  fetchTrajectory,
  ResonanceApiError,
} from '../../../client/lib/resonance/api';
import type { NewResonanceReading } from '../../../shared/types/resonance';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeReading(): NewResonanceReading {
  return {
    guestId: '11111111-2222-3333-4444-555555555555',
    visitId: '22222222-3333-4444-5555-666666666666',
    capturedBy: '33333333-4444-5555-6666-777777777777',
    channel: 'observation',
    arousal: 0.3,
    valence: 0.5,
    resonance: 7,
    signals: [],
    confidence: 0.85,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  global.fetch = realFetch;
});

describe('api.ts retry/backoff', () => {
  it('retries 503 and succeeds on second attempt', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { success: false, error: 'UPSTREAM' }))
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, data: [{ visitId: 'v1' }] }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchFloorView('99999999-8888-7777-6666-555555555555');
    expect(result).toEqual([{ visitId: 'v1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 5_000);

  it('retries 429 (rate limit)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { success: false, error: 'RATE_LIMITED' }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { visitId: 'v1' } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchTrajectory('22222222-3333-4444-5555-666666666666');
    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 5_000);

  it('does NOT retry on 400 (client error)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(400, { success: false, error: 'VALIDATION_FAILED' }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      fetchTrajectory('22222222-3333-4444-5555-666666666666'),
    ).rejects.toBeInstanceOf(ResonanceApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 500 (real bug)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(500, { success: false, error: 'INTERNAL_ERROR' }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      fetchTrajectory('22222222-3333-4444-5555-666666666666'),
    ).rejects.toBeInstanceOf(ResonanceApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries network errors (fetch throws)', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network unreachable'))
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, data: [] }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchFloorView('99999999-8888-7777-6666-555555555555');
    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 5_000);

  it('gives up after 3 attempts and throws', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(503, { success: false, error: 'UPSTREAM' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      fetchFloorView('99999999-8888-7777-6666-555555555555'),
    ).rejects.toBeInstanceOf(ResonanceApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('mutations auto-receive an Idempotency-Key header', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(201, {
        success: true,
        data: { id: 'r1', resonance: 7 },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await submitReading(makeReading());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    const key = headers['Idempotency-Key'] || headers['idempotency-key'];
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(8);
  });

  it('mutation retries reuse the SAME Idempotency-Key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { success: false, error: 'UPSTREAM' }))
      .mockResolvedValueOnce(
        jsonResponse(201, { success: true, data: { id: 'r1', resonance: 7 } }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    await submitReading(makeReading());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    const secondHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    const firstKey =
      firstHeaders['Idempotency-Key'] || firstHeaders['idempotency-key'];
    const secondKey =
      secondHeaders['Idempotency-Key'] || secondHeaders['idempotency-key'];
    expect(firstKey).toBe(secondKey);
  }, 5_000);
});
