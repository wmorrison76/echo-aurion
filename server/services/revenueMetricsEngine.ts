/**
 * Revenue Metrics Engine
 * Calculates hospitality KPIs: ADR, RevPAR, Occupancy, etc.
 */

import { logger } from "../lib/logger";

export interface RevenueMetrics {
  date: Date;
  occupancyPercent: number;
  occupiedRooms: number;
  totalRooms: number;
  adr: number; // Average Daily Rate
  revpar: number; // Revenue Per Available Room
  totalRoomRevenue: number;
  fbRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  occupancyStatus: "low" | "moderate" | "high" | "full";
}

export interface RevenueForecast {
  forecastDate: Date;
  expectedOccupancy: number;
  expectedADR: number;
  expectedRevPAR: number;
  confidenceLevel: number;
  historicalComparison: string;
}

export class RevenueMetricsEngine {
  /**
   * Calculate daily revenue metrics
   */
  static async calculateDailyMetrics(
    entityId: string,
    date: Date,
  ): Promise<RevenueMetrics> {
    try {
      // In production, this would query transaction data
      // For now, return calculated metrics

      const totalRooms = 150; // Mock
      const occupiedRooms = Math.floor(totalRooms * 0.78); // Mock
      const occupancy = (occupiedRooms / totalRooms) * 100;

      const totalRoomRevenue = occupiedRooms * 185; // Mock ADR
      const fbRevenue = occupiedRooms * 45; // Mock F&B per occupied room
      const otherRevenue = 2500; // Mock

      const adr = totalRoomRevenue / occupiedRooms;
      const revpar = totalRoomRevenue / totalRooms;

      const metrics: RevenueMetrics = {
        date,
        occupancyPercent: occupancy,
        occupiedRooms,
        totalRooms,
        adr,
        revpar,
        totalRoomRevenue,
        fbRevenue,
        otherRevenue,
        totalRevenue: totalRoomRevenue + fbRevenue + otherRevenue,
        occupancyStatus:
          occupancy > 90
            ? "full"
            : occupancy > 70
              ? "high"
              : occupancy > 50
                ? "moderate"
                : "low",
      };

      logger.info("[RevenueMetrics] Daily metrics calculated", {
        entityId,
        date: date.toDateString(),
        occupancy: occupancy.toFixed(1) + "%",
        adr: adr.toFixed(2),
        revpar: revpar.toFixed(2),
      });

      return metrics;
    } catch (error) {
      logger.error("[RevenueMetrics] Calculation failed", {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate monthly metrics
   */
  static async calculateMonthlyMetrics(
    entityId: string,
    year: number,
    month: number,
  ): Promise<RevenueMetrics> {
    try {
      const days = new Date(year, month + 1, 0).getDate();
      let totalOccupancy = 0;
      let totalADR = 0;
      let totalRevenue = 0;

      for (let day = 1; day <= days; day++) {
        const date = new Date(year, month, day);
        const metrics = await this.calculateDailyMetrics(entityId, date);
        totalOccupancy += metrics.occupancyPercent;
        totalADR += metrics.adr;
        totalRevenue += metrics.totalRevenue;
      }

      const avgOccupancy = totalOccupancy / days;
      const avgADR = totalADR / days;
      const totalRooms = 150;

      return {
        date: new Date(year, month, 1),
        occupancyPercent: avgOccupancy,
        occupiedRooms: Math.floor((avgOccupancy / 100) * totalRooms),
        totalRooms,
        adr: avgADR,
        revpar: totalRevenue / days / totalRooms,
        totalRoomRevenue: totalRevenue * 0.7,
        fbRevenue: totalRevenue * 0.2,
        otherRevenue: totalRevenue * 0.1,
        totalRevenue,
        occupancyStatus:
          avgOccupancy > 90
            ? "full"
            : avgOccupancy > 70
              ? "high"
              : avgOccupancy > 50
                ? "moderate"
                : "low",
      };
    } catch (error) {
      logger.error("[RevenueMetrics] Monthly calculation failed", {
        entityId,
        year,
        month,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Forecast revenue metrics
   */
  static async forecastMetrics(
    entityId: string,
    startDate: Date,
    days: number,
  ): Promise<RevenueForecast[]> {
    const forecasts: RevenueForecast[] = [];

    try {
      // Simple forecast based on historical avg
      const historicalAvgOccupancy = 0.75;
      const historicalAvgADR = 185;

      for (let i = 0; i < days; i++) {
        const forecastDate = new Date(
          startDate.getTime() + i * 24 * 60 * 60 * 1000,
        );

        // Add seasonal adjustment
        const seasonalFactor = this.getSeasonalFactor(forecastDate);

        const expectedOccupancy = Math.min(
          100,
          historicalAvgOccupancy * seasonalFactor * 100,
        );
        const expectedADR = historicalAvgADR * seasonalFactor;
        const expectedRevPAR = (expectedOccupancy / 100) * expectedADR;

        forecasts.push({
          forecastDate,
          expectedOccupancy,
          expectedADR,
          expectedRevPAR,
          confidenceLevel: 0.75,
          historicalComparison: `${(((expectedOccupancy - historicalAvgOccupancy * 100) / (historicalAvgOccupancy * 100)) * 100).toFixed(1)}% vs historical avg`,
        });
      }

      logger.info("[RevenueMetrics] Forecast generated", {
        entityId,
        days,
        avgExpectedOccupancy: (
          forecasts.reduce((sum, f) => sum + f.expectedOccupancy, 0) /
          forecasts.length
        ).toFixed(1),
        avgExpectedRevPAR: (
          forecasts.reduce((sum, f) => sum + f.expectedRevPAR, 0) /
          forecasts.length
        ).toFixed(2),
      });

      return forecasts;
    } catch (error) {
      logger.error("[RevenueMetrics] Forecast failed", {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Map revenue metrics to GL accounts
   */
  static async mapToGL(
    entityId: string,
    metrics: RevenueMetrics,
  ): Promise<any> {
    return {
      roomRevenue: {
        accountId: "4000",
        description: "Room Revenue",
        amount: metrics.totalRoomRevenue,
        breakdown: {
          byOccupancy: `${metrics.occupancyPercent.toFixed(1)}% occupied`,
          byRate: `ADR: $${metrics.adr.toFixed(2)}`,
        },
      },
      fbRevenue: {
        accountId: "4210",
        description: "Food & Beverage Revenue",
        amount: metrics.fbRevenue,
      },
      otherRevenue: {
        accountId: "4500",
        description: "Other Revenue",
        amount: metrics.otherRevenue,
      },
    };
  }

  /**
   * Get seasonal adjustment factor
   */
  private static getSeasonalFactor(date: Date): number {
    const month = date.getMonth();

    // Typical hospitality seasonality
    const factors: Record<number, number> = {
      0: 0.85, // January
      1: 0.85, // February
      2: 0.95, // March
      3: 1.05, // April
      4: 1.1, // May
      5: 1.15, // June (summer)
      6: 1.15, // July (summer)
      7: 1.15, // August (summer)
      8: 1.05, // September
      9: 0.95, // October
      10: 0.9, // November
      11: 1.1, // December (holidays)
    };

    return factors[month] || 1.0;
  }
}
