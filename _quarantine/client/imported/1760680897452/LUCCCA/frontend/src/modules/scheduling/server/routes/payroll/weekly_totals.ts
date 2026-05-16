import express from "express";
import { getWeeklyTotals, type ScheduleEmployee } from "../../services/payroll/aggregator";
import { exportForVendor } from "../../services/payroll/exporters";

export const weeklyTotalsRouter = express.Router();

// GET /api/payroll/weekly_totals?start=2025-01-06&currency=USD
weeklyTotalsRouter.get("/weekly_totals", async (req, res) => {
  try {
    const start = (req.query.start as string) || new Date().toISOString().slice(0,10);
    const currency = ((req.query.currency as string) || "USD").toUpperCase();
    const tz = (req.query.tz as string) || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    // Optional: accept schedule data from query/body for real data integration
    let scheduleData: ScheduleEmployee[] | undefined;
    try {
      const scheduleJson = req.query.schedule as string | undefined;
      if (scheduleJson) {
        scheduleData = JSON.parse(scheduleJson);
      }
    } catch (e) {
      // Ignore parse errors, fall back to mock data
    }

    const data = await getWeeklyTotals({ startISO: start, currency: currency as any, tz }, scheduleData);

    // CSV export when vendor provided
    const vendor = req.query.vendor as string | undefined;
    if (vendor) {
      const csv = exportForVendor(vendor, data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=weekly_totals_${start}_${vendor}.csv`);
      return res.send(csv);
    }

    res.json(data);
  } catch (err: any) {
    console.error("weekly_totals error", err);
    res.status(500).json({ error: err?.message || "Internal Server Error" });
  }
});

// POST /api/payroll/weekly_totals for real-time schedule data
weeklyTotalsRouter.post("/weekly_totals", async (req, res) => {
  try {
    const { start, currency = "USD", tz, schedule } = req.body;

    if (!start) {
      return res.status(400).json({ error: "start date required" });
    }

    const data = await getWeeklyTotals(
      { startISO: start, currency: currency.toUpperCase() as any, tz: tz || "UTC" },
      schedule as ScheduleEmployee[] | undefined
    );

    res.json(data);
  } catch (err: any) {
    console.error("weekly_totals POST error", err);
    res.status(500).json({ error: err?.message || "Internal Server Error" });
  }
});
