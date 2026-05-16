import type { ScheduleSettings } from "@/features/standalone/settings";
export interface PayPeriod {
  startDate: string; // ISO date endDate: string; // ISO date periodNumber: number; label: string;
} /** * Calculate which pay period a given date falls into */
export function getPayPeriod(
  dateISO: string,
  settings: ScheduleSettings,
): PayPeriod {
  const date = new Date(dateISO);
  const anchor = new Date(settings.payPeriodAnchor);
  switch (settings.payPeriod) {
    case "weekly":
      return getWeeklyPeriod(date, settings.startDay, anchor);
    case "biweekly":
      return getBiweeklyPeriod(date, settings.startDay, anchor);
    case "semi_monthly":
      return getSemiMonthlyPeriod(date);
    case "monthly":
      return getMonthlyPeriod(date);
    default:
      return getBiweeklyPeriod(date, settings.startDay, anchor);
  }
} /** * Get all pay periods in a given range */
export function getPayPeriodsInRange(
  startISO: string,
  endISO: string,
  settings: ScheduleSettings,
): PayPeriod[] {
  const periods: PayPeriod[] = [];
  const current = new Date(startISO);
  const end = new Date(endISO);
  while (current <= end) {
    const period = getPayPeriod(current.toISOString().slice(0, 10), settings);
    if (!periods.some((p) => p.label === period.label)) {
      periods.push(period);
    }
    current.setDate(current.getDate() + 1);
  }
  return periods;
}
function getWeeklyPeriod(
  date: Date,
  startDay: number,
  anchor: Date,
): PayPeriod {
  const weekStart = getWeekStart(date, startDay);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weeksFromAnchor = Math.floor(
    (weekStart.getTime() - anchor.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  return {
    startDate: weekStart.toISOString().slice(0, 10),
    endDate: weekEnd.toISOString().slice(0, 10),
    periodNumber: weeksFromAnchor + 1,
    label: `Week of ${formatDateShort(weekStart)}`,
  };
}
function getBiweeklyPeriod(
  date: Date,
  startDay: number,
  anchor: Date,
): PayPeriod {
  const weekStart = getWeekStart(date, startDay);
  const daysFromAnchor = Math.floor(
    (weekStart.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weeksFromAnchor = Math.floor(daysFromAnchor / 7);
  const periodOffset = Math.floor(weeksFromAnchor / 2);
  const periodStart = new Date(anchor);
  periodStart.setDate(periodStart.getDate() + periodOffset * 14);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 13);
  return {
    startDate: periodStart.toISOString().slice(0, 10),
    endDate: periodEnd.toISOString().slice(0, 10),
    periodNumber: periodOffset + 1,
    label: `Bi-weekly: ${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`,
  };
}
function getSemiMonthlyPeriod(date: Date): PayPeriod {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  let startDate: Date;
  let endDate: Date;
  let periodNumber: number;
  if (day <= 15) {
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month, 15);
    periodNumber = 1;
  } else {
    startDate = new Date(year, month, 16);
    endDate = new Date(year, month + 1, 0);
    periodNumber = 2;
  }
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    periodNumber,
    label: `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`,
  };
}
function getMonthlyPeriod(date: Date): PayPeriod {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    periodNumber: month + 1,
    label: startDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}
function getWeekStart(date: Date, startDay: number): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = (dayOfWeek - startDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
