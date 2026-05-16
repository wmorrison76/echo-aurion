/** * Scenario Generator * Produces up to 5 side-by-side scenarios using Forecast Brain * and computes KPI deltas for easy comparison. */
import { buildForecast } from "./forecastBrain";
import type {
  ScenarioSpec,
  ScenarioOutcome,
  ForecastInputs,
  ScenarioResult,
} from "../../shared/types/forecast";
interface ScenarioInput {
  org_id: string;
  outlet_id: string;
  dept_id: string;
  horizon: 7 | 30 | 90;
} /** * Run up to 5 scenarios and compute KPI comparisons */
export async function runScenarios(
  base: ScenarioInput,
  specs: ScenarioSpec[],
): Promise<ScenarioResult> {
  // Validate input if (!Array.isArray(specs) || specs.length === 0 || specs.length > 5) { throw new Error("Provide between 1 and 5 scenario specs"); } // Compute a baseline (first item or zero-delta fallback) const baseSpec: ScenarioSpec = specs.find((s) => s.id ==="base") || { id:"base", label:"Baseline", sales_growth_pct: 0, wage_increase_pct: 0, staffing_delta_hours: 0, }; const baseForecast = await buildForecast({ ...base, sales_growth_pct: baseSpec.sales_growth_pct || 0, wage_increase_pct: baseSpec.wage_increase_pct || 0, staffing_delta_hours: baseSpec.staffing_delta_hours || 0, }); const outcomes: ScenarioOutcome[] = []; for (const spec of specs) { const forecast = await buildForecast({ ...base, sales_growth_pct: spec.sales_growth_pct || 0, wage_increase_pct: spec.wage_increase_pct || 0, staffing_delta_hours: spec.staffing_delta_hours || 0, }); // KPIs (labor % uses a simple wage proxy; tip-rule hooks reserved for later) const wageProxyRate = 20; // $20/hr average (replace with dept avg from DB if desired) const labor$ = forecast.totals.labor_hours * wageProxyRate; const tips$ = 0; // Tip inputs can be connected later const laborPct = forecast.totals.revenue > 0 ? ((labor$ + tips$) / forecast.totals.revenue) * 100 : 0; const varianceVsBase = baseForecast.totals.revenue > 0 ? ((forecast.totals.revenue - baseForecast.totals.revenue) / baseForecast.totals.revenue) * 100 : 0; outcomes.push({ id: spec.id, label: spec.label, forecast, kpis: { labor_pct: laborPct, variance_vs_base: varianceVsBase, }, }); } return { base: baseForecast, outcomes };
} /** * Helper: Generate default scenarios for quick-start */
export function generateDefaultScenarios(): ScenarioSpec[] {
  return [
    {
      id: "base",
      label: "Baseline",
      sales_growth_pct: 0,
      wage_increase_pct: 0,
      staffing_delta_hours: 0,
    },
    {
      id: "growth_5pct",
      label: "Growth +5%",
      sales_growth_pct: 5,
      wage_increase_pct: 0,
      staffing_delta_hours: 0,
    },
    {
      id: "growth_10pct",
      label: "Growth +10%",
      sales_growth_pct: 10,
      wage_increase_pct: 0,
      staffing_delta_hours: 0,
    },
    {
      id: "staff_plus12",
      label: "Staff +12h",
      sales_growth_pct: 0,
      wage_increase_pct: 0,
      staffing_delta_hours: 12,
    },
    {
      id: "combined",
      label: "Growth +5% + Staff +8h",
      sales_growth_pct: 5,
      wage_increase_pct: 0,
      staffing_delta_hours: 8,
    },
  ];
}
