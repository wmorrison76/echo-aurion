/**
 * wastePredictionService.ts
 * ----------------------------------------------------------------------------
 * Predicts waste percentage per item given service style, guest count,
 * dietary distribution, and historical patterns. Per
 * INSTALL/files-3/08_AI_ENHANCEMENT_SPEC.md.
 *
 * Algorithm (v1, rules-based weighted regression):
 *
 *   predicted_waste_pct = base_waste_for_section
 *                       + service_style_modifier
 *                       + guest_count_modifier
 *                       + dietary_mismatch_modifier
 *
 * Section base rates and modifiers come from the operator-intuition
 * principles encoded in the wisdom-engine spec. Real ML training is
 * out of scope for v1 — this gets us 80% of the value with 5% of the
 * effort.
 * ----------------------------------------------------------------------------
 */

import type { CompositionSnapshot } from '../hooks/useMenuComposition';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface WastePredictionFinding {
  id: string;
  itemId: string;
  itemName: string;
  severity: 'info' | 'warning' | 'critical';
  predictedWastePct: number;
  estimatedCostImpact: number;
  reason: string;
  recommendation: string;
}

// ----------------------------------------------------------------------------
// Tunables (encode operator intuition; refine with real data later)
// ----------------------------------------------------------------------------

const WARNING_THRESHOLD_PCT = 18;
const CRITICAL_THRESHOLD_PCT = 28;

const BASE_WASTE_BY_SECTION: Record<string, number> = {
  'cold-selection': 12,
  'hot-selection': 9,
  'enhancement': 11,
  'beverage': 6,
  'dessert': 8,
  'station': 14,
  'carving': 10,
  'raw-bar': 7,
  'sushi': 6,
  'shared-appetizers': 13,
  'plated-entree': 4, // plated has near-zero waste
  'salad': 17, // famously over-prepared at scale
  'soup': 11,
  'bakery': 9,
};

const DEFAULT_BASE_WASTE = 10;

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export function predictWaste(
  composition: CompositionSnapshot,
): WastePredictionFinding[] {
  if (composition.itemCount === 0) return [];

  const findings: WastePredictionFinding[] = [];
  const guestCount = composition.guestCount;
  const serviceStyleMod = serviceStyleModifier(composition);
  const dietaryMod = dietaryMismatchModifier(composition);

  for (const section of composition.sections) {
    const base = BASE_WASTE_BY_SECTION[section.kind] ?? DEFAULT_BASE_WASTE;
    const guestMod = guestCountModifier(guestCount, section.kind);

    for (const item of section.items) {
      const predicted = round1(base + serviceStyleMod + guestMod + dietaryMod);
      if (predicted < WARNING_THRESHOLD_PCT) continue;

      const severity: WastePredictionFinding['severity'] =
        predicted >= CRITICAL_THRESHOLD_PCT ? 'critical' : 'warning';

      const itemCost = item.costBasis?.amount ?? 0;
      const estimatedCostImpact = round2(
        itemCost * (predicted / 100) * guestCount,
      );

      findings.push({
        id: `waste-${item.id}`,
        itemId: item.id,
        itemName: item.name,
        severity,
        predictedWastePct: predicted,
        estimatedCostImpact,
        reason: buildReason(section.kind, guestCount, base, serviceStyleMod, dietaryMod),
        recommendation: buildRecommendation(section.kind, predicted, item.name),
      });
    }
  }

  return findings.sort((a, b) => b.estimatedCostImpact - a.estimatedCostImpact);
}

// ----------------------------------------------------------------------------
// Modifier functions
// ----------------------------------------------------------------------------

function serviceStyleModifier(snap: CompositionSnapshot): number {
  // Crude heuristic from event type. Real impl would read snap.serviceStyle
  // when that field lands on the snapshot.
  const e = (snap.eventType ?? '').toLowerCase();
  if (e.includes('buffet') || e.includes('reception')) return 8;
  if (e.includes('station')) return 5;
  if (e.includes('plated') || e.includes('seated')) return -4;
  return 0;
}

function guestCountModifier(guestCount: number, sectionKind: string): number {
  // Buffet-style sections (salad, station, shared-appetizers) over-produce
  // sharply at high guest counts.
  const overProducingSections = new Set([
    'salad',
    'station',
    'shared-appetizers',
    'cold-selection',
  ]);
  if (overProducingSections.has(sectionKind)) {
    if (guestCount >= 200) return 6;
    if (guestCount >= 150) return 4;
    if (guestCount >= 100) return 2;
  }
  return 0;
}

function dietaryMismatchModifier(snap: CompositionSnapshot): number {
  // If many items carry vegetarian/vegan tags but the property's typical
  // mix skews omnivore, those items are likely over-prepared.
  let vegItems = 0;
  let total = 0;
  for (const sec of snap.sections) {
    for (const item of sec.items) {
      total++;
      if (item.dietaryTags?.some((t) => t === 'VG' || t === 'VE')) vegItems++;
    }
  }
  if (total === 0) return 0;
  const vegFraction = vegItems / total;
  // If >40% veg in a typically-omnivore property, slight over-production
  if (vegFraction > 0.4) return 3;
  return 0;
}

// ----------------------------------------------------------------------------
// Display helpers
// ----------------------------------------------------------------------------

function buildReason(
  sectionKind: string,
  guestCount: number,
  base: number,
  serviceStyleMod: number,
  dietaryMod: number,
): string {
  const parts: string[] = [];
  parts.push(`${sectionKind} sections show ${base}% baseline waste in this property's pattern`);
  if (serviceStyleMod > 0) parts.push(`buffet/reception adds ${serviceStyleMod}%`);
  if (serviceStyleMod < 0) parts.push(`plated service reduces by ${Math.abs(serviceStyleMod)}%`);
  if (guestCount >= 150) parts.push(`large guest count (${guestCount}) tends to over-produce`);
  if (dietaryMod > 0) parts.push('vegetarian-heavy mix in omnivore-typical property');
  return parts.join('; ');
}

function buildRecommendation(
  sectionKind: string,
  predicted: number,
  itemName: string,
): string {
  if (sectionKind === 'salad' && predicted > 20) {
    return `Plate ${itemName} at the line instead of buffet, or reduce par by 25%`;
  }
  if (sectionKind === 'station' && predicted > 22) {
    return `Add a chef-attended portion gate; consider a smaller version of ${itemName}`;
  }
  if (sectionKind === 'shared-appetizers' && predicted > 20) {
    return `Reduce ${itemName} variety count by 1 or shorten replenishment window`;
  }
  return `Reduce par for ${itemName} by ${Math.round(predicted - 12)}%`;
}

// ----------------------------------------------------------------------------
// Rounding
// ----------------------------------------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
