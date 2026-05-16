/**
 * operationalEngine.ts
 * ----------------------------------------------------------------------------
 * Aggregates operational signals across a composed menu so the chef can see
 * KITCHEN LOAD, not just price. This is what separates a real banquet
 * planning tool from a fancy line-item editor.
 *
 * Three signals tracked:
 *
 *   1. STATION LOAD     — how many items hit each station (sauté, grill,
 *                         garde manger, pastry, fry, raw bar, etc.)
 *   2. PREP COMPLEXITY  — aggregate prep-hours estimate based on item
 *                         complexity scores
 *   3. EQUIPMENT NEEDS  — equipment categories required (induction
 *                         burners, chafers, carving stations, etc.)
 *
 * "Operational Collision Detection" reference:
 *   This engine integrates with the Operational Collision Detection
 *   algorithm from the LUCCCA AI core. We don't run collision detection
 *   here (that's a higher-order module concern), but we surface the
 *   signals the OCD algorithm consumes — station load by time window,
 *   equipment overlap, etc.
 * ----------------------------------------------------------------------------
 */

import type { KitchenStation, EquipmentCategory } from '../BanquetMenuBuilder.types';
import type { ComposedItem } from '../hooks/useCompositionStore';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface StationLoad {
  station: KitchenStation;
  itemCount: number;
  /** Sum of complexity scores for items hitting this station (0..) */
  totalComplexity: number;
  /** Items contributing to this station's load (instanceIds) */
  contributingInstanceIds: string[];
}

export interface EquipmentRequirement {
  category: EquipmentCategory;
  /** Number of items requiring this equipment */
  itemCount: number;
  /** Suggested unit count based on item count + guest count */
  suggestedUnits: number;
}

export interface OperationalAnalysis {
  /** Sum of all item complexity scores — rough proxy for total prep effort */
  totalComplexity: number;
  /** Estimated prep hours (totalComplexity * STANDARD_HOUR_FACTOR) */
  estimatedPrepHours: number;
  /** Per-station breakdown sorted by load descending */
  stationLoads: StationLoad[];
  /** Equipment required, sorted by category */
  equipmentRequirements: EquipmentRequirement[];
  /** Heat level: 'light' | 'moderate' | 'heavy' | 'extreme' */
  loadLevel: 'light' | 'moderate' | 'heavy' | 'extreme';
  /** Items flagged as high-complexity (>= COMPLEXITY_HIGH_THRESHOLD) */
  highComplexityItems: string[];
  /** Stations that look overloaded relative to peers */
  bottleneckStations: KitchenStation[];
}

// ----------------------------------------------------------------------------
// Tunable thresholds
// ----------------------------------------------------------------------------

/**
 * Translates "complexity score" into rough prep hours.
 * A complexity of 1.0 ≈ 1 hour of skilled prep at production scale.
 * This is a heuristic — chefs can override per-item.
 */
const STANDARD_HOUR_FACTOR = 0.85;

const COMPLEXITY_HIGH_THRESHOLD = 3.5;

const LOAD_LEVEL_THRESHOLDS = {
  light: 8, // <= 8 total complexity points
  moderate: 18, // <= 18
  heavy: 32, // <= 32
  // > 32 → extreme
};

/**
 * A station is a bottleneck when its load exceeds 1.5x the average load
 * of stations with at least one item.
 */
const BOTTLENECK_MULTIPLIER = 1.5;

// ----------------------------------------------------------------------------
// Equipment-suggested-units curve
// ----------------------------------------------------------------------------

/**
 * Heuristic: how many units of a given equipment category should be
 * suggested per ~50 guests, given how many items rely on it.
 *
 * These numbers come from operator experience, not a textbook. They're
 * starting points the user can adjust.
 */
