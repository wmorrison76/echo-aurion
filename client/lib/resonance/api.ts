/**
 * ===========================================================================
 * Resonance API client — typed fetch wrappers for /api/echo-resonance/*
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Thin typed wrappers over the Phase 1.4 routes. Every call:
 *             - sends credentials (cookies) so requireAuth on the server
 *               picks up the staff session
 *             - parses the canonical { success, data, error, message } envelope
 *             - throws a typed ResonanceApiError on non-2xx
 *
 * The canonical paths are owned by server/routes/resonance.ts +
 * server/routes/signals.ts. If you change a path here, update the route
 * file in the same commit.
 *
 * WARNING: This file is the single point of contact between the React
 * surface and the Phase 1 server. The hooks in use-resonance.ts and the
 * components consume these functions. Keep the type contract honest.
 * ===========================================================================
 */

import type {
  AffectCoordinate,
  InterventionExecution,
  InterventionTemplate,
  NewResonanceReading,
  ResonanceReading,
  ResonanceTrajectory,
  TrajectoryTile,
} from '../../../shared/types/resonance';
import type { Signal, SignalSource } from '../../../shared/types/signals';

const BASE = '/api/echo-resonance';

// ---------------------------------------------------------------------------
// Error type — components can `instanceof` this to render typed UI for
// 400 / 404 / 409 vs 500.
// ---------------------------------------------------------------------------

export class ResonanceApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ResonanceApiError';
  }
}

// ---------------------------------------------------------------------------
// Internal — request envelope handling
// ---------------------------------------------------------------------------

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ErrorEnvelope {
  success: false;
  error: string;
  message?: string;
}

/**
 * Retry policy for `call()`. We retry on:
 *   - network errors (fetch throws)
 *   - HTTP 502 / 503 / 504 (transient gateway failures)
 *   - HTTP 429 (rate-limited; backoff helps)
 *
 * We do NOT retry on:
 *   - 4xx other than 429 (client error; retrying won't help)
 *   - 5xx other than the gateway codes (likely a real bug)
 *
 * POSTs are retried only when an Idempotency-Key is present in the
 * outgoing headers — without it, a retry could create a duplicate write.
 * The two creation POSTs (submitReading, recordProposal) auto-generate
 * a key per call so retries are safe by default.
 *
 * Backoff: exponential with jitter. 200ms, 500ms, 1200ms (× ±20% jitter).
 */
const MAX_ATTEMPTS = 3;
const RETRY_STATUS_CODES = new Set([429, 502, 503, 504]);
const BACKOFF_MS = [200, 500, 1200];

function jitter(ms: number): number {
  const factor = 0.8 + Math.random() * 0.4; // 0.8 .. 1.2
  return Math.round(ms * factor);
}

function isRetryableError(status: number): boolean {
  return RETRY_STATUS_CODES.has(status);
}

function generateIdempotencyKey(): string {
  // crypto.randomUUID is available in modern browsers + jsdom
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // fallback for ancient runtimes — collision-resistant enough for an
  // idempotency window of 24h
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function call<T>(
  path: string,
  init?: RequestInit & { expect204?: boolean },
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const isMutation = method !== 'GET' && method !== 'HEAD';

  // For mutations: ensure an Idempotency-Key is set so retry is safe.
  // Caller can override by passing their own header.
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined ?? {}),
  };
  if (isMutation && !headers['idempotency-key'] && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = generateIdempotencyKey();
  }

  let lastErr: unknown = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        credentials: 'include',
        ...init,
        headers,
      });

      // 204 No Content (recordOutcome path) — return undefined as T
      if (res.status === 204 || init?.expect204) {
        return undefined as T;
      }

      // Transient — retry with backoff (except on the last attempt)
      if (isRetryableError(res.status) && attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, jitter(BACKOFF_MS[attempt])));
        continue;
      }

      let body: SuccessEnvelope<T> | ErrorEnvelope | null = null;
      const text = await res.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          throw new ResonanceApiError(
            res.status,
            'BAD_RESPONSE',
            `non-JSON response from ${path}`,
          );
        }
      }

      if (!res.ok || !body || (body && body.success === false)) {
        const err = body as ErrorEnvelope | null;
        throw new ResonanceApiError(
          res.status,
          err?.error ?? `HTTP_${res.status}`,
          err?.message ?? `Request to ${path} failed`,
        );
      }

      return (body as SuccessEnvelope<T>).data;
    } catch (err) {
      lastErr = err;
      // Distinguish: network errors (TypeError from fetch) → retry.
      // ResonanceApiError thrown above is not retried (we already returned
      // through the retry path above for retryable status codes).
      const isNetworkError = !(err instanceof ResonanceApiError);
      if (!isNetworkError || attempt === MAX_ATTEMPTS - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, jitter(BACKOFF_MS[attempt])));
    }
  }

  // Unreachable in practice — the loop either returns or throws — but
  // TypeScript wants a narrowing here.
  throw lastErr instanceof Error
    ? lastErr
    : new ResonanceApiError(0, 'UNKNOWN', `Request to ${path} failed after retries`);
}

