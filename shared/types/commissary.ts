/**
 * D16a · Commissary catalog — shared contract.
 *
 * Two production lanes ship through this one catalog:
 *
 *   pastry    Finished products (cheesecake slice, croissant, plated
 *             dessert) coming out of the Pastry production house. The
 *             Pastry chef batches 3 months ahead for items with long
 *             preferment / cure times.
 *   banquet   Bases coming out of the banquet kitchen production line
 *             — chicken stock, veal stock, fish stock, demi-glace,
 *             dressings, cut fruit, soups. Less restaurant-specific;
 *             feeds the line stations across multiple outlets.
 *
 * The mechanic is identical for both lanes: a finished product is
 * defined once with a unit cost; outlets that may order it are
 * explicitly approved (Restaurant 1 sees only its approved desserts);
 * orders move at COST as an internal transfer that hits both
 * outlets' COGS books and feeds the producing kitchen's production
 * sheet.
 */

export type CommissaryLane = "pastry" | "banquet";

export type CommissaryUnit =
  | "each"        // a single cheesecake, one bottle of dressing
  | "g"  | "kg"
  | "ml" | "l"
  | "qt" | "gal"
  | "case"        // case of cut fruit, case of soup pints
  | "pan"         // sheet pan, half pan
  | "portion";

export interface CommissaryProduct {
  id: string;
  lane: CommissaryLane;
  name: string;
  /** Slug used in URLs and order line items. */
  slug: string;
  /** Optional link to a recipe in the recipe-builder so production
   *  generators can draw down components. */
  recipe_id?: string;
  unit: CommissaryUnit;
  /** Pack size (e.g. 12 for "12 portions per pan"). 1 if shipped as
   *  individual units. */
  pack_size: number;
  /** Internal transfer cost — what the receiving outlet's COGS books
   *  pick up. Property currency assumed. */
  unit_cost: number;
  /**
   * Lead time in HOURS between order placement and earliest fulfillment.
   * Pastry items can run into days/weeks for laminated or fermented
   * products; banquet stocks are typically 24–72h.
   *
   * D16b: this is now a DERIVED value when production_stages is set —
   * the sum of (active + passive) minutes across all stages, rounded
   * up to hours. The field is still stored explicitly so legacy
   * products without staged data keep working.
   */
  lead_time_hours: number;
  /**
   * Optional second-stage lead applicable to pastry items needing a
   * preferment or cure (e.g. sourdough levain refresh 24h before, or a
   * fruitcake that ages for 90 days). When set, the production
   * generator schedules a kickoff task at `lead_time_hours +
   * preferment_hours` ahead of the event.
   *
   * D16b: superseded by production_stages for new products. Kept for
   * backwards compatibility — products without staged data still
   * advertise their preferment via this field.
   */
  preferment_hours?: number;
  /** Hide from order pickers without deleting (preserves history). */
  active: boolean;
  /** Free text for the production sheet header. */
  description?: string;
  /**
   * Producing outlet — the kitchen that physically makes the item.
   * For pastry products this is typically the central pastry shop;
   * for banquet bases it's the banquet production kitchen.
   */
  producing_outlet_id: string;
  /**
   * D16b · Multi-stage production breakdown. Carissa described a
   * mousse cake as: bake biscuit base → make mousse → assemble +
   * freeze-set → finish/decorate. Each stage has active (hands-on
   * chef time) and passive (cool / rest / freeze / proof) minutes.
   * The AI stage inference endpoint populates this from a recipe
   * + yield; chefs can edit by hand. When present, total lead time
   * is computed from this array.
   */
  production_stages?: RecipeProductionStage[];
  created_at: string;
  updated_at: string;
}

/**
 * D16b · One step in a recipe's production timeline.
 *
 * The mousse cake example breaks down as four stages:
 *
 *   1. Bake biscuit base   active=30  passive=60   (cool)
 *   2. Prepare mousse       active=45  passive=0
 *   3. Assemble + freeze    active=15  passive=240  (freeze-set)
 *   4. Finish / decorate    active=30  passive=0
 *
 * Sequential by default; total lead time = sum of (active+passive).
 * `can_overlap_with_next=true` says the passive time of THIS stage
 * can run concurrently with the active time of the NEXT (e.g. while
 * the cake freezes you can be plating the decoration mise-en-place).
 * The production scheduler honors that flag when packing the day.
 */
export interface RecipeProductionStage {
  id?: string;
  recipe_id: string;
  /** 1-indexed; gaps allowed (e.g. 1, 2, 5) for partial edits. */
  sequence_order: number;
  /** Human label (e.g. "Bake biscuit base"). */
  name: string;
  /** Hands-on chef time in minutes — what we count for labor cost. */
  active_minutes: number;
  /** Wait time — cooling, proofing, fermenting, freezing, baking. */
  passive_minutes: number;
  /** Where the work happens ("hot line", "lamination bench", "blast
   *  chiller"). Used by the scheduler to avoid double-booking
   *  equipment. */
  station?: string;
  /** Equipment required ("blast chiller", "60-qt mixer", "deck
   *  oven"). Optional but useful for the scheduler + AI prompts. */
  equipment?: string[];
  /** Free text for the production sheet ("dock the dough; rest 30
   *  min before next fold"). */
  notes?: string;
  /** When true, the next stage's active time can begin during this
   *  stage's passive time. Defaults to false. */
  can_overlap_with_next?: boolean;
  /** Where the inference came from. AI-suggested stages are tagged
   *  so chefs know what was hand-tuned vs. machine-derived. */
  source?: "manual" | "ai_inferred" | "imported";
  created_at?: string;
  updated_at?: string;
}

