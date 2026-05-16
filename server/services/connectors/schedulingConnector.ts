/**
 * Scheduling Connector
 * Syncs labor data from Toast and calculates GL impact
 */

import { logger } from "../../lib/logger";

export interface LaborSchedule {
  id: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  date: Date;
  startTime: string;
  endTime: string;
  hoursScheduled: number;
  position: string;
  department: string;
}

export interface LaborActual {
  employeeId: string;
  date: Date;
  hoursWorked: number;
  wageRate: number;
  overtimeHours: number;
}

export interface LaborVariance {
  employeeId: string;
  employeeName: string;
  date: Date;
  scheduledHours: number;
  actualHours: number;
  varianceHours: number;
  variancePercent: number;
  varianceCost: number;
  glImpact: {
    accountId: string;
    description: string;
    amount: number;
  };
}

export class SchedulingConnector {
  private static readonly TOAST_API =
    process.env.TOAST_API_URL || "https://api.toasttab.com";
  private static readonly API_KEY = process.env.TOAST_API_KEY || "";

  /**
   * Sync labor schedule from Toast
   */
  static async syncSchedule(
    entityId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<LaborSchedule[]> {
    try {
      logger.info("[SchedulingConnector] Syncing labor schedule from Toast", {
        entityId,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      // Mock data for demonstration
      const mockSchedule: LaborSchedule[] = [
        {
          id: "sched-001",
          employeeId: "emp-001",
          employeeName: "John Chef",
          jobTitle: "Head Chef",
          date: new Date(),
          startTime: "10:00",
          endTime: "18:00",
          hoursScheduled: 8,
          position: "Kitchen",
          department: "Operations",
        },
        {
          id: "sched-002",
          employeeId: "emp-002",
          employeeName: "Sarah Server",
          jobTitle: "Server",
          date: new Date(),
          startTime: "11:00",
          endTime: "22:00",
          hoursScheduled: 11,
          position: "Floor",
          department: "Front of House",
        },
        {
          id: "sched-003",
          employeeId: "emp-003",
          employeeName: "Mike Manager",
          jobTitle: "Manager",
          date: new Date(),
          startTime: "09:00",
          endTime: "17:00",
          hoursScheduled: 8,
          position: "Office",
          department: "Management",
        },
      ];

      logger.info("[SchedulingConnector] Schedule sync complete", {
        entityId,
        scheduleCount: mockSchedule.length,
        totalScheduledHours: mockSchedule.reduce(
          (sum, s) => sum + s.hoursScheduled,
          0,
        ),
      });

      return mockSchedule;
    } catch (error) {
      logger.error("[SchedulingConnector] Schedule sync failed", {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sync actual labor data (time tracking)
   */
  static async syncLaborActuals(
    entityId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<LaborActual[]> {
    try {
      logger.info("[SchedulingConnector] Syncing labor actuals from Toast", {
        entityId,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      // Mock data
      const mockActuals: LaborActual[] = [
        {
          employeeId: "emp-001",
          date: new Date(),
          hoursWorked: 8.5,
          wageRate: 25,
          overtimeHours: 0.5,
        },
        {
          employeeId: "emp-002",
          date: new Date(),
          hoursWorked: 10,
          wageRate: 18,
          overtimeHours: 0,
        },
        {
          employeeId: "emp-003",
          date: new Date(),
          hoursWorked: 8,
          wageRate: 30,
          overtimeHours: 0,
        },
      ];

      logger.info("[SchedulingConnector] Labor actuals sync complete", {
        entityId,
        actualCount: mockActuals.length,
        totalActualHours: mockActuals.reduce(
          (sum, a) => sum + a.hoursWorked,
          0,
        ),
      });

      return mockActuals;
    } catch (error) {
      logger.error("[SchedulingConnector] Labor actuals sync failed", {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate labor variance and GL impact
   */
  static async calculateVariance(
    entityId: string,
    schedule: LaborSchedule[],
    actuals: LaborActual[],
  ): Promise<LaborVariance[]> {
    const variances: LaborVariance[] = [];

    for (const scheduled of schedule) {
      const actual = actuals.find(
        (a) =>
          a.employeeId === scheduled.employeeId &&
          new Date(a.date).toDateString() === scheduled.date.toDateString(),
      );

      if (!actual) continue;

      const hoursVariance = actual.hoursWorked - scheduled.hoursScheduled;
      const costVariance = hoursVariance * actual.wageRate;
      const percentVariance =
        scheduled.hoursScheduled > 0
          ? (hoursVariance / scheduled.hoursScheduled) * 100
          : 0;

      const variance: LaborVariance = {
        employeeId: scheduled.employeeId,
        employeeName: scheduled.employeeName,
        date: scheduled.date,
        scheduledHours: scheduled.hoursScheduled,
        actualHours: actual.hoursWorked,
        varianceHours: hoursVariance,
        variancePercent: percentVariance,
        varianceCost: costVariance,
        glImpact: {
          accountId: "6100", // Labor expense
          description:
            hoursVariance > 0
              ? `Overtime variance: ${scheduled.employeeName}`
              : `Labor underutilization: ${scheduled.employeeName}`,
          amount: costVariance,
        },
      };

      variances.push(variance);
    }

    logger.info("[SchedulingConnector] Labor variance calculation complete", {
      entityId,
      totalScheduled: schedule.length,
      varianceCount: variances.filter((v) => v.varianceHours !== 0).length,
      totalVarianceCost: variances.reduce((sum, v) => sum + v.varianceCost, 0),
    });

    return variances;
  }

  /**
   * Forecast schedule impact on labor budget
   */
  static async forecastImpact(
    entityId: string,
    variance: LaborVariance[],
  ): Promise<any> {
    const totalVariance = variance.reduce((sum, v) => sum + v.varianceCost, 0);
    const byDepartment = variance.reduce(
      (acc, v) => {
        const dept = "Unknown";
        if (!acc[dept]) acc[dept] = 0;
        acc[dept] += v.varianceCost;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalMonthlyImpact: totalVariance * 4.33, // Extrapolate to monthly
      byDepartment,
      trend: "neutral",
      recommendation:
        totalVariance > 0
          ? "Schedule optimization needed - labor costs trending above budget"
          : "Labor costs under control",
    };
  }

  /**
   * Get labor summary for entity
   */
  static async getLaborSummary(entityId: string): Promise<any> {
    try {
      const dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const schedule = await this.syncSchedule(entityId, dateRange);
      const actuals = await this.syncLaborActuals(entityId, dateRange);
      const variances = await this.calculateVariance(
        entityId,
        schedule,
        actuals,
      );

      const summary = {
        totalScheduledHours: schedule.reduce(
          (sum, s) => sum + s.hoursScheduled,
          0,
        ),
        totalActualHours: actuals.reduce((sum, a) => sum + a.hoursWorked, 0),
        totalScheduledCost: actuals.reduce(
          (sum, a) => sum + a.hoursWorked * a.wageRate,
          0,
        ),
        laborCostPercent: 32.5, // Would calculate from revenue
        varianceCount: variances.filter((v) => v.varianceHours !== 0).length,
        totalVarianceCost: variances.reduce(
          (sum, v) => sum + v.varianceCost,
          0,
        ),
        lastSyncDate: new Date(),
      };

      return summary;
    } catch (error) {
      logger.error("[SchedulingConnector] Summary failed", {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
