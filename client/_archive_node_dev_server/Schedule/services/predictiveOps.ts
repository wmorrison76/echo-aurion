/** * Predictive Operations Intelligence Core * Detects anomalies across labor, maintenance, and finance streams. * Uses OpenAI to analyze metrics and forecast risks. */ import { supabase } from"../lib/db";
import OpenAI from"openai"; const ai = getSubmoduleOpenAIClient(); interface MetricRow { report_date: string; outlet_id: string; labor_cost: number; revenue: number; tips: number;
import { getSubmoduleOpenAIClient } from "@/modules/_shared/openai-client";
} interface AnomalyInsight { alert: string; severity:"low" |"medium" |"high" |"critical"; recommendation: string; metric: string; value?: number; threshold?: number;
} export async function analyzeOperations( org_id: string
): Promise<AnomalyInsight[]> { try { // Query last 90 days of metrics from property_summary const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90); const { data: metrics, error } = await supabase .from("property_summary") .select("*") .eq("org_id", org_id) .gte("report_date", ninetyDaysAgo.toISOString().split("T")[0]) .order("report_date", { ascending: false }) .limit(90); if (error) { throw error; } if (!metrics || metrics.length === 0) { return [ { alert:"Insufficient data", severity:"low", recommendation:"Collect more operational data for better insights", metric:"data_points", }, ]; } // Calculate labor percentage and prepare data summary for AI analysis const metricsWithLabor = metrics.map((m: any) => ({ ...m, labor_pct: m.revenue > 0 ? ((m.labor_cost / m.revenue) * 100).toFixed(1) : 0, })); const avgLabor = ( metricsWithLabor.reduce((sum: number, m: any) => sum + parseFloat(m.labor_pct as string), 0) / metricsWithLabor.length ).toFixed(2); const avgRevenue = (metricsWithLabor.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0) / metricsWithLabor.length).toFixed(0); const avgTips = (metricsWithLabor.reduce((sum: number, m: any) => sum + (m.tips || 0), 0) / metricsWithLabor.length).toFixed(0); const analysisPrompt = `
Analyze the following operational metrics for anomalies and risks.
Return a JSON array of insights, each with: alert (string), severity (low|medium|high|critical), recommendation (string), metric (string). Average Labor Cost %: ${avgLabor}
Average Daily Revenue: $${avgRevenue}
Average Daily Tips: $${avgTips}
Total Data Points: ${metrics.length}
Date Range: ${metricsWithLabor[metricsWithLabor.length - 1].report_date} to ${metricsWithLabor[0].report_date} Recent Metrics Summary (with calculated labor %):
${JSON.stringify(metricsWithLabor.slice(0, 10), null, 2)} Identify operational risks such as:
- Labor costs trending above 35% of revenue
- Revenue declining more than 10% week-over-week
- Maintenance costs increasing unexpectedly
- Staffing anomalies
- Any patterns suggesting upcoming issues Return ONLY a valid JSON array. Example format:
[ {"alert":"Labor costs exceed threshold","severity":"high","recommendation":"Review scheduling and staffing levels","metric":"labor_pct" }
]
`; const response = await ai.chat.completions.create({ model:"gpt-4o-mini", messages: [ { role:"system", content:"You are an operations intelligence analyst. Detect anomalies in labor, maintenance, and finance data. Be concise and actionable.", }, { role:"user", content: analysisPrompt, }, ], temperature: 0.2, max_tokens: 1000, }); const responseText = response.choices[0].message.content ||"[]"; // Extract JSON from response (in case there's surrounding text) const jsonMatch = responseText.match(/\[[\s\S]*\]/); const jsonStr = jsonMatch ? jsonMatch[0] :"[]"; let insights: AnomalyInsight[] = []; try { const parsed = JSON.parse(jsonStr); insights = Array.isArray(parsed) ? parsed : []; } catch (parseError) { console.error("Failed to parse AI response:", parseError); insights = [ { alert:"Analysis completed with partial results", severity:"low", recommendation:"Review metrics dashboard for detailed insights", metric:"analysis_status", }, ]; } // Sort by severity (critical first) const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }; insights.sort( (a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder] ); return insights; } catch (error) { console.error("Error in analyzeOperations:", error); return [ { alert:"Analysis service temporarily unavailable", severity:"medium", recommendation:"Please try again in a few moments", metric:"service_status", }, ]; }
} export async function getRecentAnomalies( org_id: string, limit: number = 5
): Promise<AnomalyInsight[]> { const insights = await analyzeOperations(org_id); return insights.slice(0, limit);
} export async function checkCriticalAlerts(org_id: string): Promise<boolean> { const insights = await analyzeOperations(org_id); return insights.some((i) => i.severity ==="critical");
}
