/**
 * Extract Global Calendar events for forecast aggregation.
 * Includes all events (food and non-food) with guest count and meal period correlation.
 */

import type { ForecastDataPoint, MealPeriod, CalendarEventForForecast } from "../../../shared/types/forecast-sources";

export type DateRange = { start: string; end: string };

const MEAL_PERIOD_HOURS: Record<MealPeriod, { start: number; end: number }> = {
  breakfast: { start: 6, end: 11 },
  lunch: { start: 11, end: 15 },
  dinner: { start: 17, end: 22 },
  late_night: { start: 22, end: 26 },
  all_day: { start: 0, end: 24 },
};

function parseHour(isoOrTime: string): number {
  const str = String(isoOrTime);
  if (str.includes("T")) {
    const t = str.split("T")[1];
    if (t) {
      const [h] = t.split(":");
      const n = parseInt(h, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  const [h] = str.split(":");
  const n = parseInt(h, 10);
  return Number.isNaN(n) ? 12 : n;
}

/**
 * Correlate event start/end time to one or more meal periods.
 */
export function correlateEventTimeToMealPeriod(event: CalendarEventForForecast): MealPeriod[] {
  const startStr = event.start_time ?? event.start;
  const endStr = event.end_time ?? event.end;
  const startHour = parseHour(startStr);
  let endHour = parseHour(endStr);
  if (endHour < startHour) endHour += 24;

  const periods: MealPeriod[] = [];
  const order: MealPeriod[] = ["breakfast", "lunch", "dinner", "late_night"];
  for (const period of order) {
    const { start: pStart, end: pEnd } = MEAL_PERIOD_HOURS[period];
    const overlapStart = Math.max(startHour, pStart);
    let overlapEnd = Math.min(endHour, pEnd);
    if (overlapEnd <= overlapStart) continue;
    periods.push(period);
  }
  if (periods.length === 0) periods.push("all_day");
  return periods;
}

/**
 * Extract guest count from event (guest_count, exp, gtd, set, or metadata).
 */
export function extractGuestCountFromEvent(event: CalendarEventForForecast): number {
  const n = event.guest_count ?? (event as any).exp ?? (event as any).gtd ?? (event as any).set;
  if (typeof n === "number" && !Number.isNaN(n)) return Math.max(0, n);
  const meta = event.metadata as Record<string, unknown> | undefined;
  const m = meta?.guest_count ?? meta?.guestCount ?? meta?.guests;
  if (typeof m === "number" && !Number.isNaN(m)) return Math.max(0, m);
  return 0;
}

/**
 * Extract calendar forecast data for org and date range.
 * listEventsFn should return events from EnterpriseCalendarService or similar.
 */
export async function extractCalendarForecastData(
  orgId: string,
  dateRange: DateRange,
  listEventsFn: (orgId: string, userId: string, filters: { start_date: string; end_date: string }) => Promise<{ events: CalendarEventForForecast[] }>,
  userId: string,
): Promise<ForecastDataPoint[]> {
  const { events } = await listEventsFn(orgId, userId, {
    start_date: dateRange.start,
    end_date: dateRange.end,
  });

  const points: ForecastDataPoint[] = [];
  for (const event of events) {
    const date = event.date ?? (event.start ?? event.start_time ?? "").slice(0, 10);
    if (!date || date < dateRange.start || date > dateRange.end) continue;

    const guestCount = extractGuestCountFromEvent(event);
    const mealPeriods = correlateEventTimeToMealPeriod(event);
    const countPerPeriod = mealPeriods.length > 0 ? Math.round(guestCount / mealPeriods.length) : guestCount;

    for (const mealPeriod of mealPeriods) {
      points.push({
        date,
        outletId: event.outlet_id ?? event.outletId ?? null,
        mealPeriod,
        guestCount: countPerPeriod,
        source: "calendar",
        sourceId: event.id,
        confidence: 0.85,
        eventType: (event.metadata as any)?.eventType ?? "event",
      });
    }

    if (mealPeriods.length === 0 && guestCount > 0) {
      points.push({
        date,
        outletId: event.outlet_id ?? event.outletId ?? null,
        mealPeriod: "all_day",
        guestCount,
        source: "calendar",
        sourceId: event.id,
        confidence: 0.85,
        eventType: (event.metadata as any)?.eventType ?? "event",
      });
    }
  }

  return points;
}
