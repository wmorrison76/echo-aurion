/**
 * Type definitions for forecast data sources (BEO/REO, Calendar, Hotel, POS, Reservations).
 * Used by the Forecast Aggregation Engine.
 */

export type MealPeriod = "breakfast" | "lunch" | "dinner" | "late_night" | "all_day";

export type ForecastSourceType =
  | "beo"
  | "reo"
  | "calendar"
  | "hotel_pms"
  | "reservations"
  | "pos"
  | "production_forecast"
  | "historical"
  | "ai";

/** Single forecast data point from any source */
export interface ForecastDataPoint {
  date: string; // YYYY-MM-DD
  outletId: string | null;
  outletName?: string;
  mealPeriod: MealPeriod;
  guestCount: number;
  revenue?: number;
  source: ForecastSourceType;
  sourceId?: string; // e.g. beoId, eventId
  confidence: number; // 0-1
  eventType?: string; // e.g. 'beo', 'meeting', 'conference'
  raw?: Record<string, unknown>;
}

/** BEO/REO document shape for correlation (subset of BEODocument) */
export interface BEODocumentForForecast {
  beoId: string;
  eventId: string;
  documentType: "Restaurant Event Order" | "Banquet Event Order";
  outletId?: string;
  outletName?: string;
  start: string;
  end: string;
  exp?: number;
  gtd?: number;
  set?: number;
  title?: string;
  status?: string;
  /** From beo_banquet_orders.beo_number */
  beoNumber?: string;
  /** From beo_banquet_orders.beo_name (group name) */
  beoName?: string;
}

/** Meal period correlation for a BEO */
export interface MealPeriodCorrelation {
  mealPeriod: MealPeriod;
  guestCount: number;
  weight: number; // 0-1 share of BEO in this period
}

/** Calendar event for forecast extraction */
export interface CalendarEventForForecast {
  id: string;
  title: string;
  start: string;
  end: string;
  start_time?: string;
  end_time?: string;
  date?: string;
  outlet_id?: string;
  outletId?: string;
  guest_count?: number;
  location_room?: string;
  metadata?: Record<string, unknown>;
}
