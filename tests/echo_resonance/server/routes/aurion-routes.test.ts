/**
 * ===========================================================================
 * Aurion route tests — Phase 3/4 stress
 * ===========================================================================
 * Layer:    Routes (Phase 3/4)
 * Status:   IMPLEMENTED
 * Phase:    3/4
 *
 * Purpose:  Boundary + dispatch coverage for /api/echo-resonance/aurion/*.
 *           Three layers, mirrored from resonance-routes.test.ts:
 *
 *   1. Module structure — registerAurionRoutes + createAurionRouter export.
 *   2. Zod boundary validation — bad UUIDs, bad context enum, missing
 *      voiceProfileId all return 400 before any service is called.
 *   3. Handler dispatch — happy path 201 from POST /sessions, 204 from
 *      DELETE-equivalent endpoints, 401 when no auth user is hydrated.
 * ===========================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// Mock auth — variable so individual tests can flip user identity.
let mockUser: { id: string; role?: string } | null = { id: 'aaaaaaaa-1111-1111-1111-111111111111' };
vi.mock('../../../../server/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    if (mockUser) req.user = mockUser;
    next();
  },
}));

const mockSessionManager = {
  startSession: vi.fn(),
  endSession: vi.fn(),
  setState: vi.fn(),
};
const mockWhisperEngine = {
  recentForStaff: vi.fn(),
  flagAsWrong: vi.fn(),
};
const mockPreArrival = {
  startConversation: vi.fn(),
};

vi.mock('../../../../server/services/echo-ai3/aurion/session-manager', () => ({
  sessionManager: mockSessionManager,
}));
vi.mock('../../../../server/services/echo-ai3/aurion/whisper-engine', () => ({
  whisperEngine: mockWhisperEngine,
}));
vi.mock('../../../../server/services/echo-ai3/aurion/pre-arrival-orchestrator', () => ({
  preArrivalOrchestrator: mockPreArrival,
}));

async function buildApp(): Promise<{ app: Express; server: http.Server; baseUrl: string }> {
  const { createAurionRouter } = await import('../../../../server/routes/aurion');
  const app = express();
  app.use(express.json());
  app.use('/api/echo-resonance/aurion', createAurionRouter());

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

// =============================================================================
// Module structure
// =============================================================================

describe('routes/aurion — module structure', () => {
  it('createAurionRouter returns an Express Router', async () => {
    const { createAurionRouter, registerAurionRoutes } = await import(
      '../../../../server/routes/aurion'
    );
    expect(typeof createAurionRouter).toBe('function');
    expect(typeof registerAurionRoutes).toBe('function');
    expect(typeof createAurionRouter()).toBe('function');
  });
});

// =============================================================================
// Sessions
// =============================================================================

describe('POST /aurion/sessions', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    mockUser = { id: VALID_UUID };
    Object.values(mockSessionManager).forEach((fn) => fn.mockReset());
    const setup = await buildApp();
    server = setup.server;
    baseUrl = setup.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects bad context enum with 400', async () => {
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/sessions`, {
      method: 'POST',
      body: { context: 'casual-chat', voiceProfileId: 'aurion-warm-default' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION');
    expect(mockSessionManager.startSession).not.toHaveBeenCalled();
  });

  it('rejects empty voiceProfileId with 400', async () => {
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/sessions`, {
      method: 'POST',
      body: { context: 'pre-arrival', voiceProfileId: '' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION');
  });

  it('rejects bad guestId UUID with 400', async () => {
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/sessions`, {
      method: 'POST',
      body: { context: 'pre-arrival', voiceProfileId: 'aurion-warm-default', guestId: 'not-uuid' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION');
  });

  it('happy path returns 201 with session', async () => {
    mockSessionManager.startSession.mockResolvedValue({
      id: VALID_UUID_2,
      guestId: VALID_UUID,
      context: 'pre-arrival',
      state: 'initiating',
    });
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/sessions`, {
      method: 'POST',
      body: {
        context: 'pre-arrival',
        voiceProfileId: 'aurion-warm-default',
        guestId: VALID_UUID,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(VALID_UUID_2);
    expect(mockSessionManager.startSession).toHaveBeenCalledTimes(1);
  });

  it('returns 500 SESSION_START_FAILED when service throws', async () => {
    mockSessionManager.startSession.mockRejectedValue(new Error('db down'));
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/sessions`, {
      method: 'POST',
      body: { context: 'pre-arrival', voiceProfileId: 'aurion-warm-default' },
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('SESSION_START_FAILED');
  });
});

// =============================================================================
// Whispers
// =============================================================================

describe('GET /aurion/whispers/recent', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    mockUser = { id: VALID_UUID };
    Object.values(mockWhisperEngine).forEach((fn) => fn.mockReset());
    const setup = await buildApp();
    server = setup.server;
    baseUrl = setup.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns 401 when no user is hydrated', async () => {
    mockUser = null;
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/whispers/recent`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('clamps limit to [1, 200]', async () => {
    mockWhisperEngine.recentForStaff.mockResolvedValue([]);
    await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/whispers/recent?limit=99999`);
    expect(mockWhisperEngine.recentForStaff).toHaveBeenCalledWith(VALID_UUID, 200);

    mockWhisperEngine.recentForStaff.mockResolvedValue([]);
    await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/whispers/recent?limit=0`);
    expect(mockWhisperEngine.recentForStaff).toHaveBeenLastCalledWith(VALID_UUID, 1);
  });

  it('returns 200 with whispers array', async () => {
    mockWhisperEngine.recentForStaff.mockResolvedValue([{ id: 'w1', text: 'allergic to nuts' }]);
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/whispers/recent`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('w1');
  });
});

describe('POST /aurion/whispers/:id/flag', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    mockUser = { id: VALID_UUID };
    Object.values(mockWhisperEngine).forEach((fn) => fn.mockReset());
    const setup = await buildApp();
    server = setup.server;
    baseUrl = setup.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects bad whisperId UUID with 400', async () => {
    const res = await jsonRequest(`${baseUrl}/api/echo-resonance/aurion/whispers/not-uuid/flag`, {
      method: 'POST',
      body: { flag: 'wrong' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ID');
  });

  it('rejects bad flag enum with 400', async () => {
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/aurion/whispers/${VALID_UUID}/flag`,
      { method: 'POST', body: { flag: 'meh' } },
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION');
  });

  it('happy path with flag=wrong calls flagAsWrong with note', async () => {
    mockWhisperEngine.flagAsWrong.mockResolvedValue({ id: VALID_UUID, flaggedAsWrong: true });
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/aurion/whispers/${VALID_UUID}/flag`,
      { method: 'POST', body: { flag: 'wrong', note: 'wrong table' } },
    );
    expect(res.status).toBe(204);
    expect(mockWhisperEngine.flagAsWrong).toHaveBeenCalledWith(VALID_UUID, 'wrong table');
  });

  it('flag=helpful is recorded as a tagged note', async () => {
    mockWhisperEngine.flagAsWrong.mockResolvedValue({ id: VALID_UUID });
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/aurion/whispers/${VALID_UUID}/flag`,
      { method: 'POST', body: { flag: 'helpful', note: 'spot on' } },
    );
    expect(res.status).toBe(204);
    expect(mockWhisperEngine.flagAsWrong).toHaveBeenCalledWith(
      VALID_UUID,
      '[helpful] spot on',
    );
  });
});

// =============================================================================
// Pre-arrival
// =============================================================================

describe('POST /aurion/pre-arrival/:tripId/start', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    mockUser = { id: VALID_UUID };
    Object.values(mockPreArrival).forEach((fn) => fn.mockReset());
    const setup = await buildApp();
    server = setup.server;
    baseUrl = setup.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects bad tripId with 400', async () => {
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/aurion/pre-arrival/not-uuid/start`,
      { method: 'POST' },
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_TRIP_ID');
  });

  it('returns 401 when no user', async () => {
    mockUser = null;
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/aurion/pre-arrival/${VALID_UUID_2}/start`,
      { method: 'POST' },
    );
    expect(res.status).toBe(401);
  });

  it('happy path returns 201 with sessionId', async () => {
    mockPreArrival.startConversation.mockResolvedValue('session-xyz');
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/aurion/pre-arrival/${VALID_UUID_2}/start`,
      { method: 'POST' },
    );
    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBe('session-xyz');
    expect(mockPreArrival.startConversation).toHaveBeenCalledWith(VALID_UUID, VALID_UUID_2);
  });

  it('dismiss endpoint returns 204', async () => {
    const res = await jsonRequest(
      `${baseUrl}/api/echo-resonance/aurion/pre-arrival/${VALID_UUID_2}/dismiss`,
      { method: 'POST' },
    );
    expect(res.status).toBe(204);
  });
});
