/** * simulate-forecast.ts * Generates interval demand snapshots for one week so heatmaps & charts light up. */
import { getSupabase } from "../server/lib/supabase";
import { addMinutes, startOfDay } from "date-fns";
async function main() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error("Supabase not configured");
    process.exit(1);
  }
  const { data: depts } = await supabase
    .from("departments")
    .select("id, name")
    .limit(1);
  if (!depts || depts.length === 0) {
    console.error("No departments found; run seed-infinity first.");
    process.exit(1);
  }
  const dept = depts[0];
  const startDate = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(startDate.getTime() + d * 86400000);
    await upsertDay(supabase, dept.id, date, 15);
  }
  console.log(`✅ Simulated interval coverage for dept ${dept.name}.`);
  process.exit(0);
}
async function upsertDay(
  supabase: any,
  dept_id: string,
  date: Date,
  interval = 15,
) {
  const openH = 7,
    closeH = 23;
  const start = new Date(startOfDay(date));
  start.setHours(openH, 0, 0, 0);
  const end = new Date(startOfDay(date));
  end.setHours(closeH, 0, 0, 0);
  const points: { ts: string; required: number; provided: number }[] = [];
  for (let t = new Date(start); t < end; t = addMinutes(t, interval)) {
    const mins = t.getHours() * 60 + t.getMinutes();
    const mid = openH * 60 + (closeH - openH) * 60 * 0.65;
    const sigma = 120;
    const weight = Math.exp(-0.5 * Math.pow((mins - mid) / sigma, 2));
    const required = Math.max(
      0,
      Math.round(weight * 8) + (Math.random() < 0.1 ? 1 : 0),
    );
    const provided = Math.max(
      0,
      required + (Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0),
    );
    points.push({ ts: t.toISOString(), required, provided });
  }
  const isoDate = date.toISOString().slice(0, 10);
  for (const p of points) {
    await supabase
      .from("interval_coverage")
      .upsert({
        org_id: "org-1",
        outlet_id: "outlet-1",
        dept_id,
        week_start: isoDate,
        ts: p.ts,
        required: p.required,
        provided: p.provided,
      })
      .catch(() => {});
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
