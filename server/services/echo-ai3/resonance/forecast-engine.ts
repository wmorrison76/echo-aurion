/**
 * ===========================================================================
 * Pre-arrival forecast engine
 * ===========================================================================
 * Layer:    Resonance
 * Status:   STUB
 * Phase:    1
 *
 * Purpose:  Predict guest entry score before arrival using existing predictive services + Aurion pre-call signals.
 *
 * Integrates with existing LUCCCA modules:
 *   - server/services/predictive-guest-experience-service.ts
 *   - server/services/predictive-guest-arrival-service.ts
 *
 * Pending implementation:
 *   - [ ] Wire to existing predictive-guest-experience-service.ts
 *   - [ ] Wire to existing predictive-guest-arrival-service.ts
 *   - [ ] Implement compose(): combine inputs into ResonanceForecast
 *   - [ ] Recompute on flight delay / weather change / pre-arrival voice complete
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { ForecastInput, ResonanceForecast } from '../../../../shared/types/resonance';

export class ForecastEngine {
  /** Compose a forecast from all available signals. */
  async compose(input: ForecastInput): Promise<ResonanceForecast> {
    // TODO: implement
    throw new Error('Not implemented (Phase 1)');
  }

  /** Recompute when a triggering event arrives (delay, weather, pre-call complete). */
  async recompute(guestId: string): Promise<ResonanceForecast | null> {
    // TODO: implement
    throw new Error('Not implemented (Phase 1)');
  }
}

export const forecastEngine = new ForecastEngine();
