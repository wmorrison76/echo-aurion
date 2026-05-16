/**
 * costVarianceService.ts
 * ----------------------------------------------------------------------------
 * Detects cost variances on the current composition vs the property's
 * recent comparable events. Per INSTALL/files-3/08_AI_ENHANCEMENT_SPEC.md.
 *
 * Algorithm (v1, rules-based):
 *   1. Pull recent comparable events from eventCostHistoryService
 *   2. Aggregate per-item mean + stddev cost-per-guest
 *   3. For each item in the current composition with ≥3 prior occurrences,
 *      compute z = (current - mean) / max(stddev, 0.01)
 *   4. Flag items with |z| > 1.5 (warning), |z| > 3 (critical)
 *   5. Rank by financial impact (|delta| × guestCount), return top findings
 *
 * Items with no prior history are silently skipped (insufficient data).
 * ----------------------------------------------------------------------------
 */

import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import {
  recentSimilarEventItems,
  type ItemCostHistoryEntry,
} from './eventCostHistoryService';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface CostVarianceFinding {
  id: string;
  itemId: string;
  itemName: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  /** |delta| × guestCount; used for ranking and "predicted overage" surfacing */
  financialImpact: number;
  suggestedActions: string[];
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

const MIN_HISTORICAL_OCCURRENCES = 3;
const Z_WARNING_THRESHOLD = 1.5;
const Z_CRITICAL_THRESHOLD = 3.0;

export async function detectCostVariance(
  composition: CompositionSnapshot,
): Promise<CostVarianceFinding[]> {
  if (composition.itemCount === 0 || composition.guestCount === 0) {
    return [];
  }

  const recent = await recentSimilarEventItems({
    propertyId: composition.propertyId,
    eventType: composition.eventType,
    guestCount: composition.guestCount,
    limit: 10,
  });

  const itemHistory = aggregateByItem(recent);
  const findings: CostVarianceFinding[] = [];

  for (const section of composition.sections) {
    for (const item of section.items) {
      const hist = itemHistory[item.id];
      if (!hist || hist.count < MIN_HISTORICAL_OCCURRENCES) continue;

      // Per-guest cost from current pricing math is not on the snapshot at
      // item granularity. Approximate via composition.perGuestCost / itemCount
      // weighted by snapshot's stored cost basis. Conservative fallback:
      // skip the item if costBasis is missing.
      const currentCost = item.costBasis?.amount;
      if (currentCost === undefined) continue;

      const z = (currentCost - hist.mean) / Math.max(hist.stddev, 0.01);
      if (Math.abs(z) <= Z_WARNING_THRESHOLD) continue;

      const severity: CostVarianceFinding['severity'] =
        Math.abs(z) >= Z_CRITICAL_THRESHOLD ? 'critical' : 'warning';
      const direction = z > 0 ? 'above' : 'below';
      const delta = Math.abs(currentCost - hist.mean);
      const financialImpact = round2(delta * composition.guestCount);

      findings.push({
        id: `cost-variance-${item.id}`,
        itemId: item.id,
        itemName: item.name,
        severity,
        title: `${item.name} ${direction} historical pattern`,
        body: buildExplanation(item.name, hist, z, currentCost),
        financialImpact,
        suggestedActions: buildSuggestedActions(z, item.name),
      });
    }
  }

  return findings.sort((a, b) => b.financialImpact - a.financialImpact);
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

interface ItemStats {
  mean: number;
  stddev: number;
  count: number;
}

function aggregateByItem(
  history: ItemCostHistoryEntry[],
): Record<string, ItemStats> {
  const groups: Record<string, number[]> = {};
  for (const entry of history) {
    if (!groups[entry.itemId]) groups[entry.itemId] = [];
    groups[entry.itemId].push(entry.perGuestCost);
  }

  const stats: Record<string, ItemStats> = {};
  for (const [itemId, vals] of Object.entries(groups)) {
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance =
      vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, n - 1);
    stats[itemId] = {
      mean: round2(mean),
      stddev: round2(Math.sqrt(variance)),
      count: n,
    };
  }
  return stats;
}

function buildExplanation(
  itemName: string,
  hist: ItemStats,
  z: number,
  currentCost: number,
): string {
  const direction = z > 0 ? 'above' : 'below';
  return (
    `Per-guest cost is $${currentCost.toFixed(2)}, ` +
    `${Math.abs(z).toFixed(1)}σ ${direction} the property's recent average ` +
    `($${hist.mean.toFixed(2)} across ${hist.count} prior events). ` +
    `Consider verifying the latest vendor invoice and yield assumptions ` +
    `before publishing the menu.`
  );
}

function buildSuggestedActions(z: number, itemName: string): string[] {
  if (z > 0) {
    return [
      `Pull the latest vendor invoice for ${itemName}`,
      'Recalculate yield-aware cost (trim factor may have shifted)',
      'Compare to network 75th percentile if available',
    ];
  }
  return [
    `Confirm pricing for ${itemName} is current (cost may be stale)`,
    'Verify the costBasis was updated in the last quarter',
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
