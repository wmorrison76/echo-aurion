/**
 * Extract hotel PMS data for forecast aggregation.
 * Uses hotel_reservations and hotel_guest_spending tables (synced by PMS integrations).
 */

import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";

export type DateRange = { start: string; end: string };

/**
 * Extract hotel forecast data from DB (hotel_reservations + hotel_guest_spending).
 * Call after PMS integrations have synced data.
 */
export async function extractHotelForecastData(
  orgId: string,
  dateRange: DateRange,
  supabase: { from: (table: string) => any } | null,
): Promise<ForecastDataPoint[]> {
  if (!supabase) return [];

  try {
    const { data: reservations, error: resError } = await supabase
      .from("hotel_reservations")
      .select("id, org_id, outlet_id, check_in_date, check_out_date, guest_count, total_revenue, status")
      .eq("org_id", orgId)
      .gte("check_out_date", dateRange.start)
      .lte("check_in_date", dateRange.end)
      .in("status", ["confirmed", "checked_in", "checked_out"]);

    if (resError || !reservations?.length) return [];

    const points: ForecastDataPoint[] = [];
    for (const r of reservations) {
      const checkIn = String(r.check_in_date).slice(0, 10);
      const checkOut = String(r.check_out_date).slice(0, 10);
      const guestCount = Number(r.guest_count ?? 0);
      if (guestCount <= 0) continue;
      for (let d = new Date(checkIn); d <= new Date(checkOut); d.setDate(d.getDate() + 1)) {
        const date = d.toISOString().slice(0, 10);
        if (date < dateRange.start || date > dateRange.end) continue;
        points.push({
          date,
          outletId: r.outlet_id ?? null,
          mealPeriod: "all_day",
          guestCount,
          revenue: r.total_revenue ? Number(r.total_revenue) : undefined,
          source: "hotel_pms",
          sourceId: r.id,
          confidence: 0.88,
        });
      }
    }

    return points;
  } catch {
    return [];
  }
}

/**
 * Track guest spending for a reservation (call from PMS sync job).
 */
export async function trackGuestSpending(
  _orgId: string,
  _reservationId: string,
  _supabase: { from: (table: string) => any } | null,
): Promise<void> {
  // Implement when PMS provides spending feed; for now no-op
}

/** Hotel in-house context per date (rooms + guest count) for ForecastHub */
export interface HotelContextByDate {
  byDate: Record<string, { roomCount: number; guestCount: number }>;
}

/**
 * Get hotel context (in-house room count + guest count) by date for a range.
 * Sums hotel_reservations where check_in_date <= date < check_out_date.
 */
export async function getHotelContextByDate(
  orgId: string,
  dateRange: DateRange,
  supabase: { from: (table: string) => any } | null,
): Promise<HotelContextByDate> {
  const byDate: Record<string, { roomCount: number; guestCount: number }> = {};
  if (!supabase) return { byDate };

  try {
    const { data: reservations, error } = await supabase
      .from("hotel_reservations")
      .select("check_in_date, check_out_date, room_count, guest_count")
      .eq("org_id", orgId)
      .gte("check_out_date", dateRange.start)
      .lte("check_in_date", dateRange.end)
      .in("status", ["confirmed", "checked_in", "checked_out"]);

    if (error || !reservations?.length) return { byDate };

    for (const r of reservations) {
      const checkIn = String(r.check_in_date).slice(0, 10);
      const checkOut = String(r.check_out_date).slice(0, 10);
      const roomCount = Number(r.room_count ?? 0);
      const guestCount = Number(r.guest_count ?? 0);
      for (
        let d = new Date(checkIn);
        d < new Date(checkOut);
        d.setDate(d.getDate() + 1)
      ) {
        const date = d.toISOString().slice(0, 10);
        if (date < dateRange.start || date > dateRange.end) continue;
        if (!byDate[date]) byDate[date] = { roomCount: 0, guestCount: 0 };
        byDate[date].roomCount += roomCount;
        byDate[date].guestCount += guestCount;
      }
    }
    return { byDate };
  } catch {
    return { byDate };
  }
}
