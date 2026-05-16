/**
 * ===========================================================================
 * Echo-Deep (S2) types
 * ===========================================================================
 * Layer:    Substrate: Wisdom Engine
 * Status:   STUB
 * Phase:    1
 *
 * Purpose:  Server-side LLM-class reasoner. Composes cascades, generates briefs, learns from outcomes.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { Signal } from '../signals/signal';
import type { ResonanceTrajectory } from '../resonance/trajectory';
import type { InterventionExecution } from '../resonance/intervention';
import type { UUID } from '../base';

export interface DeepInput {
  triggeringSignal: Signal;
  trajectory?: ResonanceTrajectory;
  guestProfile?: any;
  reason: 'escalation-from-fast' | 'scheduled' | 'pre-arrival' | 'manual';
}

export interface DeepOutput {
  recommendedInterventions: InterventionExecution[];
  cascadeId?: UUID;
  reasoning: string;
  confidence: number;
  latencyMs: number;
}
