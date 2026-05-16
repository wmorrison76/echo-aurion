/**
 * dietaryEngine.ts
 * ----------------------------------------------------------------------------
 * Aggregates dietary tags across a composed menu and detects coverage gaps.
 *
 * Two distinct concepts handled here:
 *
 *   1. COVERAGE  — "Does the menu HAVE a vegan option?" (boolean per tag)
 *   2. DENSITY   — "What FRACTION of items are vegan?" (number per tag)
 *
 * Both matter. A wedding menu with one vegan entrée has vegan COVERAGE but
 * low vegan DENSITY. A buffet that's 50% vegan has high density. Echo's
 * critique mode uses both signals.
 *
 * Gap detection is intentionally event-type aware. A 200-guest wedding
 * SHOULD have allergen coverage. A staff lunch can skip it.
 * ----------------------------------------------------------------------------
 */

import type { DietaryTag } from '../BanquetMenuBuilder.types';
import type { ComposedItem } from '../hooks/useCompositionStore';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface DietaryDistribution {
  /** Tag → count of items carrying that tag */
  counts: Record<DietaryTag, number>;
  /** Tag → fraction of total items carrying that tag */
  density: Record<DietaryTag, number>;
  /** Tag → boolean (at least one item present) */
  coverage: Record<DietaryTag, boolean>;
  /** Total items considered */
  totalItems: number;
}

export interface DietaryGap {
  /** Severity */
  severity: 'info' | 'warning' | 'critical';
  /** Tag this gap concerns */
  tag: DietaryTag;
  /** Human-readable label */
  message: string;
  /** Affected sections (if applicable) */
  sectionKinds?: string[];
}

export interface DietaryAnalysis {
  distribution: DietaryDistribution;
  gaps: DietaryGap[];
  /** Items that satisfy each tag — for "show me the vegan items" lookups */
  itemsByTag: Record<DietaryTag, string[]>;
}

// ----------------------------------------------------------------------------
// All recognized dietary tags
// ----------------------------------------------------------------------------

// Aligned with Pkg 1's canonical DietaryTag vocabulary (constants.ts).
// Pkg 1 tracks short-form positive (VE/VG) and "contains allergen" tags
// (D/G/N/S). Coverage of *-free diets (gluten-free, dairy-free, nut-free,
// shellfish-free) is computed inversely — a menu has gluten-free coverage
// when at least one item does NOT carry the G tag. See detectDietaryGaps.
const ALL_TAGS: DietaryTag[] = ['D', 'G', 'N', 'S', 'VE', 'VG'];

// ----------------------------------------------------------------------------
// Distribution
// ----------------------------------------------------------------------------

