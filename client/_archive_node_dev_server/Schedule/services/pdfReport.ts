/** * PDF Financial Report Generator * Summarizes labor %, revenue, and P&L by outlet * Requires: npm install pdfkit */ import { getSupabase } from "../lib/supabase";
export interface ReportData {
  outlet: string;
  revenue: number;
  labor_cost: number;
  tips: number;
  labor_pct: number;
} /** * Generate P&L report data for organization */
export async function generateReportData(
  org_id: string,
): Promise<ReportData[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not initialized");
  const { data, error } = await supabase
    .from("property_summary")
    .select("outlet_id, labor_cost, revenue, tips")
    .eq("org_id", org_id)
    .order("outlet_id");
  if (error) throw error; // Aggregate by outlet const outletMap = new Map<string, any>(); (data || []).forEach((row: any) => { const key = row.outlet_id; const existing = outletMap.get(key) || { revenue: 0, labor_cost: 0, tips: 0, }; outletMap.set(key, { revenue: existing.revenue + (row.revenue || 0), labor_cost: existing.labor_cost + (row.labor_cost || 0), tips: existing.tips + (row.tips || 0), }); }); // Convert to report format const report: ReportData[] = []; outletMap.forEach((value, outlet) => { const labor_pct = value.revenue > 0 ? (value.labor_cost / value.revenue) * 100 : 0; report.push({ outlet, revenue: Math.round(value.revenue * 100) / 100, labor_cost: Math.round(value.labor_cost * 100) / 100, tips: Math.round(value.tips * 100) / 100, labor_pct: Math.round(labor_pct * 10) / 10, }); }); return report;
} /** * Create a simple text-based PDF report * For full PDF generation, integrate with PDFKit or similar */
export async function createPDFReport(
  org_id: string,
): Promise<Buffer | string> {
  const reportData = await generateReportData(org_id); // Generate simple text report (production would use PDFKit) const lines = ["LUCCCA FINANCIAL SUMMARY REPORT", `Generated: ${new Date().toISOString()}`,"","Property Summary","-".repeat(80),"Outlet | Revenue | Labor Cost | Labor % | Tips","-".repeat(80), ]; reportData.forEach((r) => { const row = `${r.outlet.padEnd(20)} | $${r.revenue.toFixed(2).padStart(10)} | $${r.labor_cost.toFixed(2).padStart(10)} | ${r.labor_pct.toFixed(1).padStart(5)}% | $${r.tips.toFixed(2).padStart(8)}`; lines.push(row); }); lines.push("-".repeat(80)); // Calculate totals const totals = reportData.reduce( (acc, r) => ({ revenue: acc.revenue + r.revenue, labor_cost: acc.labor_cost + r.labor_cost, tips: acc.tips + r.tips, }), { revenue: 0, labor_cost: 0, tips: 0 } ); const avgLaborPct = totals.revenue > 0 ? (totals.labor_cost / totals.revenue) * 100 : 0; const totalRow = `${"TOTAL".padEnd(20)} | $${totals.revenue.toFixed(2).padStart(10)} | $${totals.labor_cost.toFixed(2).padStart(10)} | ${avgLaborPct.toFixed(1).padStart(5)}% | $${totals.tips.toFixed(2).padStart(8)}`; lines.push(totalRow); const content = lines.join("\n"); // Return as buffer (in production, convert to PDF using PDFKit) return Buffer.from(content,"utf-8");
} /** * Export report as JSON (for API responses) */
export async function exportReportJSON(org_id: string): Promise<{
  generated_at: string;
  org_id: string;
  data: ReportData[];
  totals: {
    revenue: number;
    labor_cost: number;
    tips: number;
    avg_labor_pct: number;
  };
}> {
  const data = await generateReportData(org_id);
  const totals = data.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      labor_cost: acc.labor_cost + r.labor_cost,
      tips: acc.tips + r.tips,
    }),
    { revenue: 0, labor_cost: 0, tips: 0 },
  );
  const avg_labor_pct =
    totals.revenue > 0 ? (totals.labor_cost / totals.revenue) * 100 : 0;
  return {
    generated_at: new Date().toISOString(),
    org_id,
    data,
    totals: { ...totals, avg_labor_pct: Math.round(avg_labor_pct * 10) / 10 },
  };
}
