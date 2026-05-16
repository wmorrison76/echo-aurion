/**
 * Main aggregation service: aggregate data from BEO, Calendar, Hotel, Reservations, POS.
 */

import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";
import type { AggregatedForecast, NormalizedForecastPoint } from "../../../shared/types/forecast-aggregation";
import {
  normalizeForecastPoint,
  resolveConflicts,
  calculateSourceWeights,
  type ForecastSource,
} from "./data-normalization";

export type DateRange = { start: string; end: string };

export type SourceFetcher = (
  orgId: string,
  dateRange: DateRange,
  context: { supabase: any; userId?: string },
) => Promise<ForecastDataPoint[]>;

/**
 * Aggregate forecast data from all configured sources.
 */
export async function aggregateForecastData(
  orgId: string,
  dateRange: DateRange,
  fetchers: Record<string, SourceFetcher>,
  context: { supabase: any; userId?: string },
): Promise<AggregatedForecast> {
  const all: ForecastDataPoint[] = [];
  const sourceCounts: Record<string, number> = {};

  for (const [name, fn] of Object.entries(fetchers)) {
    try {
      const points = await fn(orgId, dateRange, context);
      sourceCounts[name] = points.length;
      all.push(...points);
    } catch (_e) {
      sourceCounts[name] = 0;
    }
  }

  const sources: ForecastSource[] = [...new Set(all.map((p) => p.source))].map((type) => ({
    type,
    weight: calculateSourceWeights([type])[type] ?? 0.5,
  }));

  const normalized: NormalizedForecastPoint[] = all.map((p) =>
    normalizeForecastPoint(
      p,
      sources.find((s) => s.type === p.source) ?? { type: p.source, weight: 0.5 },
    ),
  );

  const resolved = resolveConflicts(normalized);

  return {
    orgId,
    dateRange,
    points: resolved,
    sourceCounts,
    generatedAt: new Date().toISOString(),
  };
}
