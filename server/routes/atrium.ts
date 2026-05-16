/**
 * ===========================================================================
 * Atrium HTTP routes
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Venue page composition, media library admin, view-recording endpoints.
 *
 * Depends on:
 *   - server/services/echo-ai3/atrium/venue-engine.ts
 *   - server/services/echo-ai3/atrium/media-library.ts
 *
 * Pending implementation:
 *   - [ ] GET  /api/echo-resonance/atrium/venues - list for current property
 *   - [ ] GET  /api/echo-resonance/atrium/venues/:id/page - composed page for guest
 *   - [ ] POST /api/echo-resonance/atrium/media - upload + tag (marketing role)
 *   - [ ] POST /api/echo-resonance/atrium/media/:id/publish - cross-channel deploy
 *   - [ ] POST /api/echo-resonance/atrium/views - record asset view duration
 *   - [ ] Auth: guest JWT for view recording; staff/marketing JWT for upload
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

export function registerAtriumRoutes(router: any): void {
  throw new Error('Not implemented (Phase 5)');
}
