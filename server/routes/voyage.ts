/**
 * ===========================================================================
 * Voyage HTTP routes
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Trip, brief, plan, map, and signal-emitting endpoints for the Voyage app.
 *
 * Depends on:
 *   - server/services/echo-ai3/voyage/trip-engine.ts
 *   - server/services/echo-ai3/voyage/brief-engine.ts
 *   - server/services/echo-ai3/voyage/plan-engine.ts
 *   - server/services/echo-ai3/voyage/map-engine.ts
 *
 * Pending implementation:
 *   - [ ] GET  /api/echo-resonance/voyage/trips/:id - trip + brief + plan
 *   - [ ] GET  /api/echo-resonance/voyage/trips/:id/brief - current brief
 *   - [ ] GET  /api/echo-resonance/voyage/trips/:id/plan - living plan
 *   - [ ] POST /api/echo-resonance/voyage/blocks - add/edit/dismiss
 *   - [ ] GET  /api/echo-resonance/voyage/trips/:id/map - opinionated map view
 *   - [ ] POST /api/echo-resonance/voyage/signals - record taps/dwells/etc.
 *   - [ ] Auth: guest JWT
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

export function registerVoyageRoutes(router: any): void {
  throw new Error('Not implemented (Phase 2)');
}
