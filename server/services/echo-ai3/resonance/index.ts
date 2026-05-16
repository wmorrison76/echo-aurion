/**
 * ===========================================================================
 * Resonance services — public exports
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Re-exports for the resonance backend services.
 *
 *           Phase 1 implementations (callable now):
 *             - resonance-engine (createReading, getRecentReadings, scoreFromAffect)
 *             - trajectory-engine (updateTrajectory, getFloorView, getTrajectory)
 *             - intervention-library (full state machine + listTemplates)
 *             - cascade-bridge (lightweight Phase 1; LUCCCA cascader bridge
 *               is the Phase 1.4+ extension point documented in that file)
 *
 *           Phase 2-3 stubs (export shape exists; bodies throw):
 *             - resonance-fast (Echo-Fast / System 1 — Phase 3 voice latency)
 *             - forecast-engine (pre-arrival forecast — Phase 2)
 * ===========================================================================
 */

export * from './resonance-engine';
export * from './resonance-fast';
export * from './trajectory-engine';
export * from './intervention-library';
export * from './forecast-engine';
export * from './cascade-bridge';
