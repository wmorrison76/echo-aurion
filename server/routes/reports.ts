import { Router, type Request, type Response } from "express";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { parseResortForecastCsv } from "../lib/resort-forecast-csv";
import { getSupabase } from "../../client/modules/Schedule/server/lib/supabase";
import { DAYS, dayTotals, weeklyHours, type EmployeeRow } from "../../client/modules/Schedule/client/lib/schedule";
import { analyzeWeek } from "../../client/modules/Schedule/server/services/complianceEngine";
import { computePerformanceForDept } from "../../client/modules/Schedule/server/services/performanceModel";
import { computeWeeklyKPI } from "../../client/modules/Schedule/server/services/metricsEngine";
import { getAckStatus } from "../../client/modules/Schedule/server/services/publish_workflow";
import { evaluateGuardrails } from "../../client/modules/Schedule/server/services/schedulerGuardrails";
import { REPORTS } from "../../client/modules/Schedule/client/components/reports/ReportCatalog";

const router = Router();

const ForecastQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const ReportRunSchema = z.object({
  reportId: z.string(),
  org_id: z.string().optional(),
  outlet_id: z.string().optional(),
  dept_id: z.string().optional(),
  week_start: z.string().optional(),
});

function weekBounds(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toWeekdayRange(start: Date) {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return toISODate(d);
  });
}

async function loadShifts(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  dept_id: string,
  week_start: string,
) {
  const { start, end } = weekBounds(week_start);
  const { data, error } = await supabase
    .from("shifts")
    .select("id, employee_id, starts_at, ends_at, break_min, published")
    .eq("dept_id", dept_id)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function loadRevenue(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  dept_id: string,
  week_start: string,
) {
  const { start, end } = weekBounds(week_start);
  const { data, error } = await supabase
    .from("revenues")
    .select("amount")
    .eq("dept_id", dept_id)
    .gte("business_date", toISODate(start))
    .lt("business_date", toISODate(end));
  if (error) throw error;
  return (data || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
}

async function loadEmployees(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  dept_id: string,
) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name, hourly_rate, rate, role_title")
    .eq("dept_id", dept_id);
  if (error) throw error;
  return data || [];
}

function buildCoverageFromEmployees(employees: EmployeeRow[]) {
  const totals = dayTotals(employees);
  const daily = DAYS.map((day) => ({
    day,
    hours: totals[day] || 0,
  }));
  return {
    totals,
    daily,
    totalHours: employees.reduce((sum, employee) => sum + weeklyHours(employee), 0),
  };
}

router.get("/catalog", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    reports: REPORTS.map((report) => ({
      id: report.id,
      title: report.title,
      tier: report.tier,
      topic: report.topic,
      description: report.description,
      status: report.status,
      destination: report.destination,
      keywords: report.keywords,
      notes: report.notes,
    })),
  });
});

