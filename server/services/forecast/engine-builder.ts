/**
 * Build forecast engine for each outlet during onboarding.
 */

export interface OutletConfig {
  outletId: string;
  outletName?: string;
  outletType?: string;
  size?: string;
  location?: string;
}

export interface ForecastEngine {
  outletId: string;
  algorithm: string;
  parameters: Record<string, unknown>;
  trainedAt?: string;
}

export type ForecastAlgorithm = "linear" | "historical_avg" | "weighted_sources";

/**
 * Build forecast engine for a new outlet.
 */
export async function buildForecastEngineForOutlet(
  _orgId: string,
  outletId: string,
  outletConfig: OutletConfig,
): Promise<ForecastEngine> {
  return {
    outletId,
    algorithm: "weighted_sources",
    parameters: {},
    trainedAt: new Date().toISOString(),
  };
}

/**
 * Select forecast algorithm based on outlet config.
 */
export function selectForecastAlgorithm(_outletConfig: OutletConfig): ForecastAlgorithm {
  return "weighted_sources";
}
