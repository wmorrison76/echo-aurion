import { buildMockWeeklyTotals } from "../../../client/apps/scheduler-ui/lib/mockPayrollServer";
import { applyPolicy } from "../../../client/apps/scheduler-ui/lib/payrollPolicy";
import type {
  Currency,
  WeeklyTotalsRequest,
  WeeklyTotals,
  EmployeeWeeklyTotal,
} from "../../../shared/payroll";
export interface ScheduleEmployee {
  id: string;
  name: string;
  role?: string;
  rate?: number;
  shifts: Record<string, { in?: string; out?: string; breakMin?: number }>;
}
function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const t = timeStr.trim().toLowerCase();
  let h = 0,
    m = 0;
  const isPM = t.includes("p");
  const matches = t.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!matches) return null;
  h = parseInt(matches[1], 10);
  m = matches[2] ? parseInt(matches[2], 10) : 0;
  if (isPM && h < 12) h += 12;
  if (t.includes("a") && h === 12) h = 0;
  return h * 60 + m;
}
function getHoursFromShift(
  inTime: string | undefined,
  outTime: string | undefined,
  breakMin: number = 0,
): number {
  const inMin = parseTimeToMinutes(inTime);
  const outMin = parseTimeToMinutes(outTime);
  if (inMin === null || outMin === null) return 0;
  let workMinutes = outMin >= inMin ? outMin - inMin : 24 * 60 - inMin + outMin;
  workMinutes = Math.max(0, workMinutes - breakMin);
  return Math.round((workMinutes / 60) * 100) / 100;
}
export async function getWeeklyTotals(
  req: WeeklyTotalsRequest,
  scheduleData?: ScheduleEmployee[],
): Promise<WeeklyTotals> {
  const start = new Date(req.startISO);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const period = {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    tz: req.tz,
  }; // If no schedule data provided, use mock if (!scheduleData || scheduleData.length === 0) { return buildMockWeeklyTotals({ currency: (req.currency as Currency) ?? 'USD', period }); } // Build from real schedule data const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; const policy = { weekly_ot_threshold: 40, daily_ot_threshold: 8, dt_threshold: 12, ot_multiplier: 1.5, dt_multiplier: 2 } as WeeklyTotals['policy']; const fx: Record<Currency, number> = { USD: 1, CAD: 1.35, GBP: 0.78, EUR: 0.92 }; const fxRate = fx[req.currency as Currency] || 1; const employees: EmployeeWeeklyTotal[] = scheduleData.map(emp => { const dailyHours: number[] = []; // Extract hours for each day of the week for (let i = 0; i < 7; i++) { const day = days[i]; const shift = emp.shifts[day]; const hours = shift ? getHoursFromShift(shift.in, shift.out, shift.breakMin || 0) : 0; dailyHours.push(hours); } const baseRate = (emp.rate || 20) * fxRate; const payRes = applyPolicy({ daily: dailyHours, baseRate, currency: req.currency as Currency, policy, }); const [firstName, ...lastNameParts] = emp.name.split(' '); const lastName = lastNameParts.join(' ') || 'Employee'; return { emp_id: emp.id, first_name: firstName || 'Unknown', last_name: lastName, title: emp.role || 'Staff', reg_hours: payRes.reg, ot_hours: payRes.ot, dt_hours: payRes.dt, total_hours: payRes.totalHours, total_pay: payRes.totalPay, currency: req.currency as Currency, components: payRes.components, }; }); return { org_id: 'demo-org', location_id: 'kitchen-1', currency: req.currency as Currency, policy, period, employees, };
}
