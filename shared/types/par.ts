/**
 * Genesis H — Standing PAR + Lead-Time Production Intelligence
 * Type definitions for production planning, PARs, and forecasting.
 */

/**
 * Production location types
 * COMMISSARY_BQT: Banquets Production commissary
 * COMMISSARY_PASTRY: Pastry/Baking commissary
 * STOREROOM: Central ingredient storage
 */
export type ProductionLocationType =
  | "COMMISSARY_BQT"
  | "COMMISSARY_PASTRY"
  | "STOREROOM";

/**
 * Standing PAR Rule
 * Defines target inventory quantities, lead times, and production guidance per location & ingredient.
 */
export interface StandingParRule {
  /** Unique identifier for this PAR rule */
  parId: string;

  /** Reference to inventory location (e.g., "pastry_commissary", "bqt_commissary", "storeroom_main") */
  locationId: string;

  /** Canonical ingredient name (matches recipe rollups) */
  ingredientName: string;

  /** Unit of measure (ea, gal, lb, cs, oz, etc.) */
  unit: string;

  /** Base standing PAR quantity - normal target inventory level */
  baseParQty: number;

  /** How many days required to replenish this ingredient */
  leadTimeDays: number;

  /**
   * Optional: Per-day-of-week PAR multipliers
   * Example: Friday might need 2x normal PAR for weekend demand
   * Applied via: targetParForDay = baseParQty * (dayModifiers[day] ?? 1)
   */
  dayOfWeekModifiers?: Partial<
    Record<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun", number>
  >;

  /**
   * Allow Echo AI to recommend raising PAR early
   * If false, chef has locked this rule at current level
   */
  allowAutoIncrease: boolean;

  /**
   * Allow Echo AI to recommend lowering PAR
   * If false, chef maintains current PAR regardless of demand
   */
  allowAutoDecrease: boolean;

  /** Timestamp of last review/adjustment */
  lastReviewedAtISO?: string | null;

  /** Optional override log for audit trail */
  lastOverrideBy?: string | null;
  lastOverrideAtISO?: string | null;
  overrideReason?: string | null;
}

/**
 * PAR Projection
 * Output of the forecast engine: current state, projected demand, and recommended action.
 */
export interface ParProjection {
  /** Ingredient being projected */
  ingredientName: string;

  /** Unit of measure */
  unit: string;

  /** Location being projected */
  locationId: string;

  /** Current physical inventory on-hand */
  currentOnHand: number;

  /** Estimated usage over the lead-time horizon */
  projectedUsage: number;

  /** Projected ending inventory after demand is fulfilled */
  projectedEnding: number;

  /** Target PAR for this item */
  targetPar: number;

  /** Lead time in days for this ingredient */
  leadTimeDays: number;

  /**
   * Recommended action:
   * - OK: Inventory projected within acceptable range
   * - PRODUCE_EARLY: Will fall below PAR; recommend starting production now
   * - OVER_PAR_WARNING: Inventory significantly above PAR; risk of waste
   */
  action: "OK" | "PRODUCE_EARLY" | "OVER_PAR_WARNING";

  /** Human-readable explanation of the action and reasoning */
  explanation: string;
}

/**
 * Genesis H Configuration
 * Encapsulates all PAR rules and settings for a location
 */
export interface GenesisHConfig {
  version: number;

  /** All active PAR rules */
  rules: StandingParRule[];

  /** Last update timestamp */
  lastUpdatedAtISO: string;

  /** Optional metadata */
  notes?: string | null;
}
