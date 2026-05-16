/**
 * ===========================================================================
 * Handshake — mediates Echo-Fast (S1) and Echo-Deep (S2)
 * ===========================================================================
 * Layer:    Substrate: Wisdom Engine
 * Status:   IMPLEMENTED (Phase 1 — in-process pub/sub + deadline-aware fallback)
 * Phase:    1/6
 *
 * Purpose:  Master doc §3.3: Helix-style System 1 / System 2 split.
 *           Fast handles routine signals on-device (sub-200ms). Deep is
 *           invoked at "socially meaningful moments" — pre-arrival,
 *           lift-gap detection, novel-pattern signals — via this handshake.
 *
 *           Phase 1 strategy:
 *             - In-process pub/sub. Subscribers receive every handshake
 *               response. The cascade-bridge + the staff floor dashboard
 *               are the canonical consumers.
 *             - Deep target is a pluggable function (deepResolver). The
 *               orchestrator does not import the reasoner directly so we
 *               can swap LLM providers without touching the protocol.
 *             - Deadline-aware fallback: if deepResolver misses the
 *               deadline (default 30s), the handshake resolves with Fast's
 *               suggestion as a Deep response — the consumer never blocks
 *               waiting for a slow upstream.
 *
 *           Phase 6 extension: Deep resolver is wired to EchoAI² composite
 *           reasoner via echo-ai2-client; for now any caller may register
 *           via setDeepResolver. The default resolver is identity-on-Fast
 *           so the system degrades gracefully when no LLM is wired.
 * ===========================================================================
 */

import type {
  HandshakeRequest,
  HandshakeResponse,
  HandshakeReason,
  FastOutput,
  DeepOutput,
} from '../../../../shared/types/wisdom';
import { logger } from '../../../lib/logger';

export type DeepResolver = (input: {
  request: HandshakeRequest;
}) => Promise<DeepOutput>;

/** Default resolver: returns Fast's suggestion as a Deep result. The
 *  system never blocks; consumers always get an answer. */
const identityDeepResolver: DeepResolver = async ({ request }) => {
  const fast = request.fastOutput;
  return {
    recommendedInterventions: fast.suggestedIntervention
      ? [
          {
            id: `${fast.suggestedIntervention.id}-handshake-fallback`,
            templateId: fast.suggestedIntervention.id,
          } as DeepOutput['recommendedInterventions'][number],
        ]
      : [],
    reasoning: 'fast-passthrough: no Deep resolver wired',
    confidence: Math.max(0.3, Math.min(1, (fast.suggestedIntervention?.successRate ?? 0.5))),
    latencyMs: 0,
  };
};

function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
}

export class HandshakeOrchestrator {
  private subscribers = new Set<(r: HandshakeResponse) => void>();
  private deepResolver: DeepResolver = identityDeepResolver;

  /** Wire a new Deep resolver. Returns a disposer that re-installs the
   *  identity resolver so tests can isolate. */
  setDeepResolver(resolver: DeepResolver): () => void {
    this.deepResolver = resolver;
    return () => {
      this.deepResolver = identityDeepResolver;
    };
  }

  async requestDeepReasoning(
    fastOutput: FastOutput,
    reason: HandshakeReason,
    deadlineMs = 30_000,
  ): Promise<HandshakeResponse | null> {
    const request: HandshakeRequest = {
      id: uuidV4(),
      fastOutput,
      reason,
      requestedAt: new Date().toISOString(),
      deadlineMs,
    };

    const start = Date.now();

    // Race the resolver against the deadline. On timeout we fall back to
    // the identity resolver so the cascade bridge always gets an answer.
    const deepPromise = this.deepResolver({ request }).then(
      (out) => ({ kind: 'ok' as const, out }),
      (err) => ({ kind: 'err' as const, err }),
    );
    const timeoutPromise = new Promise<{ kind: 'timeout' }>((resolve) =>
      setTimeout(() => resolve({ kind: 'timeout' }), Math.max(1, deadlineMs)),
    );

    const result = await Promise.race([deepPromise, timeoutPromise]);
    let deepOutput: DeepOutput;

    if (result.kind === 'ok') {
      deepOutput = { ...result.out, latencyMs: Date.now() - start };
    } else {
      if (result.kind === 'err') {
        logger.warn('[handshake] deep resolver threw — falling back to fast passthrough', {
          reason,
          error: result.err instanceof Error ? result.err.message : String(result.err),
        });
      } else {
        logger.warn('[handshake] deep resolver missed deadline — falling back to fast passthrough', {
          reason,
          deadlineMs,
        });
      }
      const fallback = await identityDeepResolver({ request });
      deepOutput = { ...fallback, latencyMs: Date.now() - start };
    }

    const response: HandshakeResponse = {
      requestId: request.id,
      deepOutput,
      respondedAt: new Date().toISOString(),
    };

    // Publish to subscribers (sync notify; handlers are best-effort)
    for (const handler of this.subscribers) {
      try {
        handler(response);
      } catch (err) {
        logger.warn('[handshake] subscriber threw', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return response;
  }

  onResponse(handler: (response: HandshakeResponse) => void): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /** Test/operator helper: drop all subscribers. */
  clearSubscribers(): void {
    this.subscribers.clear();
  }
}

export const handshakeOrchestrator = new HandshakeOrchestrator();
