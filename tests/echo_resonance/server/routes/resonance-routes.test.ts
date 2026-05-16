/**
 * ===========================================================================
 * Resonance + signals route tests — TICKET_004 (Phase 1.4)
 * ===========================================================================
 * Layer:    Routes (Phase 1.4)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Unit-level coverage of the Phase 1 HTTP route bodies. Three layers:
 *
 *   1. Module structure — both routers export a default Express Router.
 *   2. Zod boundary validation — the schemas reject malformed input before
 *      ever touching a service. Tests a representative sample (UUID format,
 *      affect range, outcome score [0,1], unknown signal source).
 *   3. Handler dispatch — fires the routes through an in-memory Express
 *      app with the services mocked, verifying response codes and shapes
 *      for happy-path + state-machine error mapping (409) + not-found (404).
 *
 *   Full HTTP+DB integration tests live in expired-row-filter.test.ts and
 *   are gated on DATABASE_URL_TEST.
 * ===========================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// Mock the auth middleware to a no-op pass-through for these tests.
// (The auth contract is owned by middleware/auth.ts and is tested elsewhere.)
vi.mock('../../../../server/middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock the three services so the route layer is the unit under test.
const mockResonance = {
  createReading: vi.fn(),
  getRecentReadings: vi.fn(),
};
const mockTrajectory = {
  getFloorView: vi.fn(),
  getTrajectory: vi.fn(),
};
const mockIntervention = {
  findCandidates: vi.fn(),
  recordProposal: vi.fn(),
  recordApproval: vi.fn(),
  recordExecution: vi.fn(),
  recordSkip: vi.fn(),
  recordOutcome: vi.fn(),
  listTemplates: vi.fn(),
};
const mockSignalQuery = {
  getSignalsForGuest: vi.fn(),
  getSignalsForVisit: vi.fn(),
  getSignalsBySource: vi.fn(),
};

vi.mock('../../../../server/services/echo-ai3/resonance/resonance-engine', () => ({
  resonanceEngine: mockResonance,
}));
vi.mock('../../../../server/services/echo-ai3/resonance/trajectory-engine', () => ({
  trajectoryEngine: mockTrajectory,
}));
vi.mock('../../../../server/services/echo-ai3/resonance/intervention-library', () => ({
  interventionLibrary: mockIntervention,
}));
vi.mock('../../../../server/services/signals/signal-query', () => ({
  signalQuery: mockSignalQuery,
}));

// Lazy import AFTER mocks register.
async function buildApp(): Promise<{ app: Express; server: http.Server; baseUrl: string }> {
  const { default: resonanceRouter } = await import('../../../../server/routes/resonance');
  const { default: signalsRouter } = await import('../../../../server/routes/signals');

  const app = express();
  app.use(express.json());
  app.use('/api/echo-resonance/signals', signalsRouter);
  app.use('/api/echo-resonance', resonanceRouter);

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  return { app, server, baseUrl: `http://127.0.0.1:${port}` };
}

async function jsonRequest(
  url: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: { 'content-type': 'application/json' },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

const VALID_UUID = '11111111-2222-3333-4444-555555555555';
const VALID_UUID_2 = '22222222-3333-4444-5555-666666666666';
const VALID_UUID_3 = '33333333-4444-5555-6666-777777777777';

// =============================================================================
// Module structure
// =============================================================================

describe('routes/resonance + routes/signals — module structure', () => {
  it('both routers export a default that is an Express function', async () => {
    const { default: resonanceRouter } = await import('../../../../server/routes/resonance');
    const { default: signalsRouter } = await import('../../../../server/routes/signals');
    expect(typeof resonanceRouter).toBe('function');
    expect(typeof signalsRouter).toBe('function');
  });

  it('legacy register helpers exist on both modules', async () => {
    const r = await import('../../../../server/routes/resonance');
    const s = await import('../../../../server/routes/signals');
    expect(typeof r.registerResonanceRoutes).toBe('function');
    expect(typeof s.registerSignalRoutes).toBe('function');
  });
});

// =============================================================================
// Resonance routes — handler dispatch
// =============================================================================

describe('POST /api/echo-resonance/readings', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    Object.values(mockResonance).forEach((fn) => fn.mockReset());
    Object.values(mockTrajectory).forEach((fn) => fn.mockReset());
    Object.values(mockIntervention).forEach((fn) => fn.mockReset());
    const setup = await buildApp();
    server = setup.server;
    baseUrl = setup.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects malformed body with 400 VALIDATION_FAILED', async () => {
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/readings`, {
      method: 'POST',
      body: { guestId: 'not-a-uuid', arousal: 99 },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_FAILED');
    expect(mockResonance.createReading).not.toHaveBeenCalled();
  });

  it('rejects affect outside [-1, 1]', async () => {
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/readings`, {
      method: 'POST',
      body: {
        guestId: VALID_UUID,
        visitId: VALID_UUID_2,
        capturedBy: VALID_UUID_3,
        channel: 'observation',
        arousal: 1.5,
        valence: 0.5,
        resonance: 7,
        signals: [],
        confidence: 0.9,
      },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_FAILED');
  });

  it('happy path returns 201 with reading payload', async () => {
    mockResonance.createReading.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      guestId: VALID_UUID,
      arousal: 0.3,
      valence: 0.5,
      resonance: 7,
    });

    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/readings`, {
      method: 'POST',
      body: {
        guestId: VALID_UUID,
        visitId: VALID_UUID_2,
        capturedBy: VALID_UUID_3,
        channel: 'observation',
        arousal: 0.3,
        valence: 0.5,
        resonance: 7,
        signals: [],
        confidence: 0.9,
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(mockResonance.createReading).toHaveBeenCalledTimes(1);
  });

  it('aurion captured-by is allowed (literal "aurion")', async () => {
    mockResonance.createReading.mockResolvedValue({ id: VALID_UUID });
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/readings`, {
      method: 'POST',
      body: {
        guestId: VALID_UUID,
        visitId: null,
        capturedBy: 'aurion',
        channel: 'voice',
        arousal: 0,
        valence: 0,
        resonance: 5,
        signals: [],
        confidence: 0.5,
      },
    });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/echo-resonance/visits/:visitId/trajectory', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    Object.values(mockTrajectory).forEach((fn) => fn.mockReset());
    const setup = await buildApp();
    server = setup.server;
    baseUrl = setup.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns 404 NOT_FOUND when service returns null', async () => {
    mockTrajectory.getTrajectory.mockResolvedValue(null);
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/visits/${VALID_UUID}/trajectory`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('returns 200 with trajectory when found', async () => {
    mockTrajectory.getTrajectory.mockResolvedValue({
      visitId: VALID_UUID,
      status: 'green',
      currentScore: 7,
    });
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/visits/${VALID_UUID}/trajectory`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.visitId).toBe(VALID_UUID);
    expect(res.body.data.status).toBe('green');
  });

  it('rejects malformed visit UUID with 400', async () => {
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/visits/not-a-uuid/trajectory`,
    );
    expect(res.status).toBe(400);
  });
});

describe('intervention lifecycle endpoints', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    Object.values(mockIntervention).forEach((fn) => fn.mockReset());
    const setup = await buildApp();
    server = setup.server;
    baseUrl = setup.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('approve: state-guard error maps to 409 INVALID_TRANSITION', async () => {
    mockIntervention.recordApproval.mockRejectedValue(
      new Error("intervention-library: recordApproval — execution X not in 'proposed' state"),
    );
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/interventions/${VALID_UUID}/approve`,
      { method: 'POST', body: { approvedBy: VALID_UUID_2 } },
    );
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
  });

  it('execute: state-guard error maps to 409', async () => {
    mockIntervention.recordExecution.mockRejectedValue(
      new Error("recordExecution — execution X not in 'approved' state"),
    );
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/interventions/${VALID_UUID}/execute`,
      { method: 'POST', body: { preReading: 6.5 } },
    );
    expect(res.status).toBe(409);
  });

  it('outcome: rejects outcomeScore > 1 with 400', async () => {
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/interventions/${VALID_UUID}/outcome`,
      { method: 'POST', body: { outcomeScore: 1.5, postReading: 7 } },
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_FAILED');
    expect(mockIntervention.recordOutcome).not.toHaveBeenCalled();
  });

  it('outcome: happy path returns 204', async () => {
    mockIntervention.recordOutcome.mockResolvedValue(undefined);
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/interventions/${VALID_UUID}/outcome`,
      { method: 'POST', body: { outcomeScore: 0.8, postReading: 8.5 } },
    );
    expect(res.status).toBe(204);
    expect(mockIntervention.recordOutcome).toHaveBeenCalledWith(
      VALID_UUID,
      0.8,
      8.5,
    );
  });

  it('candidates: rejects affect outside [-1,1] with 400', async () => {
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/interventions/candidates`,
      {
        method: 'POST',
        body: {
          affect: { arousal: 2, valence: 0 },
          presentSignals: [],
          guestId: VALID_UUID,
          visitId: VALID_UUID_2,
        },
      },
    );
    expect(res.status).toBe(400);
  });

  it('candidates: happy path returns ranked list', async () => {
    mockIntervention.findCandidates.mockResolvedValue([
      { id: 'tpl1', name: 'A', successRate: 0.9 },
      { id: 'tpl2', name: 'B', successRate: 0.5 },
    ]);
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/interventions/candidates`,
      {
        method: 'POST',
        body: {
          affect: { arousal: 0.3, valence: -0.2 },
          presentSignals: ['anniversary'],
          guestId: VALID_UUID,
          visitId: VALID_UUID_2,
        },
      },
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].successRate).toBe(0.9);
  });
});

// =============================================================================
// Signals routes — handler dispatch
// =============================================================================

describe('signals routes', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    Object.values(mockSignalQuery).forEach((fn) => fn.mockReset());
    const setup = await buildApp();
    server = setup.server;
    baseUrl = setup.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /signals/guest/:id rejects malformed UUID with 400', async () => {
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/signals/guest/not-a-uuid`,
    );
    expect(res.status).toBe(400);
  });

  it('GET /signals/guest/:id forwards limit query param', async () => {
    mockSignalQuery.getSignalsForGuest.mockResolvedValue([]);
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/signals/guest/${VALID_UUID}?limit=25`,
    );
    expect(res.status).toBe(200);
    expect(mockSignalQuery.getSignalsForGuest).toHaveBeenCalledWith(VALID_UUID, 25);
  });

  it('GET /signals/source/:source rejects unknown source with 400', async () => {
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/signals/source/not-a-real-source`,
    );
    expect(res.status).toBe(400);
  });

  it('GET /signals/source/:source defaults since to ~24h ago when omitted', async () => {
    mockSignalQuery.getSignalsBySource.mockResolvedValue([]);
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/signals/source/staff-whisper`,
    );
    expect(res.status).toBe(200);
    expect(mockSignalQuery.getSignalsBySource).toHaveBeenCalledTimes(1);
    const [, since] = mockSignalQuery.getSignalsBySource.mock.calls[0];
    const sinceMs = new Date(since as string).getTime();
    const expectedMs = Date.now() - 24 * 3_600_000;
    expect(Math.abs(sinceMs - expectedMs)).toBeLessThan(5_000);
  });

  it('GET /signals/visit/:id forwards to service', async () => {
    mockSignalQuery.getSignalsForVisit.mockResolvedValue([{ id: 'sig1' }]);
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/signals/visit/${VALID_UUID}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'sig1' }]);
  });
});