/**
 * D16e · Calibrated PAR level for a (outlet, product) pair.
 *
 * Pars work like a thermostat: a `base_par` set by the chef during
 * onboarding is the steady-state minimum stocked. `current_par` is
 * the calibrated target that flexes with the day — bigger on event
 * days, smaller during slow weeks. The calibration engine reads
 * three signals:
 *
 *   reservation_pace   covers booked vs. average for this DOW
 *                      (1.30 = 30% busier than typical Tuesday)
 *   sales_velocity     trailing 14-day sales for this product at
 *                      this outlet, normalized
 *   calendar_factor    holiday / event multiplier from the calendar
 *                      (Mother's Day brunch = 2.0, Christmas eve
 *                      late-night = 1.4)
 *
 *   current_par = round(base_par × reservation_pace × sales_velocity
 *                       × calendar_factor)
 *
 * The same product at two outlets has two independent pars — Marina
 * Grill might keep 12 cheesecake slices on hand while the Cafe runs
 * 24. Pars are calibrated nightly OR on demand (e.g. when a wedding
 * gets booked the GM can trigger a re-calibration that pre-orders
 * for the event).
 */
export interface CommissaryParLevel {
  id: string;
  outlet_id: string;
  product_id: string;
  /** Steady-state minimum stocked. Set by the chef during onboarding;
   *  rarely changes. Acts as the floor — current_par is never
   *  scaled below this. */
  base_par: number;
  /** Live target the auto-order generator compares against on-hand.
   *  Recomputed by the calibrator. */
  current_par: number;
  /** When current_par was last recomputed. */
  calibrated_at: string;
  /** Inputs from the most recent calibration. Stored so an operator
   *  can audit "why did this go from 12 to 24 last night?" */
  calibration_factors?: {
    reservation_pace?: number;   // multiplier (1.0 = baseline)
    sales_velocity?: number;     // multiplier
    calendar_factor?: number;    // multiplier
    notes?: string;
  };
  /** Hide from the auto-order generator without deleting. */
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Snapshot of (outlet, product) state used by the auto-order
 * generator to decide whether to draft a replenishment order.
 *
 *   shortfall = max(0, current_par - on_hand - on_order)
 *
 * When shortfall > 0 we draft a CommissaryOrder for `shortfall`
 * units. The draft is held until the chef reviews and submits.
 */
export interface ParShortfallRow {
  outlet_id: string;
  product_id: string;
  product_name: string;
  base_par: number;
  current_par: number;
  on_hand: number;
  on_order: number;
  shortfall: number;
  unit: CommissaryUnit;
  unit_cost: number;
  /** Hours of lead time required (from product or its recipe stages)
   *  so the UI can flag "if you order now, soonest fulfillment is
   *  5pm tomorrow" against `needed_by`. */
  lead_time_hours: number;
}


/**
 * Roll-up returned by the `total-lead-time` endpoint so the UI can
 * surface "this needs to start 7 hours before service" without
 * re-doing the math client-side.
 */
export interface ProductLeadTimeBreakdown {
  product_id: string;
  total_minutes: number;
  total_hours: number;
  active_minutes: number;
  passive_minutes: number;
  stages: Array<{
    sequence_order: number;
    name: string;
    active_minutes: number;
    passive_minutes: number;
    cumulative_minutes: number;  // running total at end of this stage
  }>;
}

/**
 * Per-outlet approval. Restaurant 1 sees Cheesecake only if a row
 * exists with (outlet_id="r1", product_id="cheesecake-slice", is_active=true).
 *
 * Optional max_units_per_day limits how many can be ordered in a single
 * day — a soft brake on a brand-new outlet for which Carissa hasn't
 * built capacity yet.
 */
export interface CommissaryApproval {
  id: string;
  outlet_id: string;
  product_id: string;
  is_active: boolean;
  approved_by_user_id?: string;
  approved_by_name?: string;
  approved_at: string;
  max_units_per_day?: number;
  /** Free text the approver uses to flag conditions (e.g. "Cafe gets
   *  croissants; pull from morning bake only"). */
  note?: string;
}

export type CommissaryOrderStatus =
  | "draft"
  | "submitted"
  | "in_production"
  | "ready"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface CommissaryOrderLine {
  product_id: string;
  product_name: string;        // denormalized for audit
  unit: CommissaryUnit;
  qty: number;
  unit_cost: number;            // snapshot at order time
  line_total: number;
}

/**
 * An internal transfer order: outlet A → producing outlet → back to
 * outlet A. Crosses the production sheet for the producing outlet
 * AND hits both outlets' COGS books at unit_cost.
 *
 * Status flow:
 *   draft → submitted → in_production → ready → in_transit → delivered
 *                                      ↓
 *                                  cancelled (any prior state)
 */
export interface CommissaryOrder {
  id: string;
  lane: CommissaryLane;
  /** Outlet placing the order (the consumer). */
  ordering_outlet_id: string;
  /** Outlet producing the goods (Pastry shop or Banquet kitchen). */
  producing_outlet_id: string;
  needed_by: string;           // ISO datetime
  status: CommissaryOrderStatus;
  lines: CommissaryOrderLine[];
  total_cost: number;
  /** Audit. Every status transition appends here. */
  audit_log: Array<{
    at: string;
    user_id?: string;
    user_name?: string;
    action: string;             // "submitted", "status:ready", etc.
    note?: string;
  }>;
  /** Foreign key into staff_schedule.production_tasks once the
   *  producing kitchen schedules the work. Null until scheduled. */
  production_task_id?: string;
  /** Foreign key into the BEO that drove this order, if any. The
   *  D16c BEO→production generator stamps this when auto-creating
   *  orders from event menus. */
  beo_id?: string;
  ordered_by_user_id?: string;
  ordered_by_name?: string;
  created_at: string;
  updated_at: string;
}