router.get("/run", async (req: Request, res: Response) => {
  try {
    const input = ReportRunSchema.parse(req.query);
    const report = REPORTS.find((item) => item.id === input.reportId);
    if (!report) {
      return res.status(404).json({ ok: false, error: "Unknown report" });
    }

    const supabase = getSupabase();
    const weekStart = input.week_start || toISODate(new Date());
    const outletId = input.outlet_id || "";
    const deptId = input.dept_id || "";
    const orgId = input.org_id || "";
    const { start, end } = weekBounds(weekStart);

    if (!supabase) {
      return res.json({
        ok: true,
        reportId: report.id,
        title: report.title,
        generatedAt: new Date().toISOString(),
        data: {
          message: "Supabase not configured. Returning catalog-only result.",
        },
      });
    }

    switch (report.id) {
      case "schedule-coverage": {
        const shifts = await loadShifts(supabase, deptId, weekStart);
        const coverage = shifts.reduce(
          (acc, shift: any) => {
            const startHour = new Date(shift.starts_at).getHours();
            const bucket = startHour < 12 ? "morning" : startHour < 17 ? "midday" : "evening";
            acc[bucket] = (acc[bucket] || 0) + 1;
            return acc;
          },
          { morning: 0, midday: 0, evening: 0 } as Record<string, number>,
        );
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { weekStart, coverage, totalShifts: shifts.length, openCoverageGaps: Math.max(0, 7 - shifts.length) } });
      }
      case "open-shifts": {
        const shifts = await loadShifts(supabase, deptId, weekStart);
        const openShiftSuggestions = toWeekdayRange(start).filter((day) => {
          const dayCount = shifts.filter((shift: any) => toISODate(new Date(shift.starts_at)) === day).length;
          return dayCount < 2;
        }).map((day) => ({ day, suggestedOpenings: Math.max(1, 2 - shifts.filter((shift: any) => toISODate(new Date(shift.starts_at)) === day).length) }));
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { weekStart, openShiftSuggestions } });
      }
      case "approvals": {
        const { data: audits } = await supabase
          .from("publish_audits")
          .select("schedule_id, published_at, status, notes")
          .eq("outlet_id", outletId)
          .eq("dept_id", deptId)
          .gte("published_at", start.toISOString())
          .lt("published_at", end.toISOString())
          .order("published_at", { ascending: false });
        const latest = audits?.[0] || null;
        const ackStatus = latest?.schedule_id
          ? await getAckStatus({ schedule_id: String(latest.schedule_id) })
          : { total_employees: 0, acknowledged: 0, pending: 0, ack_rate: 0 };
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { latestAudit: latest, ackStatus } });
      }
      case "exceptions": {
        const findings = await analyzeWeek({ outlet_id: outletId, dept_id: deptId, week_start: weekStart });
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { findings, count: findings.length } });
      }
      case "overtime-risk": {
        const shifts = await loadShifts(supabase, deptId, weekStart);
        const hourlyRates: Record<string, number> = Object.fromEntries(
          (await loadEmployees(supabase, deptId)).map((emp: any) => [
            String(emp.id),
            Number(emp.hourly_rate ?? emp.rate ?? 0),
          ]),
        );
        const guardrails = evaluateGuardrails({
          shifts: shifts.map((shift: any) => ({
            employee_id: String(shift.employee_id),
            start: String(shift.starts_at),
            end: String(shift.ends_at),
            break_min: Number(shift.break_min || 0),
          })),
          hourlyRates,
          revenueTotal: 0,
        });
        const risks = guardrails.filter((finding) => finding.type === "OT_RISK");
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { risks, threshold: 40 } });
      }
      case "pto-status": {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const [pendingRes, blackoutRes] = await Promise.all([
          fetch(`${baseUrl}/api/pto/pending`),
          fetch(`${baseUrl}/api/pto/blackout-dates`),
        ]);
        const pending = pendingRes.ok ? await pendingRes.json() : { requests: [] };
        const blackout = blackoutRes.ok ? await blackoutRes.json() : { blackoutDates: [] };
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { pending, blackout } });
      }
      case "labor-vs-budget":
      case "labor-vs-revenue":
      case "labor-vs-contribution": {
        const revenue = await loadRevenue(supabase, deptId, weekStart);
        const employees = await loadEmployees(supabase, deptId);
        const shifts = await loadShifts(supabase, deptId, weekStart);
        const hourlyRates: Record<string, number> = Object.fromEntries(
          employees.map((emp: any) => [
            String(emp.id),
            Number(emp.hourly_rate ?? emp.rate ?? 0),
          ]),
        );
        const guardrails = evaluateGuardrails({
          shifts: shifts.map((shift: any) => ({
            employee_id: String(shift.employee_id),
            start: String(shift.starts_at),
            end: String(shift.ends_at),
            break_min: Number(shift.break_min || 0),
          })),
          hourlyRates,
          revenueTotal: revenue,
        });
        const laborCost = shifts.reduce((sum: number, shift: any) => {
          const startMs = new Date(shift.starts_at).getTime();
          const endMs = new Date(shift.ends_at).getTime();
          const hours = Math.max(0, (endMs - startMs) / 36e5 - Number(shift.break_min || 0) / 60);
          const rate = hourlyRates[String(shift.employee_id)] || 0;
          return sum + hours * rate;
        }, 0);
        const tips = 0;
        const laborPct = revenue ? ((laborCost + tips) / revenue) * 100 : 0;
        return res.json({
          ok: true,
          reportId: report.id,
          title: report.title,
          generatedAt: new Date().toISOString(),
          data: {
            revenue,
            laborCost,
            tips,
            laborPct,
            contribution: revenue - laborCost - tips,
            variance: revenue ? revenue - laborCost - tips : 0,
            findings: guardrails,
          },
        });
      }
      case "shift-demand-forecast": {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const forecastRes = await fetch(`${baseUrl}/api/forecast/summary?dept_id=${deptId}`);
        const forecast = forecastRes.ok ? await forecastRes.json() : { trend: "stable", confidence: 0 };
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: forecast });
      }
      case "staffing-curve-projection": {
        const shifts = await loadShifts(supabase, deptId, weekStart);
        const coverage = buildCoverageFromEmployees(
          shifts.map((shift: any) => ({
            id: String(shift.id),
            name: String(shift.employee_id),
            shifts: {
              Mon: { value: "", range: null, in: "", out: "", breakMin: 0, tip: 0 },
              Tue: { value: "", range: null, in: "", out: "", breakMin: 0, tip: 0 },
              Wed: { value: "", range: null, in: "", out: "", breakMin: 0, tip: 0 },
              Thu: { value: "", range: null, in: "", out: "", breakMin: 0, tip: 0 },
              Fri: { value: "", range: null, in: "", out: "", breakMin: 0, tip: 0 },
              Sat: { value: "", range: null, in: "", out: "", breakMin: 0, tip: 0 },
              Sun: { value: "", range: null, in: "", out: "", breakMin: 0, tip: 0 },
            },
          })) as unknown as EmployeeRow[],
        );
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { curve: coverage.daily, totalHours: coverage.totalHours } });
      }
      case "event-staffing-projection":
      case "prep-workload-projection": {
        let eventQuery = supabase.from("events").select("id, name, date, status, staffing_needs");
        if (orgId) {
          eventQuery = eventQuery.eq("org_id", orgId);
        }
        const { data: events } = await eventQuery.limit(100);
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { events: events || [], count: (events || []).length } });
      }
      case "manager-scheduling-performance": {
        const rows = await computePerformanceForDept(deptId, toISODate(start), toISODate(end), true);
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { rows } });
      }
      case "reliability-scoring": {
        const rows = await computePerformanceForDept(deptId, toISODate(start), toISODate(end), false);
        const reliability = rows.map((row) => ({ employee_id: row.employee_id, score: row.readiness_score, focus: row.focus_areas }));
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { reliability } });
      }
      case "compliance-violation-heatmap": {
        const findings = await analyzeWeek({ outlet_id: outletId, dept_id: deptId, week_start: weekStart });
        const heatmap = findings.reduce<Record<string, number>>((acc, finding) => {
          acc[finding.type] = (acc[finding.type] || 0) + 1;
          return acc;
        }, {});
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { heatmap, findings } });
      }
      case "schedule-publication-timeliness": {
        const kpi = await computeWeeklyKPI({ org_id: orgId, outlet_id: outletId, dept_id: deptId, week_start: weekStart });
        const ack = await getAckStatus({ schedule_id: `${outletId}-${deptId}-${weekStart}` }).catch(() => null);
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { kpi, ack } });
      }
      case "recipe-driven-staffing":
      case "beo-staffing-auto-projection":
      case "commissary-labor-allocation":
      case "station-workload-ai-prediction": {
        const { data: events } = await supabase.from("events").select("id, name, date, status, staffing_needs, recipe_count").eq("org_id", orgId || undefined).limit(100);
        const recommendations = (events || []).map((event: any) => ({
          id: event.id,
          name: event.name,
          date: event.date,
          demandSignal: Array.isArray(event.staffing_needs) ? event.staffing_needs.length : Number(event.recipe_count || 0),
        }));
        return res.json({ ok: true, reportId: report.id, title: report.title, generatedAt: new Date().toISOString(), data: { recommendations, events: events || [] } });
      }
      case "payroll-register":
      case "tip-runs":
      case "pnl-lite": {
        return res.status(400).json({ ok: false, error: "Use the download endpoints for CSV exports." });
      }
      default:
        return res.json({
          ok: true,
          reportId: report.id,
          title: report.title,
          generatedAt: new Date().toISOString(),
          data: { message: "Report routed but no dedicated runner exists yet." },
        });
    }
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Invalid request",
    });
  }
});

