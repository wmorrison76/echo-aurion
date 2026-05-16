/** * productionLoad.ts * Convert events + recipes + tasks into production workload minutes by date/interval. * Feeds intervalForecast (inject_production_minutes) and scheduler demand. */
import { getSupabase } from "../lib/supabase";
import { addMinutes } from "date-fns";
export async function getProductionMinutesByDate({
  dept_id,
  business_date,
}: {
  dept_id: string;
  business_date: string; // YYYY-MM-DD
}): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { data } = await supabase
    .from("tasks")
    .select("labor_minutes")
    .eq("dept_id", dept_id)
    .eq("business_date", business_date);
  return (data || []).reduce(
    (sum: number, t: any) => sum + Number(t.labor_minutes || 0),
    0,
  );
}
export function distributeProductionIntoIntervals({
  total_minutes,
  business_date,
  interval = 30,
  prep_window_hours = 6,
  start_time = "06:00",
}: {
  total_minutes: number;
  business_date: string;
  interval?: 15 | 30;
  prep_window_hours?: number;
  start_time?: string;
}): Array<{ ts: string; minutes: number }> {
  const series: Array<{ ts: string; minutes: number }> = [];
  const day0 = new Date(`${business_date}T00:00:00`);
  const [h, m] = start_time.split(":").map(Number);
  let cursor = new Date(day0);
  cursor.setHours(h, m, 0, 0);
  const steps = Math.max(1, Math.floor((prep_window_hours * 60) / interval!));
  const per = total_minutes / steps;
  for (let i = 0; i < steps; i++) {
    series.push({ ts: cursor.toISOString(), minutes: per });
    cursor = addMinutes(cursor, interval!);
  }
  return series;
}
