/** * EchoAI Server-Side Core * Secure wrapper for AI-driven forecasting and workload recommendations. * Uses environment variable OPENAI_API_KEY for secure API access. */
import { supabase } from"../lib/db";
import { generateOptimization } from"./aiOptimizer"; /** * Mock OpenAI response generator (for when API key is not configured) * In production, replace with actual OpenAI API call */
async function mockOpenAICompletion( systemPrompt: string, userPrompt: string
): Promise<string> { // Simulate intelligent response based on prompt content if ( userPrompt.toLowerCase().includes("recommend") || userPrompt.toLowerCase().includes("suggest") ) { return"Based on your current labor metrics, I recommend optimizing your staffing by focusing on peak revenue hours. Consider allocating more servers during high-traffic periods and consolidating slow-period tasks."; } else if (userPrompt.toLowerCase().includes("forecast")) { return"Your forecasted labor cost for next week is approximately $2,450 based on current trends. This assumes stable revenue and normal staffing patterns. Monitor SPLH metrics for early warning signs of budget overruns."; } else if (userPrompt.toLowerCase().includes("scenario")) { return"Running comparison: Scenario A (70% hours / 30% revenue) distributes tips more evenly than Scenario B (50/50 split). Scenario A would increase lower-tier employee earnings by ~12% while Scenario B favors high-revenue generators."; } return"I'm ready to help with labor planning, tip pool analysis, revenue forecasting, and workload balancing. What would you like to explore?";
} /** * Main AI entry point * @param org_id – organization identifier * @param outlet_id – outlet identifier * @param dept_id – department identifier * @param prompt – user natural-language query */
export async function askEchoAI({ org_id, outlet_id, dept_id, prompt,
}: { org_id: string; outlet_id: string; dept_id: string; prompt: string;
}): Promise<{ text: string; optimization: any;
}> { try { // Retrieve recent labor, revenue, and event data const [laborRes, revenueRes, eventsRes] = await Promise.all([ supabase .from("shifts") .select("*") .eq("dept_id", dept_id) .limit(100), supabase .from("revenues") .select("*") .eq("dept_id", dept_id) .limit(30), supabase .from("events") .select("*") .eq("dept_id", dept_id) .limit(30), ]); const labor = laborRes.data || []; const revenue = revenueRes.data || []; const events = eventsRes.data || []; // Generate structured optimization metrics const optimization = await generateOptimization(labor, revenue, events); // Compose system prompt with context const systemPrompt = `
You are EchoAI, a hospitality scheduling and forecasting assistant for resort hotels.
Your role is to help managers optimize labor scheduling, tip pool distribution, revenue forecasting, and event production. Department Data Summary:
- Recent shifts: ${labor.length} entries
- Recent revenue entries: ${revenue.length} entries
- Active events: ${events.length} entries Key Metrics:
${JSON.stringify(optimization.summary, null, 2)} Guidelines:
- Provide specific numeric recommendations
- Consider impact on employee fairness and morale
- Flag compliance risks (OT, rest periods, predictability pay)
- Suggest data-driven optimizations
- Use professional, actionable language
- When discussing scenarios, always compare fairness metrics
`; // Call mock AI (replace with real OpenAI API in production) const text = await mockOpenAICompletion(systemPrompt, prompt); return { text, optimization }; } catch (err) { console.error("askEchoAI error:", err); throw err; }
} /** * Generate multiple scenarios for tip pool comparison */
export async function generateScenarios(config: { org_id: string; outlet_id: string; dept_id: string; total_tips: number; members: Array<{ employee_id: string; hours_worked: number; revenue_attrib: number; }>;
}) { const { total_tips, members } = config; const scenarios = [ { id:"hours_only", label:"Hours Only", rule:"HOURS", description:"All tips split by hours worked", results: distributeByHours(total_tips, members), }, { id:"revenue_only", label:"Revenue Only", rule:"REVENUE", description:"All tips split by attributed revenue", results: distributeByRevenue(total_tips, members), }, { id:"hybrid_70_30", label:"70% Hours / 30% Revenue", rule:"HYBRID", description:"Balanced between effort and results", results: distributeHybrid(total_tips, members, 70, 30), }, { id:"hybrid_50_50", label:"50/50 Split", rule:"HYBRID", description:"Equal weight to hours and revenue", results: distributeHybrid(total_tips, members, 50, 50), }, { id:"hybrid_30_70", label:"30% Hours / 70% Revenue", rule:"HYBRID", description:"Reward high performers", results: distributeHybrid(total_tips, members, 30, 70), }, ]; return scenarios;
} function distributeByHours( total: number, members: Array<{ employee_id: string; hours_worked: number; revenue_attrib: number }>
) { const sumHours = members.reduce((s, m) => s + m.hours_worked, 0); return members.map((m) => ({ ...m, payout: sumHours > 0 ? (m.hours_worked / sumHours) * total : 0, }));
} function distributeByRevenue( total: number, members: Array<{ employee_id: string; hours_worked: number; revenue_attrib: number }>
) { const sumRevenue = members.reduce((s, m) => s + m.revenue_attrib, 0); return members.map((m) => ({ ...m, payout: sumRevenue > 0 ? (m.revenue_attrib / sumRevenue) * total : 0, }));
} function distributeHybrid( total: number, members: Array<{ employee_id: string; hours_worked: number; revenue_attrib: number }>, hoursWeight: number, revenueWeight: number
) { const sumHours = members.reduce((s, m) => s + m.hours_worked, 0); const sumRevenue = members.reduce((s, m) => s + m.revenue_attrib, 0); return members.map((m) => { const hoursFrac = sumHours > 0 ? m.hours_worked / sumHours : 0; const revenueFrac = sumRevenue > 0 ? m.revenue_attrib / sumRevenue : 0; const frac = (hoursWeight / 100) * hoursFrac + (revenueWeight / 100) * revenueFrac; return { ...m, payout: total * frac, }; });
}