const EQUIPMENT_PER_50_GUESTS: Record<EquipmentCategory, number> = {
  induction_burner: 1.5,
  chafer: 1,
  carving_station: 0.5,
  raw_bar: 0.4,
  fryer: 0.3,
  hot_box: 0.7,
  cold_well: 0.6,
  espresso_machine: 0.2,
  pizza_oven: 0.3,
  griddle: 0.5,
  smoker: 0.2,
  beverage_dispenser: 0.8,
  ice_well: 0.5,
  display_case: 0.4,
  other: 0.5,
};

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export function analyzeOperational(
  composedItems: ComposedItem[],
  guestCount: number,
): OperationalAnalysis {
  if (composedItems.length === 0) {
    return emptyAnalysis();
  }

  // ---- Aggregate ----
  const stationMap = new Map<KitchenStation, StationLoad>();
  const equipmentMap = new Map<EquipmentCategory, EquipmentRequirement>();
  let totalComplexity = 0;
  const highComplexityItems: string[] = [];

  for (const composed of composedItems) {
    const item = composed.itemSnapshot;
    const ops = item.operationalLoad;
    if (!ops) continue;

    // Complexity
    const complexity = ops.complexityScore ?? 0;
    totalComplexity += complexity;
    if (complexity >= COMPLEXITY_HIGH_THRESHOLD) {
      highComplexityItems.push(composed.instanceId);
    }

    // Stations
    for (const station of ops.stations ?? []) {
      const existing = stationMap.get(station);
      if (existing) {
        existing.itemCount += 1;
        existing.totalComplexity += complexity;
        existing.contributingInstanceIds.push(composed.instanceId);
      } else {
        stationMap.set(station, {
          station,
          itemCount: 1,
          totalComplexity: complexity,
          contributingInstanceIds: [composed.instanceId],
        });
      }
    }

    // Equipment
    for (const equipment of ops.equipment ?? []) {
      const existing = equipmentMap.get(equipment);
      if (existing) {
        existing.itemCount += 1;
      } else {
        equipmentMap.set(equipment, {
          category: equipment,
          itemCount: 1,
          suggestedUnits: 0, // computed below
        });
      }
    }
  }

  // ---- Compute equipment suggestions ----
  const guestFactor = guestCount > 0 ? guestCount / 50 : 1;
  for (const req of equipmentMap.values()) {
    const baseRate = EQUIPMENT_PER_50_GUESTS[req.category] ?? 0.5;
    // Suggested units scales with both item count and guest count
    const fromItems = Math.ceil(req.itemCount * 0.5);
    const fromGuests = Math.ceil(baseRate * guestFactor);
    req.suggestedUnits = Math.max(1, fromItems, fromGuests);
  }

  // ---- Sort outputs ----
  const stationLoads = Array.from(stationMap.values()).sort(
    (a, b) => b.totalComplexity - a.totalComplexity,
  );
  const equipmentRequirements = Array.from(equipmentMap.values()).sort((a, b) =>
    a.category.localeCompare(b.category),
  );

  // ---- Bottleneck detection ----
  const activeStations = stationLoads.filter((s) => s.totalComplexity > 0);
  const avgLoad =
    activeStations.length > 0
      ? activeStations.reduce((sum, s) => sum + s.totalComplexity, 0) /
        activeStations.length
      : 0;
  const bottleneckStations = activeStations
    .filter((s) => s.totalComplexity > avgLoad * BOTTLENECK_MULTIPLIER)
    .map((s) => s.station);

  // ---- Load level classification ----
  const loadLevel = classifyLoadLevel(totalComplexity);

  return {
    totalComplexity: round1(totalComplexity),
    estimatedPrepHours: round1(totalComplexity * STANDARD_HOUR_FACTOR),
    stationLoads,
    equipmentRequirements,
    loadLevel,
    highComplexityItems,
    bottleneckStations,
  };
}

// ----------------------------------------------------------------------------
// Display helpers
// ----------------------------------------------------------------------------

export const STATION_LABELS: Record<KitchenStation, string> = {
  saute: 'Sauté',
  grill: 'Grill',
  garde_manger: 'Garde Manger',
  pastry: 'Pastry',
  fry: 'Fryer',
  raw_bar: 'Raw Bar',
  carving: 'Carving',
  oven: 'Oven',
  steam: 'Steam',
  cold_prep: 'Cold Prep',
  beverage: 'Beverage',
  expo: 'Expo',
};

export const EQUIPMENT_LABELS: Record<EquipmentCategory, string> = {
  induction_burner: 'Induction Burner',
  chafer: 'Chafer',
  carving_station: 'Carving Station',
  raw_bar: 'Raw Bar',
  fryer: 'Fryer',
  hot_box: 'Hot Box',
  cold_well: 'Cold Well',
  espresso_machine: 'Espresso Machine',
  pizza_oven: 'Pizza Oven',
  griddle: 'Griddle',
  smoker: 'Smoker',
  beverage_dispenser: 'Beverage Dispenser',
  ice_well: 'Ice Well',
  display_case: 'Display Case',
  other: 'Other',
};

export function loadLevelLabel(level: OperationalAnalysis['loadLevel']): string {
  switch (level) {
    case 'light':
      return 'Light Load';
    case 'moderate':
      return 'Moderate Load';
    case 'heavy':
      return 'Heavy Load';
    case 'extreme':
      return 'Extreme Load';
  }
}

export function loadLevelTone(
  level: OperationalAnalysis['loadLevel'],
): 'positive' | 'neutral' | 'caution' | 'critical' {
  switch (level) {
    case 'light':
      return 'positive';
    case 'moderate':
      return 'neutral';
    case 'heavy':
      return 'caution';
    case 'extreme':
      return 'critical';
  }
}

// ----------------------------------------------------------------------------
// Internal
// ----------------------------------------------------------------------------

function classifyLoadLevel(total: number): OperationalAnalysis['loadLevel'] {
  if (total <= LOAD_LEVEL_THRESHOLDS.light) return 'light';
  if (total <= LOAD_LEVEL_THRESHOLDS.moderate) return 'moderate';
  if (total <= LOAD_LEVEL_THRESHOLDS.heavy) return 'heavy';
  return 'extreme';
}

function emptyAnalysis(): OperationalAnalysis {
  return {
    totalComplexity: 0,
    estimatedPrepHours: 0,
    stationLoads: [],
    equipmentRequirements: [],
    loadLevel: 'light',
    highComplexityItems: [],
    bottleneckStations: [],
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
