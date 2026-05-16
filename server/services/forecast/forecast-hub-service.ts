/**
 * ForecastHub: capture rates, transient overrides, and summary (uncaptured + transient).
 */

import type { BEOBreakdownRow } from "../../../shared/types/forecast-hub";
import type { HotelContextByDate } from "./hotel-integration";
import { getBEOBreakdownRows } from "./beo-integration";
import { getHotelContextByDate } from "./hotel-integration";
import type { DateRange } from "./beo-integration";

export type SupabaseLike = { from: (table: string) => any };

/** Default capture rate when not set (100%). */
const DEFAULT_CAPTURE_RATE = 100;

/**
 * Get per-outlet capture rates for org.
 */
export async function getCaptureRates(
  orgId: string,
  supabase: SupabaseLike | null,
): Promise<Record<string, number>> {
  if (!supabase) return {};
  try {
    const { data: rows } = await supabase
      .from("outlet_capture_rates")
      .select("outlet_id, capture_rate_percent")
      .eq("org_id", orgId);
    const rates: Record<string, number> = {};
    for (const r of rows ?? []) {
      rates[String(r.outlet_id)] = Number(r.capture_rate_percent ?? DEFAULT_CAPTURE_RATE);
    }
    return rates;
  } catch {
    return {};
  }
}

/**
 * Upsert per-outlet capture rates for org.
 */
export async function putCaptureRates(
  orgId: string,
  rates: Record<string, number>,
  supabase: SupabaseLike | null,
): Promise<void> {
  if (!supabase) return;
  try {
    for (const [outletId, percent] of Object.entries(rates)) {
      const capture_rate_percent = Math.max(0, Math.min(500, Number(percent) || DEFAULT_CAPTURE_RATE));
      await supabase.from("outlet_capture_rates").upsert(
        {
          org_id: orgId,
          outlet_id: outletId,
          capture_rate_percent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,outlet_id" },
      );
    }
  } catch {
    // no-op
  }
}

/**
 * Get transient (outside) guest count overrides for date range.
 */
export async function getTransientOverrides(
  orgId: string,
  dateRange: DateRange,
  supabase: SupabaseLike | null,
): Promise<Record<string, number>> {
  if (!supabase) return {};
  try {
    const { data: rows } = await supabase
      .from("forecast_transient_override")
      .select("date, transient_guest_count")
      .eq("org_id", orgId)
      .gte("date", dateRange.start)
      .lte("date", dateRange.end);
    const byDate: Record<string, number> = {};
    for (const r of rows ?? []) {
      const d = String(r.date).slice(0, 10);
      byDate[d] = Number(r.transient_guest_count ?? 0);
    }
    return byDate;
  } catch {
    return {};
  }
}

/**
 * Set transient guest count for one date.
 */
export async function putTransientOverride(
  orgId: string,
  date: string,
  transientGuestCount: number,
  supabase: SupabaseLike | null,
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("forecast_transient_override").upsert(
      {
        org_id: orgId,
        date,
        transient_guest_count: Math.max(0, Math.round(transientGuestCount)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,date" },
    );
  } catch {
    // no-op
  }
}

/**
 * Get total reservation covers by date for org (from reservations table).
 */
export async function getReservationCoversByDate(
  orgId: string,
  dateRange: DateRange,
  supabase: SupabaseLike | null,
): Promise<Record<string, number>> {
  if (!supabase) return {};
  try {
    const { data: rows } = await supabase
      .from("reservations")
      .select("reservation_date, party_size")
      .eq("org_id", orgId)
      .gte("reservation_date", dateRange.start)
      .lte("reservation_date", dateRange.end)
      .in("status", ["confirmed", "checked_in"]);
    const byDate: Record<string, number> = {};
    for (const r of rows ?? []) {
      const d = String(r.reservation_date).slice(0, 10);
      byDate[d] = (byDate[d] ?? 0) + Number(r.party_size ?? 0);
    }
    return byDate;
  } catch {
    return {};
  }
}

export interface ForecastHubSummaryInput {
  beoRows: BEOBreakdownRow[];
  hotelContext: HotelContextByDate;
  captureRates: Record<string, number>;
  reservationCoversByDate: Record<string, number>; // date -> total covers from reservations
  transientByDate: Record<string, number>;
}

/**
 * Compute uncaptured total per day: max(0, round(hotel_guests * effective_capture/100) - (BEO_total + res_total)).
 * Effective capture: average of outlet capture rates, or 100 if none set.
 */
export function computeSummaryByDate(input: ForecastHubSummaryInput): Record<string, { roomCount: number; guestCount: number; uncapturedTotal: number; transientGuestCount: number }> {
  const { beoRows, hotelContext, captureRates, reservationCoversByDate, transientByDate } = input;
  const byDate: Record<string, { roomCount: number; guestCount: number; uncapturedTotal: number; transientGuestCount: number }> = {};

  const dates = new Set<string>([
    ...Object.keys(hotelContext.byDate),
    ...beoRows.map((r) => r.date),
    ...Object.keys(reservationCoversByDate),
    ...Object.keys(transientByDate),
  ]);

  const effectiveCapturePercent =
    Object.keys(captureRates).length > 0
      ? Object.values(captureRates).reduce((a, b) => a + b, 0) / Object.keys(captureRates).length
      : DEFAULT_CAPTURE_RATE;

  for (const date of dates) {
    const hotel = hotelContext.byDate[date] ?? { roomCount: 0, guestCount: 0 };
    const beoTotal = beoRows.filter((r) => r.date === date).reduce((s, r) => s + r.total, 0);
    const resTotal = reservationCoversByDate[date] ?? 0;
    const expectedCaptured = Math.round((hotel.guestCount * effectiveCapturePercent) / 100);
    const uncapturedTotal = Math.max(0, expectedCaptured - (beoTotal + resTotal));
    const transientGuestCount = transientByDate[date] ?? 0;

    byDate[date] = {
      roomCount: hotel.roomCount,
      guestCount: hotel.guestCount,
      uncapturedTotal,
      transientGuestCount,
    };
  }

  return byDate;
}
