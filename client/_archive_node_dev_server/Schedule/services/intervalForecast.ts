/** * intervalForecast.ts * Build 15/30-minute demand curves from: * - revenues (actual/forecast) * - POS service mix (if available) * - events/production workload (optional injection) * * Output: Array<{ ts: string (ISO), headcount: number, revenue: number }> */
import { getSupabase } from "../lib/supabase";
import { addMinutes } from "date-fns";
export type Interval = 15 | 30;
export interface IntervalForecastParams {
  org_id: string;
  outlet_id: string;
  dept_id: string;
  business_date: string; // YYYY-MM-DD interval: Interval; // 15 or 30 service_hours?: { open: string; close: string }; //"08:00","23:00" smoothing?: number; // 0..1 EMA smoothing for historical blend (default 0.35) splh_target?: number; // optional per-dept SPLH goal for headcount suggestion inject_production_minutes?: number; // aggregate extra minutes to distribute across prep window
}
export interface IntervalPoint {
  ts: string; // ISO timestamp revenue: number; // $ predicted for interval headcount: number; // suggested staff to hit SPLH / service norm
}
const DEFAULT_HOURS = { open: "07:00", close: "23:00" };
function timeToMinutes(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}
export async function buildIntervalForecast(
  p: IntervalForecastParams,
): Promise<IntervalPoint[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const smoothing = p.smoothing ?? 0.35;
  const hours = p.service_hours ?? DEFAULT_HOURS;
  const openM = timeToMinutes(hours.open);
  const closeM = timeToMinutes(hours.close);
  const step = p.interval;
  const day0 = new Date(`${p.business_date}T00:00:00`);
  const start = addMinutes(day0, openM);
  const end = addMinutes(day0, closeM); // 1) Pull recent revenue pattern for this dept (last 6 comparable weekdays) const { data: hist } = await supabase .from("revenues") .select("business_date, amount") .eq("dept_id", p.dept_id) .lt("business_date", p.business_date) .order("business_date", { ascending: false }) .limit(6); const histTotals = (hist || []) .reduce( (acc: Record<string, number>, r: any) => { const date = r.business_date; acc[date] = (acc[date] || 0) + Number(r.amount || 0); return acc; }, {} ); const emaBase = ema(Object.values(histTotals), smoothing); // 2) Use the latest total revenue forecast/actual for the day const { data: today } = await supabase .from("revenues") .select("amount") .eq("dept_id", p.dept_id) .eq("business_date", p.business_date); const todayTotal = (today || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0) || emaBase; // 3) Build a bell-ish distribution across open→close using simple piecewise curve const intervals: IntervalPoint[] = []; let cursor = start; const minsSpan = closeM - openM; const mid = openM + minsSpan * 0.6; // skew to dinner const sigma = Math.max(60, minsSpan * 0.22); const k = gaussianNorm(minsSpan, sigma, step); while (cursor < end) { const m = cursor.getHours() * 60 + cursor.getMinutes(); const weight = Math.exp(-0.5 * Math.pow((m - mid) / sigma, 2)); // bell intervals.push({ ts: cursor.toISOString(), revenue: weight, headcount: 0 }); cursor = addMinutes(cursor, step); } // normalize weights to match todayTotal const sumW = intervals.reduce((s, x) => s + x.revenue, 0) || 1; intervals.forEach((x) => (x.revenue = ((x.revenue / sumW) * todayTotal * k) || 0)); // 4) Optional production injection (e.g., pastry prep minutes) if (p.inject_production_minutes && p.inject_production_minutes > 0) { const half = Math.floor(intervals.length * 0.5); const per = p.inject_production_minutes / half; for (let i = 0; i < half; i++) { const splh = p.splh_target || 100; const revEq = (per / 60) * splh; intervals[i].revenue += revEq; } } // 5) Convert revenue into headcount suggestion using SPLH const splh = p.splh_target || 100; intervals.forEach((x) => { const hrsNeeded = x.revenue / splh; const intervalHours = step / 60; x.headcount = Math.max(0, Math.round(hrsNeeded / intervalHours)); }); return intervals;
}
function ema(vals: number[], a = 0.35) {
  if (vals.length === 0) return 0;
  let y = vals[0];
  for (let i = 1; i < vals.length; i++) y = a * vals[i] + (1 - a) * y;
  return y;
}
function gaussianNorm(minsSpan: number, sigma: number, step: number) {
  const n = Math.ceil(minsSpan / step);
  return Math.min(1.2, Math.max(0.85, n / (minsSpan / 15)));
}
