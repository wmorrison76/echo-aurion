/**
 * D16h · Chronos Monte Carlo forecasting + self-audit loop.
 *
 * Lives alongside the existing `forecasting.ts` (Prophet-based revenue
 * forecasts) — this file is the per-outlet, per-item demand band
 * engine that powers the chef's "what will sell tomorrow" view.
 *
 * Design principle (the owner's words):
 *   "EchoAi treats yesterday's accuracy as tomorrow's floor — if I
 *   forecast 23.5% food cost and it lands at 23.6%, Echo audits
 *   itself to see how it could have done better. If chicken parm
 *   forecasted 26 but sold 27, Echo searches the Monte Carlo runs
 *   to find the scenario that predicted 27, compares the other
 *   items in that scenario, and recalibrates its signal weights.
 *   Doesn't rely on past success — constantly trying to be more
 *   accurate each day."
 */

/**
 * Multipliers fed into the Monte Carlo engine. Each is normalized
 * around 1.0 — caller computes from raw counts before passing.
 */
export interface MCForecastSignals {
  /** tomorrow's covers / 4-week DOW average */
  reservation_pace?: number;
  /** BEO-allocated guests for this outlet tomorrow / DOW avg */
  beo_guests_factor?: number;
  /** weather adjustment (rain hurts patio, sun helps gelato) */
  weather_factor?: number;
  /** holiday / event multiplier (Mother's Day = 2.0) */
  calendar_factor?: number;
  /** trailing 7d / trailing 28d sales velocity */
  sales_velocity?: number;
}

/**
 * Per-item signal weights — start at 1.0 and get nudged by the audit
 * toward the factor mix that produced the closest scenario.  Stored
 * per (outlet_id, item_id) so chicken parm at the steakhouse and
 * chicken parm at the cafe learn independently.
 */
export interface MCSignalWeights {
  outlet_id: string;
  item_id: string;
  reservation: number;        // exponent on reservation_pace
  beo: number;
  weather: number;
  calendar: number;
  velocity: number;
  /** How many audit cycles have updated these weights. */
  audit_count: number;
  updated_at: string;
}

export interface MCForecastItemInput {
  item_id: string;
  item_name: string;
  /** Trailing-DOW average qty sold at this outlet for this item. */
  base_demand_dow_avg: number;
  weights?: Partial<MCSignalWeights>;
}

/**
 * One row in the Monte Carlo output. Stores p10/p50/p90 plus a
 * scenario histogram so the self-audit can find the closest match
 * without re-running the simulation.
 */
export interface MCDailyForecast {
  id: string;
  outlet_id: string;
  date: string;                  // ISO date for the forecast TARGET
  item_id: string;
  item_name: string;
  base_demand: number;
  signals: MCForecastSignals;
  effective_factor: number;       // weighted product of signals
  expected_demand: number;        // base × factor (pre-noise)
  p10: number;
  p50: number;
  p90: number;
  /** Histogram: { "26": 312, "27": 240, … } sums to scenarios_run. */
  scenario_histogram: Record<string, number>;
  scenarios_run: number;
  generated_at: string;
}

/**
 * Accuracy telemetry, written by the audit endpoint. Drives the
 * "I'm getting better" tile and feeds the weight nudge.
 */
export interface MCForecastAccuracy {
  id: string;
  outlet_id: string;
  date: string;
  item_id: string;
  item_name: string;
  forecast_p50: number;
  actual: number;
  error: number;                 // abs(forecast - actual)
  error_pct: number;             // error / max(actual, 1)
  closest_scenario_qty: number;
  audited_at: string;
}

/**
 * Rolling accuracy roll-up the chef-facing tile renders:
 * "Last 14 days I forecast within 6.2% on average."
 */
export interface MCAccuracyRollup {
  outlet_id: string;
  window_days: number;
  rows_audited: number;
  mean_error_pct: number;
  worst_error_pct: number;
  best_error_pct: number;
  trend: "improving" | "flat" | "drifting";
}
