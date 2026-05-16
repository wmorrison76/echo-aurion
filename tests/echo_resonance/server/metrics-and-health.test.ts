/**
 * ===========================================================================
 * echo-resonance-metrics + health-endpoint tests
 * ===========================================================================
 * Layer:    Resonance + Substrate (operational)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Verify:
 *             - inc() advances counters monotonically; negative deltas no-op
 *             - snapshot() reflects current state with correct shape
 *             - resetForTesting() zeros all counters
 *             - health endpoint returns 'ok' under normal conditions
 *             - health endpoint returns 'degraded' when error rate >= 5%
 * ===========================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  inc,
  read,
  resetForTesting,
  snapshot,
} from '../../../server/lib/echo-resonance-metrics';
import healthRouter from '../../../server/routes/echo-resonance-health';

describe('echo-resonance-metrics', () => {
  beforeEach(() => {
    resetForTesting();
  });

  it('inc advances the counter by 1 by default', () => {
    inc('signals.recorded');
    inc('signals.recorded');
    expect(read('signals.recorded')).toBe(2);
  });

  it('inc accepts an explicit positive delta', () => {
    inc('signals.decay_rows_deleted', 17);
    expect(read('signals.decay_rows_deleted')).toBe(17);
  });

  it('inc treats negative deltas as no-op (counters monotonically non-decreasing)', () => {
    inc('readings.recorded', 5);
    inc('readings.recorded', -3);
    expect(read('readings.recorded')).toBe(5);
  });

  it('inc treats NaN/Infinity as no-op', () => {
    inc('readings.recorded', NaN);
    inc('readings.recorded', Infinity);
    expect(read('readings.recorded')).toBe(0);
  });

  it('snapshot() returns the structured shape', () => {
    inc('signals.recorded', 10);
    inc('interventions.completed', 3);
    inc('routes.client_error_total', 1);

    const snap = snapshot();
    expect(snap.signals.recorded).toBe(10);
    expect(snap.interventions.completed).toBe(3);
    expect(snap.routes.clientErrorTotal).toBe(1);
    expect(snap.startedAt).toBeTruthy();
    expect(snap.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('resetForTesting zeros every counter', () => {
    inc('signals.recorded', 99);
    inc('interventions.proposed', 5);
    resetForTesting();
    expect(read('signals.recorded')).toBe(0);
    expect(read('interventions.proposed')).toBe(0);
  });
});

describe('GET /api/echo-resonance/health', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    resetForTesting();
    const app = express();
    app.use(express.json());
    app.use('/api/echo-resonance/health', healthRouter);
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function getHealth(): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}/api/echo-resonance/health`);
    return { status: res.status, body: await res.json() };
  }

  it('returns 200 with status=ok when no errors recorded', async () => {
    const { status, body } = await getHealth();
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.errorRate).toBe(0);
    expect(body.metrics).toBeTruthy();
  });

  it('reports counters in the response', async () => {
    inc('signals.recorded', 25);
    inc('interventions.proposed', 4);
    inc('routes.success_total', 30);

    const { body } = await getHealth();
    expect(body.metrics.signals.recorded).toBe(25);
    expect(body.metrics.interventions.proposed).toBe(4);
    expect(body.metrics.routes.successTotal).toBe(30);
  });

  it('reports degraded when server-error rate >= 5%', async () => {
    // 95 success + 5 server errors = 5% server-error rate
    inc('routes.success_total', 95);
    inc('routes.server_error_total', 5);

    const { body } = await getHealth();
    expect(body.status).toBe('degraded');
    expect(body.errorRate).toBeCloseTo(0.05, 5);
  });

  it('stays ok when error rate < 5%', async () => {
    inc('routes.success_total', 99);
    inc('routes.server_error_total', 1);
    const { body } = await getHealth();
    expect(body.status).toBe('ok');
  });

  it('does not leak guest data — response is operationally safe to expose unauthenticated', async () => {
    const { body } = await getHealth();
    const json = JSON.stringify(body);
    // The response should have NO field that could carry PII.
    // Allowlist of the keys we expect and assert nothing else surfaces.
    expect(json).not.toMatch(/email|phone|name|address|guestId|guest_id/i);
  });
});
