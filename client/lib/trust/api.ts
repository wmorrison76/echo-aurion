/**
 * ===========================================================================
 * Trust API client — Tenet 5 controls
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Typed fetch wrappers for /api/echo-resonance/me/* (the four
 *           Tenet 5 guest-facing controls per master doc §8.3).
 *           Routes are server-side stubs (server/routes/trust.ts);
 *           Phase 3.x wires them. The client API surface is built today
 *           so the UI components have a stable contract to call.
 *
 * Endpoints:
 *   GET   /api/echo-resonance/me/memory
 *   POST  /api/echo-resonance/me/memory/:itemId/forget
 *   POST  /api/echo-resonance/me/pause-aurion
 *   POST  /api/echo-resonance/me/resume-aurion
 *   POST  /api/echo-resonance/me/delete-everything
 *   GET   /api/echo-resonance/me/export
 * ===========================================================================
 */

import type { GuestMemoryView } from '../../../shared/types/trust';

const BASE = '/api/echo-resonance/me';

export class TrustApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TrustApiError';
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
      throw new TrustApiError(res.status, 'BAD_RESPONSE', `non-JSON from ${path}`);
    }
  }
  if (!res.ok || (body && body.success === false)) {
    throw new TrustApiError(
      res.status,
      body?.error ?? `HTTP_${res.status}`,
      body?.message ?? `Request to ${path} failed`,
    );
  }
  return body?.data ?? body;
}

/** "What do you remember about me?" */
export function fetchMemory(): Promise<GuestMemoryView> {
  return call<GuestMemoryView>('/memory');
}

export function forgetMemoryItem(itemId: string): Promise<void> {
  return call<void>(`/memory/${encodeURIComponent(itemId)}/forget`, { method: 'POST' });
}

export function pauseAurion(): Promise<void> {
  return call<void>('/pause-aurion', { method: 'POST' });
}

export function resumeAurion(): Promise<void> {
  return call<void>('/resume-aurion', { method: 'POST' });
}

export interface DeleteEverythingResult {
  deletedSignals: number;
  deletedReadings: number;
  deletedSessions: number;
  deletedWhispers: number;
}

export function deleteEverything(): Promise<DeleteEverythingResult> {
  return call<DeleteEverythingResult>('/delete-everything', { method: 'POST' });
}

/** Returns a download URL or a JSON blob the caller can serialize. */
export function requestDataExport(): Promise<{ url?: string; data?: unknown; status: 'ready' | 'pending' }> {
  return call('/export');
}
