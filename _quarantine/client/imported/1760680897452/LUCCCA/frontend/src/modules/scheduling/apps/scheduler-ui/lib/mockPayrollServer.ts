import type { WeeklyTotals, EmployeeWeeklyTotal, Currency } from "../../../types/payroll";
import type { WeeklyTotals, EmployeeWeeklyTotal, Currency } from '@shared/payroll';
import { applyPolicy } from "./payrollPolicy";

const FX: Record<Currency, number> = { USD: 1, CAD: 1.35, GBP: 0.78, EUR: 0.92 };

export function buildMockWeeklyTotals({ currency, period }: { currency: Currency; period: WeeklyTotals['period'] }): WeeklyTotals {
  const baseEmployees = [
    { emp_id: 'e1', first_name: 'Mark', last_name: 'Stone', title: 'Sauce Cook', hours: [8,8,8,8,8,0,0], rate: 22 },
    { emp_id: 'e2', first_name: 'Ana', last_name: 'Lee', title: 'Expo', hours: [6,6,6,6,6,0,0], rate: 20 },
    { emp_id: 'e3', first_name: 'Jo', last_name: 'Kim', title: 'Grill', hours: [10,10,10,10,0,0,0], rate: 24 },
  ];

  const policy = { weekly_ot_threshold: 40, daily_ot_threshold: 8, dt_threshold: 12, ot_multiplier: 1.5, dt_multiplier: 2 } as WeeklyTotals['policy'];
  const fx = FX[currency] || 1;

  const employees: EmployeeWeeklyTotal[] = baseEmployees.map(b => {
    const res = applyPolicy({
      daily: b.hours,
      baseRate: b.rate * fx,
      currency,
      policy,
    });
    return {
      emp_id: b.emp_id,
      first_name: b.first_name,
      last_name: b.last_name,
      title: b.title,
      reg_hours: res.reg,
      ot_hours: res.ot,
      dt_hours: res.dt,
      total_hours: res.totalHours,
      total_pay: res.totalPay,
      currency,
      components: res.components,
    };
  });

  return {
    org_id: 'demo-org',
    location_id: 'kitchen-1',
    currency,
    policy,
    period,
    employees,
  };
}
