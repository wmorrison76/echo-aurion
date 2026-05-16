/**
 * ===========================================================================
 * Network aggregates - anonymized cross-property statistics
 * ===========================================================================
 * Layer:    Substrate: Network
 * Status:   STUB
 * Phase:    6
 *
 * Purpose:  Aggregate types that flow across the network without identifying any single guest.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

export interface SegmentAggregate {
  segmentKey: string;
  sampleSize: number;
  affinityProfile: Record<string, number>;
  averageEntryScore: number;
  averageLift: number;
  topInterventionPatterns: string[];
}

export interface InterventionPatternAggregate {
  patternId: string;
  affectQuadrant: string;
  averageSuccessRate: number;
  sampleSize: number;
  signalsCorrelated: string[];
}
