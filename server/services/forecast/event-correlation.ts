/**
 * Correlate BEO/REO documents with forecast dates and meal periods.
 * Maps BEO start/end and guest counts to meal period buckets.
 */

import type { BEODocumentForForecast, MealPeriod, MealPeriodCorrelation } from "../../../shared/types/forecast-sources";

const MEAL_PERIOD_BOUNDS: Record<MealPeriod, { startHour: number; endHour: number }> = {
  breakfast: { startHour: 6, endHour: 11 },
  lunch: { startHour: 11, endHour: 15 },
  dinner: { startHour: 17, endHour: 22 },
  late_night: { startHour: 22, endHour: 26 }, // 22-02 next day as 26
  all_day: { startHour: 0, endHour: 24 },
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
 * Correlate a BEO's time window to one or more meal periods and return weighted guest counts.
 */
export function correlateBEOToMealPeriod(beo: BEODocumentForForecast): MealPeriodCorrelation[] {
  const startHour = parseHour(beo.start);
  const endHour = parseHour(beo.end);
  const guestCount = Math.max(0, beo.gtd ?? beo.exp ?? beo.set ?? 0);
  if (guestCount === 0) return [];

  const results: MealPeriodCorrelation[] = [];
  const periodOrder: MealPeriod[] = ["breakfast", "lunch", "dinner", "late_night"];

  for (const period of periodOrder) {
    const { startHour: pStart, endHour: pEnd } = MEAL_PERIOD_BOUNDS[period];
    const overlapStart = Math.max(startHour, pStart);
    let overlapEnd = Math.min(endHour, pEnd);
    if (period === "late_night" && endHour <= 2) overlapEnd = Math.min(endHour + 24, 26);
    if (overlapEnd <= overlapStart) continue;

    const periodHours = pEnd - pStart;
    const overlapHours = Math.min(overlapEnd - overlapStart, periodHours);
    const weight = Math.min(1, overlapHours / Math.max(1, endHour - startHour));
    results.push({
      mealPeriod: period,
      guestCount: Math.round(guestCount * weight),
      weight,
    });
  }

  if (results.length === 0 && guestCount > 0) {
    results.push({
      mealPeriod: "all_day",
      guestCount,
      weight: 1,
    });
  }

  return results;
}
