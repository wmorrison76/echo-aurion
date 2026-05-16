/**
 * Setup forecast for new outlet during onboarding.
 */

import { buildForecastEngineForOutlet } from "../forecast/engine-builder";

export interface OutletConfig {
  outletId: string;
  outletName?: string;
  outletType?: string;
  location?: string;
}

export interface IntegrationConfig {
  type: string;
  outletId: string;
  config: Record<string, unknown>;
}

/**
 * Setup forecast engine and data sources for a new outlet.
 */
export async function setupForecastForNewOutlet(
  orgId: string,
  outletId: string,
  outletConfig: OutletConfig,
): Promise<void> {
  await buildForecastEngineForOutlet(orgId, outletId, outletConfig);
}

/**
 * Configure forecast data sources (POS, reservations) for an outlet.
 */
export async function configureForecastSources(
  _outletId: string,
  _integrations: IntegrationConfig[],
): Promise<void> {
  // Stub: wire POS/reservation integrations to outlet
}
