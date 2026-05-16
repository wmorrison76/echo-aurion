/**
 * ===========================================================================
 * Intervention library and execution types
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Templates conditioned on affect quadrant + signal pattern + guest profile, plus the execution log that feeds the learning loop.
 *
 * Aligned to: server/database/migrations/010_interventions_library.sql
 *             server/database/migrations/011_interventions_executed.sql
 *
 * WARNING: This is the canonical type contract for intervention library and execution.
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

import type { UUID, ISODate } from '../base';

export type AffectQuadrant = 'high-pos' | 'high-neg' | 'low-pos' | 'low-neg';

export type InterventionApproachClass =
  | 'active-waiting' | 'gentle-approach' | 'protective' | 'cascade-only' | 'voice-only';

export type InterventionEffort = 'frictionless' | 'light' | 'medium' | 'heavy';

export interface InterventionTemplate {
  id: UUID;
  name: string;
  description: string;
  affectQuadrants: AffectQuadrant[];        // SQL TEXT[] NOT NULL
  requiresSignals?: string[];               // sometimes-not-yet
  excludeSignals?: string[];                // sometimes-not-yet
  approach: InterventionApproachClass;
  effort: InterventionEffort;
  leadTimeMinutes: number;                  // SQL INT NOT NULL
  estimatedCostCents: number;               // SQL INT NOT NULL DEFAULT 0
  estimatedCostCurrency: string;            // SQL TEXT NOT NULL DEFAULT 'USD'
  reuseCooldownDays: number;                // SQL INT NOT NULL DEFAULT 0
  departmentsRequired: string[];            // SQL TEXT[] NOT NULL DEFAULT '{}'
  proxemicGuidance?: string;                // sometimes-not-yet
  scriptedDirection?: string;               // sometimes-not-yet (DIRECTION not DIALOGUE)
  doNots: string[];                         // SQL TEXT[] NOT NULL DEFAULT '{}'
  timesUsed: number;                        // SQL INT NOT NULL DEFAULT 0
  successRate: number;                      // SQL REAL NOT NULL DEFAULT 0
  lastUsedAt?: ISODate;                     // temporal: never-used → first-used
  active: boolean;                          // SQL BOOLEAN NOT NULL DEFAULT true
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type ProposedBy = 'echo-fast' | 'echo-deep' | 'staff';

export type InterventionStatus = 'proposed' | 'approved' | 'executed' | 'skipped' | 'completed';

export interface InterventionExecution {
  id: UUID;
  templateId: UUID;                         // FK to interventions_library.id
  guestId: UUID;
  visitId: UUID;
  proposedAt: ISODate;
  proposedBy: ProposedBy;
  approvedBy?: UUID;                        // temporal: state-machine pathway
  approvedAt?: ISODate;                     // temporal
  status: InterventionStatus;
  preReading?: number;                      // temporal: recorded pre-execution
  postReading?: number;                     // temporal: recorded post-execution
  outcomeScore?: number;                    // temporal: computed post-completion
  notes?: string;                           // sometimes-not-yet
  cascadeId: UUID | null;                   // by-design: some interventions don't fire a cascade
  createdAt: ISODate;
  updatedAt: ISODate;
}
