/**
 * Types for ForecastHub: BEO breakdown, hotel context, capture rates, uncaptured/transient.
 */

/** One row in the Group/BEO breakdown table (per BEO, per date). */
export interface BEOBreakdownRow {
  date: string;
  beoId: string;
  beoNumber: string;
  groupName: string;
  outletId?: string | null;
  outletName?: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  lateNight: number;
  total: number;
  eventId?: string;
}

/** Hotel in-house context for a single date. */
export interface HotelContextDay {
  roomCount: number;
  guestCount: number;
}

/** Hotel context keyed by date (YYYY-MM-DD). */
export interface HotelContextByDate {
  byDate: Record<string, HotelContextDay>;
}

/** Per-outlet capture rate (percent, e.g. 108 = 108%). */
export interface CaptureRatesPayload {
  rates: Record<string, number>; // outletId -> captureRatePercent
}

/** Optional per-outlet, per-meal override. */
export interface CaptureRateMealOverride {
  outletId: string;
  mealPeriod: string;
  captureRatePercent: number;
}

/** One day in the ForecastHub summary (uncaptured + transient). */
export interface ForecastHubSummaryDay {
  date: string;
  roomCount: number;
  guestCount: number;
  uncapturedTotal: number;
  uncapturedByOutlet?: Record<string, number>;
  transientGuestCount: number;
}

/** Full summary for 21-day window. */
export interface ForecastHubSummary {
  byDate: Record<string, ForecastHubSummaryDay>;
}
