/**
 * ===========================================================================
 * Signal types — public exports
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Canonical type exports for the unified signal graph.
 *
 *           These types are the contract between every layer that emits
 *           signals (whisper widget, resonance engine, integrations) and
 *           every layer that consumes them (signal-query, dashboard, audit).
 *
 *           Tenet 3 enforcement: this barrel is on the forbidden-imports
 *           list for commerce modules. See tests/echo_resonance/privacy/
 *           forbidden-uses.test.ts for the static-analysis gate.
 * ===========================================================================
 */

export * from './tag';
export * from './sensitivity';
export * from './signal';
