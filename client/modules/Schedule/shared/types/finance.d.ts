/** * Shared financial and tip-pooling types */ export type TipRule =
  | "HOURS"
  | "REVENUE"
  | "HYBRID";
export type ServicePeriod = "BREAKFAST" | "LUNCH" | "DINNER" | "LATE";
export interface TipPool {
  id: string;
  org_id: string;
  outlet_id: string;
  dept_id: string;
  name: string;
  rule: TipRule;
  hours_weight: number; // percentage, used if HYBRID revenue_weight: number; // percentage, used if HYBRID
}
export interface TipRun {
  id: string;
  pool_id: string;
  business_date: string; // ISO date service?: ServicePeriod; total_tips: number; hours_pct: number; revenue_pct: number; created_by: string; created_at: string;
}
export interface TipRunLine {
  id: string;
  run_id: string;
  employee_id: string;
  hours_worked: number;
  revenue_attrib: number;
  payout: number;
  details: Record<string, any>;
}
export interface RevenueEntry {
  id: string;
  outlet_id: string;
  dept_id: string;
  business_date: string; // ISO date service: ServicePeriod; amount: number;
}
export interface BudgetEntry {
  id: string;
  dept_id: string;
  week_start: string; // ISO date labor_budget: number; revenue_budget: number;
}
export interface PnLRow {
  dept_name: string;
  revenue: number;
  labor_regular: number;
  labor_ot: number;
  tips: number;
  labor_pct: number;
  variance: number;
}
