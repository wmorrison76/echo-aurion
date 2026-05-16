/**
 * Compliance Engine
 * - Predictability pay exposure on late changes/publishes
 * - Rest period violations
 * - Weekly OT threshold warnings
 */
import { supabase } from "../lib/db";

export interface ComplianceFinding {
  type: "PREDICTABILITY_PAY" | "REST_VIOLATION" | "OT_RISK";
  employee_id: string;
  shift_id?: string;
  detail: string;
  exposure_hours?: number;
  occurred_at: string;
}

export async function analyzeWeek({
  outlet_id,
  dept_id,
  week_start,
  predictability_threshold_hours = 24,
  min_rest_hours = 10,
  weekly_ot_threshold = 40,
}: {
  outlet_id: string;
  dept_id: string;
  week_start: string;
  predictability_threshold_hours?: number;
  min_rest_hours?: number;
  weekly_ot_threshold?: number;
}): Promise<ComplianceFinding[]> {
  const findings: ComplianceFinding[] = [];

  try {
    const weekStart = new Date(week_start);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data: shiftsData, error: shiftsError } = await supabase
      .from("shifts")
      .select("*")
      .eq("outlet_id", outlet_id)
      .eq("dept_id", dept_id)
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .order("employee_id")
      .order("starts_at");

    if (shiftsError) throw shiftsError;
    const shifts = shiftsData || [];

    const { data: auditsData, error: auditsError } = await supabase
      .from("publish_audits")
      .select("*")
      .eq("outlet_id", outlet_id)
      .eq("dept_id", dept_id)
      .gte("published_at", weekStart.toISOString())
      .lt("published_at", weekEnd.toISOString());

    if (auditsError) throw auditsError;
    const audits = auditsData || [];
    const publishedAt = audits.length > 0 ? new Date(audits[0].published_at).getTime() : null;

    if (publishedAt) {
      for (const s of shifts) {
        const start = new Date(s.starts_at).getTime();
        const hours = (start - publishedAt) / 3600000;
        if (hours < predictability_threshold_hours && !s.published) {
          findings.push({
            type: "PREDICTABILITY_PAY",
            employee_id: s.employee_id,
            shift_id: s.id,
            detail: `Shift published ${hours.toFixed(1)}h before start (< ${predictability_threshold_hours}h threshold).`,
            exposure_hours: 1,
            occurred_at: new Date().toISOString(),
          });
        }
      }
    }

    const byEmp: Record<string, any[]> = {};
    for (const s of shifts) {
      if (!byEmp[s.employee_id]) byEmp[s.employee_id] = [];
      byEmp[s.employee_id].push(s);
    }

    Object.values(byEmp).forEach((arr) => {
      arr.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      for (let i = 1; i < arr.length; i++) {
        const prevEnd = new Date(arr[i - 1].ends_at).getTime();
        const nextStart = new Date(arr[i].starts_at).getTime();
        const restHrs = (nextStart - prevEnd) / 3600000;
        if (restHrs < min_rest_hours) {
          findings.push({
            type: "REST_VIOLATION",
            employee_id: arr[i].employee_id,
            shift_id: arr[i].id,
            detail: `Only ${restHrs.toFixed(1)}h rest between shifts (< ${min_rest_hours}h).`,
            occurred_at: new Date().toISOString(),
          });
        }
      }
    });

    const hoursPerEmp: Record<string, number> = {};
    for (const s of shifts) {
      const startTime = new Date(s.starts_at).getTime();
      const endTime = new Date(s.ends_at).getTime();
      const breakMin = s.break_min || 0;
      const hrs = (endTime - startTime) / 3600000 - breakMin / 60;
      hoursPerEmp[s.employee_id] = (hoursPerEmp[s.employee_id] || 0) + Math.max(0, hrs);
    }

    Object.entries(hoursPerEmp).forEach(([emp, hrs]) => {
      if (hrs > weekly_ot_threshold) {
        findings.push({
          type: "OT_RISK",
          employee_id: emp,
          detail: `Scheduled ${hrs.toFixed(1)}h (> ${weekly_ot_threshold}h weekly OT threshold).`,
          occurred_at: new Date().toISOString(),
        });
      }
    });

    return findings;
  } catch (err) {
    console.error("Compliance analysis error:", err);
    return [];
  }
}

export async function recordAcknowledgement({
  employee_id,
  outlet_id,
  dept_id,
  week_start,
}: {
  employee_id: string;
  outlet_id: string;
  dept_id: string;
  week_start: string;
}) {
  try {
    const { error } = await supabase.from("publish_acknowledgements").upsert(
      {
        employee_id,
        outlet_id,
        dept_id,
        week_start,
        acknowledged_at: new Date().toISOString(),
      },
      {
        onConflict: "employee_id,outlet_id,dept_id,week_start",
      },
    );

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error("Acknowledgement recording error:", err);
    return { ok: false, error: err };
  }
}
