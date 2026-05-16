/** * Shared types for forecasting and scenario analysis */ export interface ForecastHorizon { days: 7 | 30 | 90;
} export interface ForecastInputs { org_id: string; outlet_id: string; dept_id: string; horizon: ForecastHorizon["days"]; // optional what-if knobs sales_growth_pct?: number; // e.g., 5 = +5% wage_increase_pct?: number; // e.g., 3 = +3% staffing_delta_hours?: number; // e.g., +12 hours spread across week
} export interface DailyPoint { date: string; // YYYY-MM-DD revenue: number; // $ labor_hours: number; splh: number; // revenue / labor_hours
} export interface ForecastResult { horizon: ForecastHorizon["days"]; series: DailyPoint[]; totals: { revenue: number; labor_hours: number; avg_splh: number; };
} export type ScenarioRule ="HOURS" |"REVENUE" |"HYBRID"; export interface ScenarioSpec { id: string; label: string; tip_rule?: ScenarioRule; hours_weight?: number; // for HYBRID revenue_weight?: number; // for HYBRID sales_growth_pct?: number; wage_increase_pct?: number; staffing_delta_hours?: number;
} export interface ScenarioOutcome { id: string; label: string; forecast: ForecastResult; kpis: { labor_pct: number; // (labor$ + tips) / revenue variance_vs_base: number; // revenue delta % vs base scenario };
} export interface ScenarioResult { base: ForecastResult; outcomes: ScenarioOutcome[];
}
