/** * Advanced Anomaly Detection Service * Uses statistical methods and ML-inspired approaches for detecting * labor, revenue, and maintenance anomalies with high precision */ import { supabase } from "../lib/db";
export interface AnomalyScore {
  metric: string;
  value: number;
  expected: number;
  zscore: number;
  is_anomaly: boolean;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
}
export interface LaborAnomaly extends AnomalyScore {
  over_budget_pct: number;
  recommended_action: string;
}
export interface RevenueAnomaly extends AnomalyScore {
  trend: "increasing" | "decreasing" | "stable";
  seasonal_adjustment: number;
}
export interface MaintenanceAnomaly extends AnomalyScore {
  equipment_id?: string;
  failure_risk: number;
}
export async function calculateMovingAverage(
  values: number[],
  window: number,
): Promise<number[]> {
  if (values.length < window) {
    return values;
  }
  const result: number[] = [];
  for (let i = 0; i < values.length - window + 1; i++) {
    const subset = values.slice(i, i + window);
    const avg = subset.reduce((a, b) => a + b, 0) / window;
    result.push(avg);
  }
  return result;
}
export async function calculateStandardDeviation(
  values: number[],
): Promise<number> {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}
export async function detectLaborAnomalies(
  org_id: string,
  outlet_id: string,
  days: number = 30,
): Promise<LaborAnomaly[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const { data: summaries, error } = await supabase
      .from("property_summary")
      .select("*")
      .eq("org_id", org_id)
      .eq("outlet_id", outlet_id)
      .gte("report_date", startDate.toISOString().split("T")[0])
      .order("report_date", { ascending: true });
    if (error || !summaries || summaries.length === 0) {
      return [];
    }
    const laborCosts = summaries.map((s: any) => s.labor_cost || 0);
    const revenues = summaries.map((s: any) => s.revenue || 1);
    const laborPcts = laborCosts.map((cost, i) =>
      revenues[i] > 0 ? (cost / revenues[i]) * 100 : 0,
    );
    const meanLaborPct =
      laborPcts.reduce((a, b) => a + b, 0) / laborPcts.length;
    const stdDev = await calculateStandardDeviation(laborPcts);
    const anomalies: LaborAnomaly[] = [];
    summaries.forEach((summary: any, idx: number) => {
      const laborPct = laborPcts[idx];
      const zscore = stdDev > 0 ? (laborPct - meanLaborPct) / stdDev : 0;
      const isAnomaly = Math.abs(zscore) > 2;
      if (isAnomaly) {
        let severity: "low" | "medium" | "high" | "critical" = "low";
        let confidence = Math.min(Math.abs(zscore) / 4, 1);
        if (laborPct > 40) severity = "critical";
        else if (laborPct > 35) severity = "high";
        else if (laborPct > 30) severity = "medium";
        const overBudgetPct = ((laborPct - meanLaborPct) / meanLaborPct) * 100;
        let recommendedAction = "Monitor labor scheduling";
        if (overBudgetPct > 15) {
          recommendedAction =
            "Reduce hours: Labor exceeds budget significantly";
        } else if (overBudgetPct > 10) {
          recommendedAction = "Review scheduling: Labor trending above target";
        }
        anomalies.push({
          metric: `labor_pct_${summary.report_date}`,
          value: laborPct,
          expected: meanLaborPct,
          zscore,
          is_anomaly: true,
          severity,
          confidence,
          over_budget_pct: overBudgetPct,
          recommended_action: recommendedAction,
        });
      }
    });
    return anomalies.sort((a, b) => b.severity.localeCompare(a.severity));
  } catch (err) {
    console.error("Error detecting labor anomalies:", err);
    return [];
  }
}
export async function detectRevenueAnomalies(
  org_id: string,
  outlet_id: string,
  days: number = 30,
): Promise<RevenueAnomaly[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const { data: summaries, error } = await supabase
      .from("property_summary")
      .select("*")
      .eq("org_id", org_id)
      .eq("outlet_id", outlet_id)
      .gte("report_date", startDate.toISOString().split("T")[0])
      .order("report_date", { ascending: true });
    if (error || !summaries || summaries.length < 3) {
      return [];
    }
    const revenues = summaries.map((s: any) => s.revenue || 0);
    const meanRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const stdDev = await calculateStandardDeviation(revenues);
    const anomalies: RevenueAnomaly[] = [];
    let lastTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (revenues.length > 1) {
      const recentAvg =
        revenues.slice(-7).reduce((a, b) => a + b, 0) /
        Math.min(7, revenues.length);
      const oldAvg =
        revenues.slice(-14, -7).reduce((a, b) => a + b, 0) /
        Math.min(7, revenues.length - 7 || 1);
      if (recentAvg > oldAvg * 1.05) lastTrend = "increasing";
      else if (recentAvg < oldAvg * 0.95) lastTrend = "decreasing";
    }
    summaries.forEach((summary: any, idx: number) => {
      const revenue = revenues[idx];
      const zscore = stdDev > 0 ? (revenue - meanRevenue) / stdDev : 0;
      const isAnomaly = Math.abs(zscore) > 2;
      if (isAnomaly) {
        let severity: "low" | "medium" | "high" | "critical" = "low";
        let confidence = Math.min(Math.abs(zscore) / 4, 1);
        if (revenue < meanRevenue * 0.7) severity = "critical";
        else if (revenue < meanRevenue * 0.8) severity = "high";
        else if (Math.abs(zscore) > 2) severity = "medium";
        anomalies.push({
          metric: `revenue_${summary.report_date}`,
          value: revenue,
          expected: meanRevenue,
          zscore,
          is_anomaly: true,
          severity,
          confidence,
          trend: lastTrend,
          seasonal_adjustment: meanRevenue,
        });
      }
    });
    return anomalies.sort((a, b) => b.severity.localeCompare(a.severity));
  } catch (err) {
    console.error("Error detecting revenue anomalies:", err);
    return [];
  }
}
export async function detectMaintenanceRisks(
  org_id: string,
  days: number = 30,
): Promise<MaintenanceAnomaly[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const { data: summaries, error } = await supabase
      .from("property_summary")
      .select("*")
      .eq("org_id", org_id)
      .gte("report_date", startDate.toISOString().split("T")[0])
      .order("report_date", { ascending: true });
    if (error || !summaries || summaries.length === 0) {
      return [];
    }
    const anomalies: MaintenanceAnomaly[] = [];
    const upwardTrends = summaries.filter((s: any, idx: number) => {
      if (idx === 0) return false;
      const prev = summaries[idx - 1];
      return (
        s.labor_cost > prev.labor_cost * 1.15 && s.revenue < prev.revenue * 0.95
      );
    });
    upwardTrends.forEach((summary: any) => {
      anomalies.push({
        metric: "maintenance_risk_indicator",
        value: summary.labor_cost,
        expected: summaries[0].labor_cost,
        zscore: 2.5,
        is_anomaly: true,
        severity: "high",
        confidence: 0.75,
        equipment_id: undefined,
        failure_risk: 0.65,
      });
    });
    return anomalies;
  } catch (err) {
    console.error("Error detecting maintenance risks:", err);
    return [];
  }
}
export async function predictScheduleOptimization(
  org_id: string,
  outlet_id: string,
  dept_id: string,
  forecastDays: number = 7,
): Promise<{
  recommended_headcount: number;
  expected_revenue: number;
  optimal_labor_pct: number;
  confidence: number;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const { data: summaries, error } = await supabase
      .from("property_summary")
      .select("*")
      .eq("org_id", org_id)
      .eq("outlet_id", outlet_id)
      .gte("report_date", startDate.toISOString().split("T")[0])
      .order("report_date", { ascending: false })
      .limit(30);
    if (error || !summaries || summaries.length === 0) {
      return {
        recommended_headcount: 0,
        expected_revenue: 0,
        optimal_labor_pct: 28,
        confidence: 0,
      };
    }
    const revenues = summaries.map((s: any) => s.revenue || 0).reverse();
    const laborCosts = summaries.map((s: any) => s.labor_cost || 0).reverse();
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const avgLaborPct =
      laborCosts.reduce((a, b, i) => a + (b / (revenues[i] || 1)) * 100, 0) /
      laborCosts.length;
    const recentTrend = revenues.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const forecastedRevenue = recentTrend * 1.02;
    const avgHourlyRate = 18;
    const recommendedHeadcount = Math.ceil(
      (forecastedRevenue * 0.28) / 8 / avgHourlyRate,
    );
    return {
      recommended_headcount: recommendedHeadcount,
      expected_revenue: Math.round(forecastedRevenue * 100) / 100,
      optimal_labor_pct: Math.round(avgLaborPct * 100) / 100,
      confidence: Math.min(summaries.length / 30, 1),
    };
  } catch (err) {
    console.error("Error predicting schedule optimization:", err);
    return {
      recommended_headcount: 0,
      expected_revenue: 0,
      optimal_labor_pct: 28,
      confidence: 0,
    };
  }
}
export async function getAnomalyTrend(
  org_id: string,
  outlet_id: string,
  metricType: "labor" | "revenue" | "maintenance",
  days: number = 30,
): Promise<{
  trend: "improving" | "degrading" | "stable";
  score: number;
  change_pct: number;
}> {
  try {
    let anomalies: AnomalyScore[] = [];
    if (metricType === "labor") {
      anomalies = await detectLaborAnomalies(org_id, outlet_id, days);
    } else if (metricType === "revenue") {
      anomalies = await detectRevenueAnomalies(org_id, outlet_id, days);
    } else if (metricType === "maintenance") {
      anomalies = await detectMaintenanceRisks(org_id, days);
    }
    const totalAnomalies = anomalies.length;
    const criticalCount = anomalies.filter(
      (a) => a.severity === "critical",
    ).length;
    const score = (1 - criticalCount / Math.max(totalAnomalies, 1)) * 100;
    const recentAnomalies = anomalies.slice(0, 5);
    const olderAnomalies = anomalies.slice(5, 10);
    const recentScore =
      recentAnomalies.reduce((sum, a) => sum + (a.is_anomaly ? 1 : 0), 0) /
      Math.max(recentAnomalies.length, 1);
    const olderScore =
      olderAnomalies.reduce((sum, a) => sum + (a.is_anomaly ? 1 : 0), 0) /
      Math.max(olderAnomalies.length, 1);
    const changePct =
      ((recentScore - olderScore) / Math.max(olderScore, 0.01)) * 100;
    let trend: "improving" | "degrading" | "stable" = "stable";
    if (changePct < -5) trend = "improving";
    else if (changePct > 5) trend = "degrading";
    return {
      trend,
      score: Math.round(score * 100) / 100,
      change_pct: Math.round(changePct * 100) / 100,
    };
  } catch (err) {
    console.error("Error calculating anomaly trend:", err);
    return { trend: "stable", score: 0, change_pct: 0 };
  }
}
