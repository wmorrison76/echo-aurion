/**
 * ===========================================================================
 * Sensitivity classification
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Privacy classification of signals. Drives auto-decay timing per Tenet 7.
 *
 * WARNING: This is the canonical type contract for signal sensitivity levels.
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

export type SensitivityLevel =
  | 'public' | 'preference' | 'behavioral' | 'emotional' | 'sensitive' | 'forbidden';

export const RETENTION_DAYS: Record<SensitivityLevel, number> = {
  public: 365 * 5,
  preference: 365 * 2,
  behavioral: 90,
  emotional: 30,
  sensitive: 30,
  forbidden: 0,
};
