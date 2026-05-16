/**
 * eventCostHistoryService.ts
 * ----------------------------------------------------------------------------
 * Wraps the existing event-orchestration data layer to expose recent
 * comparable events for the cost variance detector.
 *
 * Resolution order:
 *   1. /api/banquet-menus/event-history endpoint (real history when wired)
 *   2. import.meta.env.VITE_BMB_USE_SYNTHETIC_HISTORY === 'true'
 *      → synthetic data from the deterministic generator below. Use ONLY
 *      for demos/dev — produces plausible but fictitious cost figures
 *      that the variance detector will treat as real.
 *   3. otherwise: empty array. The variance detector then produces no
 *      false warnings — better than fake warnings.
 *
 * The synthetic mode is gated behind an explicit env flag so production
 * never accidentally ships fake "this item is 10% over historical avg"
 * banners against fabricated history.
 * ----------------------------------------------------------------------------
 */

export interface ItemCostHistoryEntry {
  /** PropertyItem.itemId */
  itemId: string;
  /** Per-guest cost contribution observed in a past event */
  perGuestCost: number;
  /** Event date */
  eventAt: Date;
  /** Source event id (for drill-down) */
  eventId: string;
}

export interface RecentSimilarQuery {
  propertyId: string;
  eventType: string;
  guestCount: number;
  /** Tolerance band on guestCount, default ±25% */
  guestCountTolerance?: number;
  /** Max number of events to return */
  limit?: number;
}

const HISTORY_ENDPOINT = '/api/banquet-menus/event-history';

function syntheticEnabled(): boolean {
  if (typeof import.meta !== 'undefined') {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && env.VITE_BMB_USE_SYNTHETIC_HISTORY === 'true') return true;
  }
  return false;
}

function reviveEntry(raw: unknown): ItemCostHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const itemId = typeof r.itemId === 'string' ? r.itemId : null;
  const perGuestCost = typeof r.perGuestCost === 'number' ? r.perGuestCost : null;
  const eventId = typeof r.eventId === 'string' ? r.eventId : null;
  if (!itemId || perGuestCost == null || !eventId) return null;
  const eventAt = r.eventAt instanceof Date ? r.eventAt : new Date(String(r.eventAt));
  if (Number.isNaN(eventAt.getTime())) return null;
  return { itemId, perGuestCost, eventId, eventAt };
}

/**
 * Returns recent cost-per-item observations for events similar to the
 * current composition. Falls back to synthetic-or-empty when the real
 * endpoint is unavailable (per resolution order above).
 */
export async function recentSimilarEventItems(
  query: RecentSimilarQuery,
): Promise<ItemCostHistoryEntry[]> {
  const limit = query.limit ?? 10;

  try {
    const params = new URLSearchParams({
      propertyId: query.propertyId,
      eventType: query.eventType,
      guestCount: String(query.guestCount),
      limit: String(limit),
    });
    if (query.guestCountTolerance != null) {
      params.set('guestCountTolerance', String(query.guestCountTolerance));
    }
    const res = await fetch(`${HISTORY_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (res.ok) {
      const body = (await res.json()) as { entries?: unknown[] };
      const entries = Array.isArray(body.entries)
        ? body.entries.map(reviveEntry).filter((e): e is ItemCostHistoryEntry => e !== null)
        : [];
      // 200 with empty entries means: real source available, no comparable
      // events yet. Honor that — do not fall back to synthetic.
      return entries;
    }
    // 404 / 501 / 5xx: endpoint is not wired. Continue to fallbacks.
  } catch {
    // Network error — fall through to local fallback below.
  }

  if (syntheticEnabled()) {
    return synthesizeHistory(query, limit);
  }
  return [];
}

// ----------------------------------------------------------------------------
// Synthetic data — deterministic given the same query (so the demo is stable)
// Only returned when VITE_BMB_USE_SYNTHETIC_HISTORY=true is set.
// ----------------------------------------------------------------------------

function synthesizeHistory(
  query: RecentSimilarQuery,
  limit: number,
): ItemCostHistoryEntry[] {
  const seed = hash(`${query.propertyId}|${query.eventType}|${query.guestCount}`);
  const entries: ItemCostHistoryEntry[] = [];
  const sampleItems = [
    { id: 'demo-history-item-prosciutto-board', baseCost: 22 },
    { id: 'demo-history-item-grilled-branzino', baseCost: 28 },
    { id: 'demo-history-item-cauliflower-steak', baseCost: 9 },
    { id: 'demo-history-item-cheese-course', baseCost: 14 },
    { id: 'demo-history-item-olive-oil-cake', baseCost: 6 },
  ];
  const eventCount = Math.min(limit, 8);
  for (let e = 0; e < eventCount; e++) {
    const eventDate = new Date(Date.now() - (e + 1) * 14 * 24 * 60 * 60 * 1000);
    const eventId = `synthetic-event-${seed}-${e}`;
    for (const item of sampleItems) {
      const noise = pseudoRandom(seed + e * 7 + hash(item.id)) * 0.2 - 0.1; // ±10%
      const perGuestCost = item.baseCost * (1 + noise);
      entries.push({
        itemId: item.id,
        perGuestCost: round2(perGuestCost),
        eventAt: eventDate,
        eventId,
      });
    }
  }
  return entries;
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
