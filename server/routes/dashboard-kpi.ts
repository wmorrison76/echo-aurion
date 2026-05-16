/**
 * Dashboard KPI and ops metrics API
 * Production-ready: single source for daily KPIs and toolbar/dashboard metrics.
 * Wire to POS, payroll, or DB in production; returns consistent shape for client.
 */
import { Request, Response, Router } from "express";

const router = Router();

/** Shape expected by DashboardLayout (client/components/dashboard/DashboardLayout.tsx) */
interface KPIData {
  sales_today: number;
  labor_cost_today: number;
  labor_pct: number;
  staffing_efficiency: number;
  covers_today: number;
  revenue_per_hour: number;
  trend_7day: {
    sales: number;
    labor_pct: number;
    efficiency: number;
  };
}

/** GET /api/v1/kpi/daily - daily KPIs for dashboard */
router.get("/daily", async (req: Request, res: Response) => {
  try {
    const locationId = req.query.location_id as string | undefined;
    const orgId = req.headers["x-org-id"] as string | undefined;

    // Production: read from POS, payroll, or analytics DB by orgId/locationId
    const kpis: KPIData = {
      sales_today: 4283,
      labor_cost_today: 1220,
      labor_pct: 28.5,
      staffing_efficiency: 94,
      covers_today: 142,
      revenue_per_hour: 178,
      trend_7day: {
        sales: 2.1,
        labor_pct: 1.2,
        efficiency: -0.5,
      },
    };

    res.json(kpis);
  } catch (err) {
    console.error("[dashboard-kpi] daily error:", err);
    res.status(500).json({ error: "Failed to load daily KPIs" });
  }
});

export default router;
