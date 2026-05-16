/**
 * Extract restaurant reservation data for forecast aggregation.
 * Groups reservations by outlet and meal period.
 */

import type { ForecastDataPoint, MealPeriod } from "../../../shared/types/forecast-sources";

export type DateRange = { start: string; end: string };

export interface Reservation {
  id: string;
  outletId: string;
  outletName?: string;
  date: string;
  time: string;
  partySize: number;
  mealPeriod?: MealPeriod;
}

export interface MealPeriodGroup {
  mealPeriod: MealPeriod;
  guestCount: number;
  reservationCount: number;
}

const MEAL_PERIOD_HOURS: Record<MealPeriod, { start: number; end: number }> = {
  breakfast: { start: 6, end: 11 },
  lunch: { start: 11, end: 15 },
  dinner: { start: 17, end: 22 },
  late_night: { start: 22, end: 26 },
  all_day: { start: 0, end: 24 },
};

function inferMealPeriod(time: string): MealPeriod {
  const [hStr] = String(time).split(":");
  const hour = parseInt(hStr, 10);
  if (Number.isNaN(hour)) return "all_day";
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  if (hour >= 22 || hour < 2) return "late_night";
  return "all_day";
}

/**
 * Group reservations by meal period and sum guest count.
 */
export function groupReservationsByMealPeriod(reservations: Reservation[]): MealPeriodGroup[] {
  const byPeriod = new Map<MealPeriod, { guestCount: number; count: number }>();
  const periods: MealPeriod[] = ["breakfast", "lunch", "dinner", "late_night", "all_day"];
  periods.forEach((p) => byPeriod.set(p, { guestCount: 0, count: 0 }));

  for (const r of reservations) {
    const period = r.mealPeriod ?? inferMealPeriod(r.time);
    const cur = byPeriod.get(period) ?? { guestCount: 0, count: 0 };
    cur.guestCount += r.partySize;
    cur.count += 1;
    byPeriod.set(period, cur);
  }

  return Array.from(byPeriod.entries())
    .filter(([, v]) => v.guestCount > 0)
    .map(([mealPeriod, v]) => ({
      mealPeriod,
      guestCount: v.guestCount,
      reservationCount: v.count,
    }));
}

/**
 * Extract reservation forecast data for org, outlet, and date range.
 * fetchReservationsFn should query DB or external system (OpenTable, Resy, custom).
 */
export async function extractReservationForecastData(
  orgId: string,
  outletId: string | null,
  dateRange: DateRange,
  fetchReservationsFn: (
    orgId: string,
    outletId: string | null,
    dateRange: DateRange,
  ) => Promise<Reservation[]>,
): Promise<ForecastDataPoint[]> {
  const reservations = await fetchReservationsFn(orgId, outletId, dateRange);
  const points: ForecastDataPoint[] = [];
  const byDate = new Map<string, Reservation[]>();

  for (const r of reservations) {
    if (r.date < dateRange.start || r.date > dateRange.end) continue;
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }

  for (const [date, list] of byDate) {
    const groups = groupReservationsByMealPeriod(list);
    for (const g of groups) {
      points.push({
        date,
        outletId,
        outletName: list[0]?.outletName,
        mealPeriod: g.mealPeriod,
        guestCount: g.guestCount,
        source: "reservations",
        sourceId: undefined,
        confidence: 0.9,
      });
    }
  }

  return points;
}
