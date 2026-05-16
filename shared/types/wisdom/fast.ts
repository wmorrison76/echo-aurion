/**
 * ===========================================================================
 * Echo-Fast (S1) types
 * ===========================================================================
 * Layer:    Substrate: Wisdom Engine
 * Status:   STUB
 * Phase:    1
 *
 * Purpose:  On-device, sub-second reactive layer. Modeled on Helix System 1.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { Signal } from '../signals/signal';
import type { ResonanceReading } from '../resonance/reading';
import type { InterventionTemplate } from '../resonance/intervention';

export interface FastInput {
  signal: Signal;
  recentReadings: ResonanceReading[];
}

export interface FastOutput {
  classifiedReading?: ResonanceReading;
  suggestedIntervention?: InterventionTemplate;
  escalateToDeep: boolean;
  escalationReason?: string;
  latencyMs: number;
}
