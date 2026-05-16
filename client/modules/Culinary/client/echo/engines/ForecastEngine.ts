export interface HistoricalDataPoint {
  date: string;
  covers: number;
  revenue: number;
  isHoliday?: boolean;
  isSpecialEvent?: boolean;
  weatherIndex?: number;
}

export interface ForecastResult {
  horizonDays: number;
  dailyForecast: { date: string; covers: number; revenue: number }[];
  notes: string[];
}

export class ForecastEngine {
  static forecastFromHistory(
    history: HistoricalDataPoint[],
    horizonDays: number = 7,
  ): ForecastResult {
    if (!history.length) {
      return {
        horizonDays,
        dailyForecast: [],
        notes: ["No history provided."],
      };
    }

    const notes: string[] = [];
    const recent = history.slice(-28);
    const avgCovers =
      recent.reduce((s, p) => s + p.covers, 0) / recent.length || 0;
    const avgRevenue =
      recent.reduce((s, p) => s + p.revenue, 0) / recent.length || 0;

    notes.push(
      `Baseline derived from last ${recent.length} days: ~${avgCovers.toFixed(
        0,
      )} covers/day, revenue ~${avgRevenue.toFixed(0)}.`,
    );

    const lastDate = new Date(history[history.length - 1].date);
    const dailyForecast: ForecastResult["dailyForecast"] = [];

    for (let i = 1; i <= horizonDays; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);

      const dateStr = d.toISOString().slice(0, 10);
      const weekday = d.getDay();
      let covers = avgCovers;
      let revenue = avgRevenue;

      if (weekday === 5 || weekday === 6) {
        covers *= 1.15;
        revenue *= 1.15;
      }

      dailyForecast.push({
        date: dateStr,
        covers: Math.round(covers),
        revenue: Math.round(revenue),
      });
    }

    return { horizonDays, dailyForecast, notes };
  }
}