// ---------------------------------------------------------------------------
// Reading lifecycle
// ---------------------------------------------------------------------------

export function submitReading(reading: NewResonanceReading): Promise<ResonanceReading> {
  return call<ResonanceReading>('/readings', {
    method: 'POST',
    body: JSON.stringify(reading),
  });
}

export function fetchRecentReadings(
  guestId: string,
  limit = 10,
): Promise<ResonanceReading[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  return call<ResonanceReading[]>(`/guests/${guestId}/readings?${qs}`);
}

// ---------------------------------------------------------------------------
// Trajectory dashboard
// ---------------------------------------------------------------------------

export function fetchFloorView(propertyId: string): Promise<TrajectoryTile[]> {
  return call<TrajectoryTile[]>(`/floor/${propertyId}`);
}

export function fetchTrajectory(visitId: string): Promise<ResonanceTrajectory | null> {
  return call<ResonanceTrajectory>(`/visits/${visitId}/trajectory`).catch((err) => {
    if (err instanceof ResonanceApiError && err.status === 404) {
      return null;
    }
    throw err;
  });
}

// ---------------------------------------------------------------------------
// Intervention library
// ---------------------------------------------------------------------------

export interface FindCandidatesArgs {
  affect: AffectCoordinate;
  presentSignals: string[];
  guestId: string;
  visitId: string;
}

export function findCandidates(args: FindCandidatesArgs): Promise<InterventionTemplate[]> {
  return call<InterventionTemplate[]>('/interventions/candidates', {
    method: 'POST',
    body: JSON.stringify(args),
  });
}

export interface ProposalInput {
  templateId: string;
  guestId: string;
  visitId: string;
  proposedBy: 'echo-fast' | 'echo-deep' | 'staff';
  cascadeId: string | null;
  preReading?: number;
  notes?: string;
}

export function recordProposal(input: ProposalInput): Promise<InterventionExecution> {
  return call<InterventionExecution>('/interventions/proposals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function recordApproval(
  executionId: string,
  approvedBy: string,
): Promise<InterventionExecution> {
  return call<InterventionExecution>(`/interventions/${executionId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approvedBy }),
  });
}

export function recordExecution(
  executionId: string,
  preReading?: number,
): Promise<InterventionExecution> {
  return call<InterventionExecution>(`/interventions/${executionId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ preReading }),
  });
}

export function recordSkip(
  executionId: string,
  notes?: string,
): Promise<InterventionExecution> {
  return call<InterventionExecution>(`/interventions/${executionId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export function recordOutcome(
  executionId: string,
  outcomeScore: number,
  postReading: number,
): Promise<void> {
  return call<void>(`/interventions/${executionId}/outcome`, {
    method: 'POST',
    body: JSON.stringify({ outcomeScore, postReading }),
    expect204: true,
  });
}

export function listTemplates(limit?: number): Promise<InterventionTemplate[]> {
  const qs = limit ? `?${new URLSearchParams({ limit: String(limit) })}` : '';
  return call<InterventionTemplate[]>(`/interventions/templates${qs}`);
}

// ---------------------------------------------------------------------------
// Signals (read-side)
// ---------------------------------------------------------------------------

export function fetchSignalsForGuest(guestId: string, limit = 50): Promise<Signal[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  return call<Signal[]>(`/signals/guest/${guestId}?${qs}`);
}

export function fetchSignalsForVisit(visitId: string): Promise<Signal[]> {
  return call<Signal[]>(`/signals/visit/${visitId}`);
}

export function fetchSignalsBySource(
  source: SignalSource,
  since?: string,
): Promise<Signal[]> {
  const qs = since ? `?${new URLSearchParams({ since })}` : '';
  return call<Signal[]>(`/signals/source/${source}${qs}`);
}
