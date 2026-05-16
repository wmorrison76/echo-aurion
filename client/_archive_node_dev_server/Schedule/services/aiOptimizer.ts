/** * aiOptimizer – numerical reasoning layer for EchoAI * Computes workload balance, SPLH, and forecasts from raw data. */ export interface OptimizationSummary {
  totalHours: number;
  totalRevenue: number;
  splh: number;
  laborVariance: number;
  workloadDeficit: number;
  avgHoursPerDay: number;
  avgRevenuePerDay: number;
  staffCount: number;
}
export interface OptimizationResult {
  summary: OptimizationSummary;
  recommendations: string[];
} /** * Calculate hours from shift timestamps */
function hoursFromShift(shift: any): number {
  const start = new Date(shift.starts_at).getTime();
  const end = new Date(shift.ends_at).getTime();
  const breakMs = (shift.break_min || 0) * 60 * 1000;
  return (end - start - breakMs) / (1000 * 60 * 60);
} /** * Generate optimization metrics from raw data */
export async function generateOptimization(
  shifts: any[],
  revenues: any[],
  events: any[],
): Promise<OptimizationResult> {
  // Calculate total hours const totalHours = shifts.reduce((s, sh) => { return s + hoursFromShift(sh); }, 0); // Calculate total revenue const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount || 0), 0); // SPLH (Sales Per Labor Hour) const splh = totalHours > 0 ? totalRevenue / totalHours : 0; // Labor variance (std dev of daily SPLH) const dailySPLH: Record<string, { hours: number; revenue: number }> = {}; shifts.forEach((sh) => { const day = new Date(sh.starts_at).toDateString(); if (!dailySPLH[day]) dailySPLH[day] = { hours: 0, revenue: 0 }; dailySPLH[day].hours += hoursFromShift(sh); }); revenues.forEach((r) => { const day = new Date(r.business_date).toDateString(); if (!dailySPLH[day]) dailySPLH[day] = { hours: 0, revenue: 0 }; dailySPLH[day].revenue += Number(r.amount || 0); }); const splhValues = Object.values(dailySPLH) .filter((d) => d.hours > 0) .map((d) => d.revenue / d.hours); const meanSPLH = splhValues.length > 0 ? splhValues.reduce((s, v) => s + v, 0) / splhValues.length : 0; const laborVariance = splhValues.length > 0 ? Math.sqrt( splhValues.reduce((s, v) => s + Math.pow(v - meanSPLH, 2), 0) / splhValues.length ) : 0; // Workload deficit (event complexity vs. available hours) const totalEventLoad = events.reduce((s, e) => { return s + (Number(e.complexity_score || 0) * (e.guest_count || 0)) / 10; }, 0); const workloadDeficit = Math.max(0, totalEventLoad - totalHours); // Summary metrics const uniqueDays = Object.keys(dailySPLH).length; const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0; const avgRevenuePerDay = uniqueDays > 0 ? totalRevenue / uniqueDays : 0; // Unique staff count (approximation from shifts) const staffSet = new Set(shifts.map((s) => s.employee_id)); const staffCount = staffSet.size; const summary: OptimizationSummary = { totalHours, totalRevenue, splh, laborVariance, workloadDeficit, avgHoursPerDay, avgRevenuePerDay, staffCount, }; // Generate recommendations based on metrics const recommendations: string[] = []; if (splh < 50) { recommendations.push( `Low SPLH ($${splh.toFixed(2)}/hour) - Consider reducing labor hours or increasing pricing` ); } else if (splh > 200) { recommendations.push( `High SPLH ($${splh.toFixed(2)}/hour) - Opportunity to increase staffing for better service` ); } if (laborVariance > 30) { recommendations.push( `High daily variance (σ=$${laborVariance.toFixed(2)}) - Stabilize staffing patterns` ); } if (workloadDeficit > totalHours * 0.2) { recommendations.push( `Significant workload deficit (${workloadDeficit.toFixed(0)} hours) - Events may be understaffed` ); } if (staffCount < 5) { recommendations.push("Small team size - Consider cross-training for flexibility" ); } if (recommendations.length === 0) { recommendations.push("Metrics look stable - continue current staffing plan"); } return { summary, recommendations };
} /** * Forecast labor needs based on forecasted revenue */
export function forecastLabor(
  historicalSplh: number,
  forecastedRevenue: number,
  safetyMargin: number = 1.1,
): number {
  if (historicalSplh <= 0) return 0;
  const baseHours = forecastedRevenue / historicalSplh;
  return baseHours * safetyMargin;
} /** * Forecast revenue based on historical SPLH and available labor */
export function forecastRevenue(
  historicalSplh: number,
  availableHours: number,
): number {
  return historicalSplh * availableHours;
}
