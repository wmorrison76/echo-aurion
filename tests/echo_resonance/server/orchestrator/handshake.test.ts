/**
 * ===========================================================================
 * Handshake orchestrator tests
 * ===========================================================================
 * Layer:    Substrate: Wisdom Engine
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Cover the four contract guarantees:
 *   1. Resolver result is returned with computed latency.
 *   2. Resolver throws → fall back to fast passthrough; no exception.
 *   3. Resolver misses deadline → fall back; never blocks past deadline.
 *   4. Subscribers receive every response; throwing subscribers do not
 *      poison siblings.
 * ===========================================================================
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { HandshakeOrchestrator } from '../../../../server/services/echo-ai3/orchestrator/handshake';
import type { FastOutput, HandshakeResponse } from '../../../../shared/types/wisdom';

function fastOutput(over: Partial<FastOutput> = {}): FastOutput {
  return {
    classifiedReading: undefined,
    suggestedIntervention: {
      id: '00000000-0000-0000-0000-000000000abc',
      name: 'quiet-tour',
      description: 'noticed-only',
      affectQuadrants: ['low-pos'],
      approach: 'gentle-approach',
      effort: 'frictionless',
      leadTimeMinutes: 0,
      estimatedCostCents: 0,
      estimatedCostCurrency: 'USD',
      reuseCooldownDays: 0,
      departmentsRequired: [],
      doNots: [],
      timesUsed: 10,
      successRate: 0.7,
      active: true,
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z',
    },
    escalateToDeep: true,
    escalationReason: 'lift-gap-detected',
    latencyMs: 12,
    ...over,
  };
}

describe('HandshakeOrchestrator', () => {
  let orchestrator: HandshakeOrchestrator;

  beforeEach(() => {
    orchestrator = new HandshakeOrchestrator();
  });

  it('returns the resolver result with computed latency', async () => {
    orchestrator.setDeepResolver(async () => ({
      recommendedInterventions: [],
      reasoning: 'deep ok',
      confidence: 0.9,
      latencyMs: 0,
    }));
    const response = await orchestrator.requestDeepReasoning(
      fastOutput(),
      'lift-gap-detected',
      1000,
    );
    expect(response).not.toBeNull();
    expect(response!.deepOutput.reasoning).toBe('deep ok');
    expect(response!.deepOutput.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('falls back to fast passthrough when resolver throws', async () => {
    orchestrator.setDeepResolver(async () => {
      throw new Error('upstream down');
    });
    const response = await orchestrator.requestDeepReasoning(
      fastOutput(),
      'lift-gap-detected',
      1000,
    );
    expect(response).not.toBeNull();
    expect(response!.deepOutput.reasoning).toContain('fast-passthrough');
  });

  it('falls back when resolver misses the deadline', async () => {
    orchestrator.setDeepResolver(
      () => new Promise(() => undefined), // never resolves
    );
    const start = Date.now();
    const response = await orchestrator.requestDeepReasoning(
      fastOutput(),
      'lift-gap-detected',
      50,
    );
    const elapsed = Date.now() - start;
    expect(response).not.toBeNull();
    expect(elapsed).toBeLessThan(500);
    expect(response!.deepOutput.reasoning).toContain('fast-passthrough');
  });

  it('publishes responses to subscribers; throwing subscribers do not poison siblings', async () => {
    const received: HandshakeResponse[] = [];
    orchestrator.onResponse(() => {
      throw new Error('boom');
    });
    orchestrator.onResponse((r) => {
      received.push(r);
    });
    orchestrator.setDeepResolver(async () => ({
      recommendedInterventions: [],
      reasoning: 'ok',
      confidence: 1,
      latencyMs: 0,
    }));
    await orchestrator.requestDeepReasoning(fastOutput(), 'novel-signal-pattern', 200);
    expect(received.length).toBe(1);
  });
});
