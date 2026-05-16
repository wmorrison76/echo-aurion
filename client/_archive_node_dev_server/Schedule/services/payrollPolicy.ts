/** * Payroll & compliance helpers * Calculates regular + OT hours with support for daily and weekly thresholds */ export interface PayrollPolicy {
  weekly_ot_threshold: number; // hours, typically 40 daily_ot_threshold?: number; // hours, optional dt_threshold?: number; // double-time threshold, optional ot_multiplier: number; // typically 1.5 dt_multiplier: number; // typically 2.0
}
export interface PayComponent {
  kind: "regular" | "overtime" | "doubletime";
  hours: number;
  rate: number;
  amount: number;
}
export interface PayrollResult {
  regular: number;
  overtime: number;
  doubletime: number;
  totalHours: number;
  totalPay: number;
  components: PayComponent[];
} /** * Calculate hours between two timestamps, accounting for break time */
export function calculateHours(
  startISO: string,
  endISO: string,
  breakMin: number = 0,
): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, diffHours - breakMin / 60);
} /** * Compute payroll for a single shift */
export function computePayroll(
  hours: number,
  rate: number,
  policy: PayrollPolicy = {
    weekly_ot_threshold: 40,
    ot_multiplier: 1.5,
    dt_multiplier: 2.0,
  },
): { regularPay: number; otPay: number; dtPay: number; totalPay: number } {
  const regular = Math.min(hours, 40);
  const overtime = Math.max(0, hours - 40);
  return {
    regularPay: regular * rate,
    otPay: overtime * rate * (policy.ot_multiplier || 1.5),
    dtPay: 0,
    totalPay: regular * rate + overtime * rate * (policy.ot_multiplier || 1.5),
  };
} /** * Apply full payroll policy with daily and weekly OT thresholds */
export function applyPolicy(config: {
  daily: number[]; // hours per day baseRate: number; currency?: string; policy: PayrollPolicy;
}): PayrollResult {
  const { daily, baseRate, policy } = config;
  const components: PayComponent[] = [];
  let reg = 0,
    ot = 0,
    dt = 0;
  let weeklyHours = 0; // Process each day for (const h of daily) { let rem = h; // Double-time threshold (if configured) const dtThresh = policy.dt_threshold ?? Infinity; if (rem > dtThresh) { const dth = rem - dtThresh; rem -= dth; dt += dth; components.push({ kind:"doubletime", hours: dth, rate: baseRate * policy.dt_multiplier, amount: dth * baseRate * policy.dt_multiplier, }); } // Daily overtime threshold (if configured) const dailyOT = policy.daily_ot_threshold ?? Infinity; if (rem > dailyOT) { const oth = rem - dailyOT; rem -= oth; ot += oth; components.push({ kind:"overtime", hours: oth, rate: baseRate * policy.ot_multiplier, amount: oth * baseRate * policy.ot_multiplier, }); } // Remaining hours are regular if (rem > 0) { reg += rem; components.push({ kind:"regular", hours: rem, rate: baseRate, amount: rem * baseRate, }); } weeklyHours += h; } // Apply weekly OT threshold (override daily calculations if stricter) if (weeklyHours > policy.weekly_ot_threshold) { const extra = weeklyHours - policy.weekly_ot_threshold; const shift = Math.min(extra, reg); if (shift > 0) { reg -= shift; ot += shift; // Adjust components: convert last regular chunks to OT let remaining = shift; for (let i = components.length - 1; i >= 0 && remaining > 0; i--) { const c = components[i]; if (c.kind ==="regular") { const take = Math.min(c.hours, remaining); c.hours -= take; c.amount -= take * c.rate; remaining -= take; components.splice(i + 1, 0, { kind:"overtime", hours: take, rate: baseRate * policy.ot_multiplier, amount: take * baseRate * policy.ot_multiplier, }); } } } } const totalPay = components.reduce((s, c) => s + c.amount, 0); const totalHours = reg + ot + dt; return { regular: reg, overtime: ot, doubletime: dt, totalHours, totalPay, components, };
} /** * Calculate predictability pay (for late schedule changes) * Returns additional hours owed if schedule changed < threshold hours before shift */
export function predictabilityPay(
  changeHours: number,
  threshold: number = 24,
): number {
  // Returns extra hours owed if change was within threshold return changeHours < threshold ? 1 : 0;
}
