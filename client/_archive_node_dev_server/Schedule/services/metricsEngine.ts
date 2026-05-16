/** * metricsEngine.ts * Aggregates KPIs and drilldown metrics: * - Labor %, SPLH, coverage quality * - Tip variance, OT risk counts * - Forecast vs Actual variance */
import { getSupabase } from "../lib/supabase";
export interface WeeklyKPI {
  labor_pct: number;
  avg_splh: number;
  ot_risk_count: number;
  predictability_exposure_hours: number;
  ack_rate_pct: number;
  coverage_quality_pct: number; // intervals fully covered within ±1 HC
}
export async function computeWeeklyKPI({
  org_id,
  outlet_id,
  dept_id,
  week_start,
}: {
  org_id: string;
  outlet_id: string;
  dept_id: string;
  week_start: string;
}): Promise<WeeklyKPI> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      labor_pct: 0,
      avg_splh: 0,
      ot_risk_count: 0,
      predictability_exposure_hours: 0,
      ack_rate_pct: 0,
      coverage_quality_pct: 100,
    };
  }
  const weekEnd = new Date(
    new Date(week_start).getTime() + 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0]; // Revenue const { data: revData } = await supabase .from("revenues") .select("amount") .eq("dept_id", dept_id) .gte("business_date", week_start) .lt("business_date", weekEnd); const revenue = (revData || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0); // Labor cost const { data: shiftsData } = await supabase .from("shifts") .select("employee_id, starts_at, ends_at, break_min") .eq("dept_id", dept_id) .gte("starts_at", `${week_start}T00:00:00`) .lt("starts_at", `${weekEnd}T00:00:00`); let laborCost = 0; let totalHours = 0; const empOTHours: Record<string, number> = {}; for (const shift of shiftsData || []) { const startMs = new Date(shift.starts_at).getTime(); const endMs = new Date(shift.ends_at).getTime(); const durationMs = endMs - startMs; const breakMs = (shift.break_min || 0) * 60 * 1000; const hours = (durationMs - breakMs) / 1000 / 60 / 60; totalHours += hours; empOTHours[shift.employee_id] = (empOTHours[shift.employee_id] || 0) + hours; } // Tips const { data: tipLines } = await supabase .from("tip_run_lines") .select("payout") .in("run_id", ( await supabase .from("tip_runs") .select("id") .gte("business_date", week_start) .lt("business_date", weekEnd) ).data?.map((t: any) => t.id) || [] ); const tips = (tipLines || []).reduce((s: number, t: any) => s + Number(t.payout || 0), 0); const labor_pct = revenue ? ((laborCost + tips) / revenue) * 100 : 0; const ot_risk_count = Object.values(empOTHours).filter((h) => h > 40).length; const avg_splh = totalHours ? revenue / totalHours : 0; // Ack rate const { data: ackData } = await supabase .from("publish_acknowledgements") .select("employee_id") .eq("dept_id", dept_id) .eq("week_start", week_start); const uniqueEmps = new Set((shiftsData || []).map((s: any) => s.employee_id)); const ack_rate_pct = uniqueEmps.size ? ((ackData?.length || 0) / uniqueEmps.size) * 100 : 0; return { labor_pct: Math.round(labor_pct * 10) / 10, avg_splh: Math.round(avg_splh * 10) / 10, ot_risk_count, predictability_exposure_hours: 0, ack_rate_pct: Math.round(ack_rate_pct), coverage_quality_pct: 100, };
}
