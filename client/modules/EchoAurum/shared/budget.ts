export type BudgetPeriod = "monthly" | "quarterly" | "annual";
export type BudgetStatus = "draft" | "approved" | "active" | "archived";
export type MetricType = "currency" | "percentage" | "quantity" | "ratio";
export type VarianceFlagType = "favorable" | "unfavorable" | "neutral";
export interface BudgetDriver {
  id: string;
  code: string;
  name: string;
  description?: string;
  metricType: MetricType;
  unit?: string;
  baselineValue: number;
  forecastValue?: number;
  actualValue?: number;
  weightingFactor: number;
  dependencies?: string[];
}
export interface BudgetAccount {
  accountCode: string;
  accountName: string;
  budgetedAmount: number;
  actualAmount?: number;
  committedAmount?: number;
  availableAmount?: number;
  variance?: number;
  variancePercent?: number;
  flag?: VarianceFlagType;
  drivers: BudgetDriver[];
}
export interface BudgetPlan {
  id: string;
  name: string;
  period: BudgetPeriod;
  fiscalYear: number;
  status: BudgetStatus;
  startDate: string;
  endDate: string;
  currency: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  costCenter?: string;
  outletId?: string;
  accounts: BudgetAccount[];
  drivers: BudgetDriver[];
  totalBudgeted: number;
  totalActual?: number;
  totalVariance?: number;
}
export interface BudgetVariance {
  accountCode: string;
  accountName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  flag: VarianceFlagType;
  contributingDrivers: string[];
  explanation?: string;
}
export interface BudgetAnalysis {
  period: BudgetPeriod;
  fiscalYear: number;
  asOf: string;
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;
  variances: BudgetVariance[];
  topFavorableVariances: BudgetVariance[];
  topUnfavorableVariances: BudgetVariance[];
  driverContributions: Record<string, number>;
}
export interface DriverMetric {
  driverId: string;
  driverName: string;
  driverType: MetricType;
  value: number;
  unit?: string;
  period: string;
  trend?: "up" | "down" | "stable";
  impact: "high" | "medium" | "low";
  affectedAccounts: string[];
}
export interface BudgetForecast {
  accountCode: string;
  accountName: string;
  currentBudget: number;
  ytoActual: number;
  remaining: number;
  forecastedYear: number;
  confidence: "high" | "medium" | "low";
  drivers: BudgetDriver[];
}
export interface BudgetReport {
  period: BudgetPeriod;
  fiscalYear: number;
  generatedAt: string;
  budgets: BudgetPlan[];
  analysis: BudgetAnalysis;
  forecasts: BudgetForecast[];
  riskFactors: string[];
}
export interface DimensionalBudget {
  id: string;
  name: string;
  dimensions: {
    outlet?: string;
    costCenter?: string;
    department?: string;
    project?: string;
  };
  period: BudgetPeriod;
  fiscalYear: number;
  status: BudgetStatus;
  accounts: BudgetAccount[];
  drivers: BudgetDriver[];
  allocations?: BudgetAllocation[];
}
export interface BudgetAllocation {
  id: string;
  sourceAccountCode: string;
  targetAccountCode: string;
  amount: number;
  basisPercentage?: number;
  period: string;
  justification?: string;
}
export interface BudgetRollingForecast {
  period: BudgetPeriod;
  months: Array<{
    month: string;
    budgeted: number;
    actual: number;
    forecast: number;
    variance: number;
  }>;
  trend: "improving" | "declining" | "stable";
  nextPeriodForecast: number;
  confidence: "high" | "medium" | "low";
}