export function computeDietaryDistribution(
  composedItems: ComposedItem[],
): DietaryDistribution {
  const counts = emptyTagRecord(0);
  const totalItems = composedItems.length;

  for (const composed of composedItems) {
    const tags = composed.itemSnapshot.dietaryTags ?? [];
    const isVegan = tags.includes('VE');
    for (const tag of tags) {
      if (tag in counts) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    // Vegan implies vegetarian — bump VG count so coverage rules treat
    // a vegan item as also satisfying vegetarian inclusivity.
    if (isVegan && !tags.includes('VG')) {
      counts.VG = (counts.VG ?? 0) + 1;
    }
  }

  const density = emptyTagRecord(0);
  const coverage = emptyTagRecord(false);
  for (const tag of ALL_TAGS) {
    density[tag] = totalItems > 0 ? counts[tag] / totalItems : 0;
    coverage[tag] = counts[tag] > 0;
  }

  return { counts, density, coverage, totalItems };
}

// ----------------------------------------------------------------------------
// Items by tag
// ----------------------------------------------------------------------------

export function computeItemsByTag(
  composedItems: ComposedItem[],
): Record<DietaryTag, string[]> {
  const byTag: Record<DietaryTag, string[]> = emptyTagRecord([]) as Record<
    DietaryTag,
    string[]
  >;
  // Re-init arrays — emptyTagRecord shares the [] reference
  for (const tag of ALL_TAGS) byTag[tag] = [];

  for (const composed of composedItems) {
    const tags = composed.itemSnapshot.dietaryTags ?? [];
    for (const tag of tags) {
      if (tag in byTag) byTag[tag].push(composed.instanceId);
    }
  }
  return byTag;
}

// ----------------------------------------------------------------------------
// Gap detection
// ----------------------------------------------------------------------------

/**
 * Event-type-specific gap rules. Conservative defaults — we'd rather
 * flag a possible gap than miss one. Echo can downgrade severity later.
 */
interface GapRule {
  tag: DietaryTag;
  severity: DietaryGap['severity'];
  appliesToEvents: string[] | 'all';
  /** Minimum items in menu before this rule kicks in (avoid early noise) */
  minMenuSize: number;
  message: (totalItems: number) => string;
}

// Positive-tag rules: triggered when the tag is absent from the menu.
const GAP_RULES: GapRule[] = [
  {
    tag: 'VE',
    severity: 'warning',
    appliesToEvents: 'all',
    minMenuSize: 4,
    message: () => 'Menu has no vegan option — most events expect at least one.',
  },
  {
    tag: 'VG',
    severity: 'info',
    appliesToEvents: 'all',
    minMenuSize: 3,
    message: () => 'No vegetarian items — consider at least one for inclusivity.',
  },
];

// Allergen-free rules: a menu has X-free "coverage" when at least one item
// does NOT carry the X allergen tag. Triggered when ALL items carry the
// allergen (no escape hatch for guests with that restriction).
interface AllergenFreeRule {
  allergenTag: DietaryTag;
  severity: DietaryGap['severity'];
  appliesToEvents: string[] | 'all';
  minMenuSize: number;
  message: () => string;
}

const ALLERGEN_FREE_RULES: AllergenFreeRule[] = [
  {
    allergenTag: 'G',
    severity: 'warning',
    appliesToEvents: 'all',
    minMenuSize: 4,
    message: () =>
      'Every item contains gluten. Many guests need a GF option — add at least one.',
  },
  {
    allergenTag: 'D',
    severity: 'info',
    appliesToEvents: [
      'wedding',
      'corporate_gala',
      'large_buffet',
      'corporate_event',
      'wedding-reception',
    ],
    minMenuSize: 6,
    message: () =>
      'Every item contains dairy — events of this size typically need a dairy-free option.',
  },
  {
    allergenTag: 'N',
    severity: 'critical',
    appliesToEvents: 'all',
    minMenuSize: 1,
    message: () =>
      'Every item contains nuts. Add at least one nut-free option (severe allergy risk).',
  },
];

export function detectDietaryGaps(
  distribution: DietaryDistribution,
  eventType: string,
): DietaryGap[] {
  const gaps: DietaryGap[] = [];

  // Positive-tag rules
  for (const rule of GAP_RULES) {
    if (distribution.totalItems < rule.minMenuSize) continue;
    const applies =
      rule.appliesToEvents === 'all' || rule.appliesToEvents.includes(eventType);
    if (!applies) continue;

    if (!distribution.coverage[rule.tag]) {
      gaps.push({
        severity: rule.severity,
        tag: rule.tag,
        message: rule.message(distribution.totalItems),
      });
    }
  }

  // Allergen-free rules (inverse: gap when ALL items carry the allergen)
  for (const rule of ALLERGEN_FREE_RULES) {
    if (distribution.totalItems < rule.minMenuSize) continue;
    const applies =
      rule.appliesToEvents === 'all' || rule.appliesToEvents.includes(eventType);
    if (!applies) continue;

    const everyItemCarriesAllergen =
      distribution.totalItems > 0 &&
      distribution.counts[rule.allergenTag] >= distribution.totalItems;
    if (everyItemCarriesAllergen) {
      gaps.push({
        severity: rule.severity,
        tag: rule.allergenTag,
        message: rule.message(),
      });
    }
  }

  return gaps;
}

// ----------------------------------------------------------------------------
// Top-level entry point
// ----------------------------------------------------------------------------

export function analyzeDietary(
  composedItems: ComposedItem[],
  eventType: string,
): DietaryAnalysis {
  const distribution = computeDietaryDistribution(composedItems);
  const gaps = detectDietaryGaps(distribution, eventType);
  const itemsByTag = computeItemsByTag(composedItems);
  return { distribution, gaps, itemsByTag };
}

// ----------------------------------------------------------------------------
// Display helpers
// ----------------------------------------------------------------------------

export const TAG_LABELS: Record<DietaryTag, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  gluten_free: 'Gluten-Free',
  dairy_free: 'Dairy-Free',
  nut_free: 'Nut-Free',
  shellfish_free: 'Shellfish-Free',
  kosher: 'Kosher',
  halal: 'Halal',
  pescatarian: 'Pescatarian',
  low_carb: 'Low-Carb',
  sugar_free: 'Sugar-Free',
};

export const TAG_SHORT_LABELS: Record<DietaryTag, string> = {
  vegan: 'V',
  vegetarian: 'VG',
  gluten_free: 'GF',
  dairy_free: 'DF',
  nut_free: 'NF',
  shellfish_free: 'SF',
  kosher: 'K',
  halal: 'H',
  pescatarian: 'P',
  low_carb: 'LC',
  sugar_free: 'SUG',
};

// ----------------------------------------------------------------------------
// Internal
// ----------------------------------------------------------------------------

function emptyTagRecord<T>(value: T): Record<DietaryTag, T> {
  return ALL_TAGS.reduce((acc, tag) => {
    acc[tag] = value;
    return acc;
  }, {} as Record<DietaryTag, T>);
}
