import type { ScheduleChecked, Employee, Money } from '@data/models';

export const TheoryCost = {
  compute(schedule: ScheduleChecked, employees: Employee[], forecastSales: number): { total: Money; pct: number } {
    return { total: 0, pct: 0 };
  }
};
