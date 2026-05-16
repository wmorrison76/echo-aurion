/**
 * ===========================================================================
 * Aurion API client
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3/4
 *
 * Purpose:  Typed fetch wrappers for /api/echo-resonance/aurion/* endpoints.
 *           Mirrors the trust-API client pattern: typed errors, JSON
 *           parsing on 2xx, structured failures on 4xx/5xx.
 * ===========================================================================
 */

import type { VoiceSession, StaffWhisper } from '../../../shared/types/aurion';

const BASE = '/api/echo-resonance/aurion';

export class AurionApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AurionApiError';
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new AurionApiError(res.status, 'BAD_RESPONSE', `non-JSON from ${path}`);
    }
  }
  if (!res.ok || (body && body.success === false)) {
    throw new AurionApiError(
      res.status,
      body?.error ?? `HTTP_${res.status}`,
      body?.message ?? `Request to ${path} failed`,
    );
  }
  return body as T;
}

export interface StartSessionArgs {
  context: VoiceSession['context'];
  voiceProfileId: string;
  guestId?: string;
  staffId?: string;
  transcriptOptIn?: boolean;
}

export async function startSession(args: StartSessionArgs): Promise<VoiceSession> {
  return call<VoiceSession>('/sessions', { method: 'POST', body: JSON.stringify(args) });
}

export async function endSession(sessionId: string, outcomeSummary?: string): Promise<VoiceSession> {
  return call<VoiceSession>(`/sessions/${encodeURIComponent(sessionId)}/end`, {
    method: 'POST',
    body: JSON.stringify({ outcomeSummary }),
  });
}

export async function recentWhispersForStaff(opts: { since?: string; limit?: number } = {}): Promise<StaffWhisper[]> {
  const params = new URLSearchParams();
  if (opts.since) params.set('since', opts.since);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return call<StaffWhisper[]>(`/whispers/recent${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export type WhisperFlagKind = 'helpful' | 'wrong' | 'too-late' | 'too-much';

export async function flagWhisper(whisperId: string, flag: WhisperFlagKind, note?: string): Promise<void> {
  await call<void>(`/whispers/${encodeURIComponent(whisperId)}/flag`, {
    method: 'POST',
    body: JSON.stringify({ flag, note }),
  });
}

export async function startPreArrivalConversation(tripId: string): Promise<{ sessionId: string }> {
  return call<{ sessionId: string }>(
    `/pre-arrival/${encodeURIComponent(tripId)}/start`,
    { method: 'POST' },
  );
}

export async function dismissPreArrivalInvitation(tripId: string): Promise<void> {
  await call<void>(`/pre-arrival/${encodeURIComponent(tripId)}/dismiss`, { method: 'POST' });
}
