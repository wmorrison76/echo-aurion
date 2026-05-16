/** * Analytics endpoints: * - Interval coverage heatmap * - P&L drilldown * - Employee performance * - Echo insights */
import { Router } from "express";
import { getSupabase } from "../../lib/supabase";
import { computePerformanceForDept } from "../../services/performanceModel";
import { computeWeeklyKPI } from "../../services/metricsEngine";
const router = Router(); // Interval coverage heatmap
router.get("/interval-coverage", async (req, res) => {
  try {
    const { dept_id, date, interval } = req.query as any;
    if (!dept_id || !date) {
      return res.status(400).json({ error: "dept_id and date required" });
    }
    const rows = [
      { ts: `${date}T08:00:00`, required: 2, provided: 2 },
      { ts: `${date}T08:15:00`, required: 2, provided: 2 },
      { ts: `${date}T11:30:00`, required: 3, provided: 3 },
      { ts: `${date}T14:00:00`, required: 2, provided: 1 },
      { ts: `${date}T17:00:00`, required: 4, provided: 4 },
    ];
    res.json({ rows });
  } catch (err) {
    console.error("GET /interval-coverage error:", err);
    res.status(500).json({ error: String(err) });
  }
}); // P&L drilldown
router.get("/drilldown", async (req, res) => {
  try {
    const { org_id, outlet_id, dept_id, start, end } = req.query as any;
    const rows = [
      {
        ts: `${start}T08:00:00`,
        employee_name: "John Doe",
        position: "Server",
        hours: 8,
        cost: 120,
        revenue: 800,
        tips: 80,
      },
    ];
    res.json({ rows });
  } catch (err) {
    console.error("GET /drilldown error:", err);
    res.status(500).json({ error: String(err) });
  }
}); // Drilldown CSV export
router.get("/drilldown-csv", async (req, res) => {
  try {
    const csv = "ts,employee_name,position,hours,cost,revenue,tips\n";
    res.set("Content-Type", "text/csv");
    res.send(csv);
  } catch (err) {
    console.error("GET /drilldown-csv error:", err);
    res.status(500).json({ error: String(err) });
  }
}); // Employee performance
router.get("/performance", async (req, res) => {
  try {
    const { dept_id, start, end, includeTips } = req.query as any;
    if (!dept_id || !start || !end) {
      return res.status(400).json({ error: "Missing query params" });
    }
    const rows = await computePerformanceForDept(
      dept_id,
      start,
      end,
      includeTips === "1",
    );
    const supabase = getSupabase();
    let employees: any[] = [];
    if (supabase) {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name, role_title")
        .eq("dept_id", dept_id);
      employees = data || [];
    }
    res.json({ rows, employees });
  } catch (err) {
    console.error("GET /performance error:", err);
    res.status(500).json({ error: String(err) });
  }
}); // Echo insights
router.get("/echo-insights", async (req, res) => {
  try {
    const { org_id, outlet_id, dept_id, start, end } = req.query as any;
    const kpi = await computeWeeklyKPI({
      org_id,
      outlet_id,
      dept_id,
      week_start: start,
    });
    const rows: any[] = [];
    if (kpi.labor_pct > 35) {
      rows.push({
        ts: new Date().toISOString(),
        message: `Labor at ${kpi.labor_pct.toFixed(1)}% exceeds 35% budget`,
        severity: "warn",
      });
    }
    if (kpi.ot_risk_count > 2) {
      rows.push({
        ts: new Date().toISOString(),
        message: `${kpi.ot_risk_count} employees at OT risk`,
        severity: "critical",
      });
    }
    if (kpi.ack_rate_pct < 80) {
      rows.push({
        ts: new Date().toISOString(),
        message: `Only ${kpi.ack_rate_pct.toFixed(0)}% acknowledged schedule`,
        severity: "warn",
      });
    }
    res.json({ rows });
  } catch (err) {
    console.error("GET /echo-insights error:", err);
    res.status(500).json({ error: String(err) });
  }
});
export default router;
