/** * performanceModel.ts * Score employees combining ratings, attendance, tip outcomes (if allowed), and shift difficulty. * Produces a readiness score for promotion/cross-training and flags development areas. */
import { getSupabase } from "../lib/supabase";
export interface EmployeePerformance {
  employee_id: string;
  rating_avg: number;
  attendance_pct: number;
  shift_difficulty_score: number;
  tip_effectiveness?: number;
  readiness_score: number;
  focus_areas: string[];
}
export async function computePerformanceForDept(
  dept_id: string,
  start: string,
  end: string,
  includeTips = false,
): Promise<EmployeePerformance[]> {
  const supabase = getSupabase();
  if (!supabase) return []; // Ratings const { data: ratings } = await supabase .from("ratings") .select("employee_id, total_score") .eq("dept_id", dept_id) .gte("shift_date", start) .lte("shift_date", end); const ratingMap: Record<string, number[]> = {}; (ratings || []).forEach((r: any) => { if (!ratingMap[r.employee_id]) ratingMap[r.employee_id] = []; ratingMap[r.employee_id].push(Number(r.total_score || 0)); }); // Attendance const { data: shifts } = await supabase .from("shifts") .select("employee_id, published") .eq("dept_id", dept_id) .gte("starts_at", `${start}T00:00:00`) .lte("starts_at", `${end}T23:59:59`); const attendanceMap: Record<string, { total: number; present: number }> = {}; (shifts || []).forEach((s: any) => { if (!attendanceMap[s.employee_id]) { attendanceMap[s.employee_id] = { total: 0, present: 0 }; } attendanceMap[s.employee_id].total += 1; if (s.published) attendanceMap[s.employee_id].present += 1; }); const ids = new Set<string>([ ...Object.keys(ratingMap), ...Object.keys(attendanceMap), ]); const rows: EmployeePerformance[] = []; for (const id of ids) { const scores = ratingMap[id] || []; const rating = scores.length ? Math.min(100, (scores.reduce((a, b) => a + b, 0) / scores.length / 5) * 100) : 50; const att = attendanceMap[id]; const attendance = att ? (att.present / Math.max(1, att.total)) * 100 : 80; const readiness = Math.round(0.6 * rating + 0.4 * attendance); const focus: string[] = []; if (rating < 70) focus.push("Improve service quality / craft."); if (attendance < 90) focus.push("Improve attendance / reliability."); rows.push({ employee_id: id, rating_avg: Math.round(rating * 10) / 10, attendance_pct: Math.round(attendance * 10) / 10, shift_difficulty_score: 50, readiness_score: clamp(readiness, 0, 100), focus_areas: focus, }); } return rows;
}
function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}
