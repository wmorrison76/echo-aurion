/**
 * Generate 5-day sales matrix per outlet.
 */

import type { ForecastDataPoint, MealPeriod } from "../../../shared/types/forecast-sources";

export interface SalesMatrix {
  outletId: string;
  outletName?: string;
  days: SalesMatrixDay[];
  generatedAt: string;
}

export interface SalesMatrixDay {
  date: string;
  mealPeriods: MealPeriodBreakdown[];
  totalGuestCount: number;
  totalRevenue?: number;
}

export interface MealPeriodBreakdown {
  mealPeriod: MealPeriod;
  guestCount: number;
  revenue?: number;
}

export interface MenuItem {
  id: string;
  name: string;
}

export interface ItemSalesForecast {
  itemId: string;
  itemName: string;
  predictedQuantity: number;
}

/**
 * Generate 5-day sales matrix for an outlet.
 */
export async function generateSalesMatrix(
  _orgId: string,
  outletId: string,
  days: number = 5,
  _forecastPoints: ForecastDataPoint[],
): Promise<SalesMatrix> {
  const dayList: SalesMatrixDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dayList.push({
      date: d.toISOString().slice(0, 10),
      mealPeriods: [],
      totalGuestCount: 0,
    });
  }
  return {
    outletId,
    days: dayList,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Break down forecast points by meal period.
 */
export function breakdownByMealPeriod(forecast: ForecastDataPoint[]): MealPeriodBreakdown[] {
  const byPeriod = new Map<MealPeriod, { guestCount: number; revenue: number }>();
  for (const p of forecast) {
    const cur = byPeriod.get(p.mealPeriod) ?? { guestCount: 0, revenue: 0 };
    cur.guestCount += p.guestCount;
    cur.revenue += p.revenue ?? 0;
    byPeriod.set(p.mealPeriod, cur);
  }
  return Array.from(byPeriod.entries()).map(([mealPeriod, v]) => ({
    mealPeriod,
    guestCount: v.guestCount,
    revenue: v.revenue || undefined,
  }));
}

/**
 * Forecast item-level sales (stub).
 */
export async function forecastItemSales(
  _forecast: ForecastDataPoint,
  _menuItems: MenuItem[],
): Promise<ItemSalesForecast[]> {
  return [];
}