router.get("/21-day-forecast", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = ForecastQuerySchema.parse(req.query);
    const report = await parseResortForecastCsv();
    const days = report.days.filter((day) => {
      if (startDate && day.date < startDate) return false;
      if (endDate && day.date > endDate) return false;
      return true;
    });
    const groupBlocks = report.groupBlocks.filter((block) => {
      if (startDate && block.date < startDate) return false;
      if (endDate && block.date > endDate) return false;
      return true;
    });

    res.json({
      ok: true,
      startDate: startDate || report.startDate,
      endDate: endDate || report.endDate,
      days,
      groupBlocks,
      summary: report.totals,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Invalid request",
    });
  }
});

router.get("/payroll", async (req, res) => {
  try {
    const { outlet_id, dept_id, week_start } = req.query as any;
    if (!outlet_id || !dept_id || !week_start) {
      return res.status(400).json({ error: "outlet_id, dept_id, and week_start required" });
    }
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { start, end } = weekBounds(String(week_start));
    const { data, error } = await supabase
      .from("shifts")
      .select("employees(first_name, last_name, hourly_rate), starts_at, ends_at, break_min")
      .eq("outlet_id", outlet_id)
      .eq("dept_id", dept_id)
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString());
    if (error) throw error;
    const byEmp: Record<string, any> = {};
    for (const s of data || []) {
      const emp = s.employees as any;
      const key = `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim();
      if (!byEmp[key]) {
        byEmp[key] = {
          first_name: emp?.first_name || "",
          last_name: emp?.last_name || "",
          hourly_rate: emp?.hourly_rate || 0,
          hours: 0,
        };
      }
      const hours = (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 3600000 - (s.break_min || 0) / 60;
      byEmp[key].hours += Math.max(0, hours);
    }
    const rows = Object.values(byEmp);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="payroll_${week_start}.csv"`);
    res.send(["first_name,last_name,hourly_rate,hours", ...rows.map((r: any) => `${r.first_name},${r.last_name},${r.hourly_rate},${r.hours.toFixed(2)}`)].join("\n"));
  } catch (err: any) {
    console.error("Payroll report error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/tips", async (req, res) => {
  try {
    const { dept_id, start, end } = req.query as any;
    if (!dept_id || !start || !end) {
      return res.status(400).json({ error: "dept_id, start, and end required" });
    }
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { data, error } = await supabase
      .from("tip_run_lines")
      .select("tip_runs(business_date), employee_id, payout")
      .gte("tip_runs.business_date", start)
      .lte("tip_runs.business_date", end);
    if (error) throw error;
    const rows = (data || [])
      .filter((row: any) => row.tip_runs?.business_date)
      .map((row: any) => ({
        business_date: row.tip_runs.business_date,
        employee_id: row.employee_id,
        payout: row.payout,
      }));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="tips_${start}_${end}.csv"`);
    res.send(["business_date,employee_id,payout", ...rows.map((r: any) => `${r.business_date},${r.employee_id},${r.payout}`)].join("\n"));
  } catch (err: any) {
    console.error("Tips report error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/pnl-lite", async (req, res) => {
  try {
    const { org_id, week_start } = req.query as any;
    if (!org_id || !week_start) {
      return res.status(400).json({ error: "org_id and week_start required" });
    }
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { start, end } = weekBounds(String(week_start));
    const { data: depts, error: deptsError } = await supabase
      .from("departments")
      .select("id, name, outlets(id)")
      .eq("outlets.org_id", org_id);
    if (deptsError) throw deptsError;
    const rows = [] as any[];
    for (const dept of depts || []) {
      const { data: revData } = await supabase
        .from("revenues")
        .select("amount")
        .eq("dept_id", dept.id)
        .gte("business_date", toISODate(start))
        .lt("business_date", toISODate(end));
      const revenue = (revData || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      const { data: shiftsData } = await supabase
        .from("shifts")
        .select("starts_at, ends_at, break_min")
        .eq("dept_id", dept.id)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString());
      let reg_hours = 0, ot_hours = 0;
      for (const s of shiftsData || []) {
        const hours = (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 3600000 - (s.break_min || 0) / 60;
        const h = Math.max(0, hours);
        reg_hours += Math.min(40, h);
        ot_hours += Math.max(0, h - 40);
      }
      const { data: tipsData } = await supabase.from("tip_run_lines").select("payout");
      const tips = (tipsData || []).reduce((s: number, r: any) => s + (Number(r.payout) || 0), 0);
      rows.push({ dept_id: dept.id, dept_name: dept.name, revenue, reg_hours, ot_hours, tips, labor_pct: revenue ? ((reg_hours + ot_hours) * 25 / revenue) * 100 : 0 });
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="pnl_lite_${week_start}.csv"`);
    res.send(["dept_id,dept_name,revenue,reg_hours,ot_hours,tips,labor_pct", ...rows.map((r) => `${r.dept_id},${r.dept_name},${r.revenue},${r.reg_hours.toFixed(2)},${r.ot_hours.toFixed(2)},${r.tips.toFixed(2)},${r.labor_pct.toFixed(2)}`)].join("\n"));
  } catch (err: any) {
    console.error("P&L-lite report error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
