/**
 * Extract POS sales data for forecast comparison and aggregation.
 */

import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";

export type DateRange = { start: string; end: string };

export interface ForecastVariance {
  date: string;
  outletId: string | null;
  mealPeriod: string;
  forecastGuestCount: number;
  actualGuestCount: number;
  forecastRevenue?: number;
  actualRevenue?: number;
  varianceGuest: number;
  varianceRevenue?: number;
}

/**
 * Extract POS forecast/actual data from pos_sales_data table.
 */
export async function extractPOSForecastData(
  orgId: string,
  outletId: string | null,
  dateRange: DateRange,
  supabase: { from: (table: string) => any } | null,
): Promise<ForecastDataPoint[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from("pos_sales_data")
      .select("id, outlet_id, date, time, meal_period, revenue, guest_count, item_count")
      .eq("org_id", orgId)
      .gte("date", dateRange.start)
      .lte("date", dateRange.end);
    if (outletId) query = query.eq("outlet_id", outletId);
    const { data, error } = await query;
    if (error || !data?.length) return [];

    const byKey = new Map<string, { guestCount: number; revenue: number }>();
    for (const row of data) {
      const date = String(row.date).slice(0, 10);
      const mealPeriod = row.meal_period ?? "all_day";
      const key = `${date}|${row.outlet_id ?? ""}|${mealPeriod}`;
      const cur = byKey.get(key) ?? { guestCount: 0, revenue: 0 };
      cur.guestCount += Number(row.guest_count ?? 0);
      cur.revenue += Number(row.revenue ?? 0);
      byKey.set(key, cur);
    }

    const points: ForecastDataPoint[] = [];
    for (const [key, v] of byKey) {
      const [date, outId, mealPeriod] = key.split("|");
      points.push({
        date,
        outletId: outId || null,
        mealPeriod: mealPeriod as ForecastDataPoint["mealPeriod"],
        guestCount: v.guestCount,
        revenue: v.revenue,
        source: "pos",
        confidence: 1,
      });
    }
    return points;
  } catch {
    return [];
  }
}

/**
 * Compare forecast to actual POS data.
 */
export function compareForecastToActual(
  forecast: ForecastDataPoint,
  actual: { guestCount: number; revenue?: number },
): ForecastVariance {
  return {
    date: forecast.date,
    outletId: forecast.outletId,
    mealPeriod: forecast.mealPeriod,
    forecastGuestCount: forecast.guestCount,
    actualGuestCount: actual.guestCount,
    forecastRevenue: forecast.revenue,
    actualRevenue: actual.revenue,
    varianceGuest: actual.guestCount - forecast.guestCount,
    varianceRevenue:
      actual.revenue != null && forecast.revenue != null
        ? actual.revenue - forecast.revenue
        : undefined,
  };
}
