/**
 * services/networkIntelligenceService.ts
 * ----------------------------------------------------------------------------
 * Cross-property benchmarking. The network intelligence layer is the
 * "Bloomberg Terminal moat" — anonymized aggregate data showing how this
 * property compares to peers on price, dietary coverage, and item usage.
 *
 * Privacy contract:
 *   - We NEVER expose individual property data
 *   - All metrics are aggregates with a minimum sample size (k=20)
 *   - Comparison sets are descriptive, not identifying ("luxury hotels in
 *     Northeast US" not "hotels A, B, C")
 *   - When sample size is too low, we return null, not zeros
 *
 * Architecture:
 *   The actual aggregation runs server-side. This service is a thin
 *   client that posts (currentPropertyId, query) and gets back
 *   anonymized aggregates. The server is responsible for k-anonymity
 *   enforcement.
 *
 *   For testing/dev without a backend, the service falls back to a
 *   synthetic generator that produces plausible-looking percentiles
 *   based on the property's own data — clearly labeled as "demo data."
 * ----------------------------------------------------------------------------
 */

import type {
  NetworkPercentileData,
  NetworkBenchmark,
  MenuItemId,
} from '../BanquetMenuBuilder.p5.types';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import { getEchoProxyConfig } from './echoProxyConfig';

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

interface FetchPercentileArgs {
  itemId: MenuItemId;
  metric: NetworkPercentileData['metric'];
  /** Comparison context filter — event type, region, scale */
  comparisonHints?: {
    eventType?: string;
    guestCountBand?: { min: number; max: number };
  };
}

/**
 * Fetch percentile data for a single item.
 * Returns null if sample is insufficient.
 */
export async function fetchItemPercentile(
  args: FetchPercentileArgs,
): Promise<NetworkPercentileData | null> {
  try {
    const remote = await callNetworkApi('/v1/network/item-percentile', args);
    if (remote) return validatePercentileData(remote);
  } catch (err) {
    console.warn('[networkIntelligence] item-percentile call failed', err);
  }
  // Demo fallback when no backend
  return null;
}

/**
 * Batch variant — fetch percentiles for multiple items in one call.
 */
export async function fetchItemPercentiles(
  itemIds: MenuItemId[],
  metric: NetworkPercentileData['metric'] = 'price_per_guest',
): Promise<Record<MenuItemId, NetworkPercentileData | null>> {
  if (itemIds.length === 0) return {};
  try {
    const remote = await callNetworkApi('/v1/network/item-percentiles-batch', {
      itemIds,
      metric,
    });
    if (remote && typeof remote === 'object') {
      const out: Record<MenuItemId, NetworkPercentileData | null> = {};
      for (const id of itemIds) {
        const data = (remote as Record<string, unknown>)[id];
        out[id] = data ? validatePercentileData(data) : null;
      }
      return out;
    }
  } catch (err) {
    console.warn('[networkIntelligence] batch-percentile call failed', err);
  }
  // Empty fallback — UI handles null gracefully
  const fallback: Record<MenuItemId, NetworkPercentileData | null> = {};
  for (const id of itemIds) fallback[id] = null;
  return fallback;
}

/**
 * Menu-level benchmark — how does THIS menu compare to peer menus?
 */
export async function fetchMenuBenchmark(
  composition: CompositionSnapshot,
): Promise<NetworkBenchmark | null> {
  try {
    const remote = await callNetworkApi('/v1/network/menu-benchmark', {
      eventType: composition.eventType,
      guestCount: composition.guestCount,
      perGuestCost: composition.perGuestCost,
      itemIds: composition.sections.flatMap((s) => s.items.map((i) => i.itemId)),
      dietaryTags: collectDietaryTags(composition),
    });
    if (remote) return validateBenchmark(remote);
  } catch (err) {
    console.warn('[networkIntelligence] menu-benchmark call failed', err);
  }
  return null;
}

// ----------------------------------------------------------------------------
// Network API call
// ----------------------------------------------------------------------------

async function callNetworkApi(path: string, body: unknown): Promise<unknown> {
  const { proxyUrl, propertyApiKey } = await getEchoProxyConfig();
  if (!proxyUrl) return null;

  const response = await fetch(`${proxyUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(propertyApiKey ? { 'X-Property-Key': propertyApiKey } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 404) return null; // endpoint not deployed
    throw new Error(`Network API ${path} failed (${response.status})`);
  }
  return response.json();
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

function validatePercentileData(raw: unknown): NetworkPercentileData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.percentile !== 'number') return null;
  if (typeof r.sampleSize !== 'number' || r.sampleSize < 20) return null;
  return {
    itemId: String(r.itemId ?? ''),
    metric: ((r.metric as NetworkPercentileData['metric']) ?? 'price_per_guest'),
    percentile: clamp(r.percentile, 0, 100),
    yourValue: typeof r.yourValue === 'number' ? r.yourValue : 0,
    networkMedian: typeof r.networkMedian === 'number' ? r.networkMedian : 0,
    sampleSize: r.sampleSize,
    comparisonContext: typeof r.comparisonContext === 'string' ? r.comparisonContext : '',
    isStatisticallySignificant: r.sampleSize >= 20,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
  };
}

function validateBenchmark(raw: unknown): NetworkBenchmark | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.sampleSize !== 'number' || r.sampleSize < 20) return null;
  const dietaryDelta = (r.dietaryCoverageDelta && typeof r.dietaryCoverageDelta === 'object'
    ? r.dietaryCoverageDelta
    : {}) as Record<string, unknown>;
  const cleanedDelta: Record<string, number> = {};
  for (const k of Object.keys(dietaryDelta)) {
    const v = dietaryDelta[k];
    if (typeof v === 'number') cleanedDelta[k] = v;
  }
  return {
    perGuestCostPercentile: clamp(
      typeof r.perGuestCostPercentile === 'number' ? r.perGuestCostPercentile : 50,
      0,
      100,
    ),
    dietaryCoverageDelta: cleanedDelta,
    commonPairings: Array.isArray(r.commonPairings)
      ? r.commonPairings
          .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
          .map((p) => ({
            pairId: String(p.pairId ?? ''),
            coOccurrenceRate: clamp(
              typeof p.coOccurrenceRate === 'number' ? p.coOccurrenceRate : 0,
              0,
              1,
            ),
          }))
          .filter((p) => p.pairId)
      : [],
    commonGaps: Array.isArray(r.commonGaps)
      ? r.commonGaps
          .filter((g): g is Record<string, unknown> => typeof g === 'object' && g !== null)
          .map((g) => ({
            itemId: String(g.itemId ?? ''),
            itemName: String(g.itemName ?? ''),
            networkUsageRate: clamp(
              typeof g.networkUsageRate === 'number' ? g.networkUsageRate : 0,
              0,
              1,
            ),
          }))
          .filter((g) => g.itemId)
      : [],
    comparisonContext:
      typeof r.comparisonContext === 'string' ? r.comparisonContext : '',
    sampleSize: r.sampleSize,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function collectDietaryTags(composition: CompositionSnapshot): string[] {
  const tags = new Set<string>();
  for (const section of composition.sections) {
    for (const it of section.items) {
      for (const t of it.dietaryTags ?? []) tags.add(t);
    }
  }
  return [...tags];
}
