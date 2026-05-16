/**
 * echoAuditLogger.ts
 * ----------------------------------------------------------------------------
 * Logs Echo interactions for two purposes:
 *
 *   1. Product analytics — which modes get used, acceptance rates, refinement
 *      patterns. Feeds into the network intelligence layer (Pkg 5).
 *
 *   2. Safety audit — record what was suggested vs accepted, to investigate
 *      bad outputs after the fact.
 *
 * Implementation:
 *   - Buffered writes (batches of 10 or every 5s)
 *   - Fire-and-forget (does NOT block UI)
 *   - On failure, drops the batch (we don't want to grow memory if the
 *     audit endpoint is down)
 *
 * No PII logged:
 *   We log mode, input summary (truncated to 80 chars), output count,
 *   acceptance signals. We do NOT log full prompts or full responses
 *   from the client side — the proxy handles full request logging
 *   server-side where it's more secure.
 * ----------------------------------------------------------------------------
 */

import { getEchoProxyConfig } from './echoProxyConfig';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface EchoInteractionLog {
  mode: 'compose' | 'critique' | 'generate';
  inputSummary: string;
  outputCount: number;
  acceptedItemId?: string;
  /** Filled in by logger */
  timestamp?: number;
  sessionId?: string;
}

// ----------------------------------------------------------------------------
// Buffer
// ----------------------------------------------------------------------------

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5_000;

let buffer: EchoInteractionLog[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const sessionId = generateSessionId();

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export function logEchoInteraction(log: EchoInteractionLog): void {
  buffer.push({
    ...log,
    inputSummary: log.inputSummary.slice(0, 80),
    timestamp: Date.now(),
    sessionId,
  });

  if (buffer.length >= BATCH_SIZE) {
    void flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
  }
}

export async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (buffer.length === 0) return;

  const batch = buffer;
  buffer = [];

  try {
    const { proxyUrl, propertyApiKey } = await getEchoProxyConfig();
    if (!proxyUrl) return;

    await fetch(`${proxyUrl}/v1/echo/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(propertyApiKey ? { 'X-Property-Key': propertyApiKey } : {}),
      },
      body: JSON.stringify({ events: batch }),
      // Fire-and-forget — don't keep the page open for this
      keepalive: true,
    });
  } catch (err) {
    // Drop the batch on failure — better than memory bloat
    console.warn('[echoAuditLogger] flush failed; dropped batch', err);
  }
}

/**
 * Attempt to flush on page hide. Uses keepalive so it can complete
 * after navigation.
 */
export function attachAuditLifecycle(): () => void {
  if (typeof window === 'undefined') return () => {};
  const handle = () => {
    void flush();
  };
  window.addEventListener('pagehide', handle);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') handle();
  });
  return () => {
    window.removeEventListener('pagehide', handle);
  };
}

// ----------------------------------------------------------------------------
// Internal
// ----------------------------------------------------------------------------

function generateSessionId(): string {
  return `echo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
