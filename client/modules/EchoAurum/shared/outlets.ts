/** * Multi-Outlet P&L Management System * Support for 100+ outlets with driver-based forecasting */ export type OutletType =
  "hotel" | "restaurant" | "spa" | "entertainment" | "other";
export interface Outlet {
  id: string;
  code: string;
  name: string;
  type: OutletType;
  parentId?: string;
  location: string;
  currency: string;
  fiscalYearStart: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
export interface PnLDriver {
  id: string;
  outletId: string;
  name: string;
  description: string;
  unit: string;
  januaryValue: number;
  februaryValue: number;
  marchValue: number;
  aprilValue: number;
  mayValue: number;
  juneValue: number;
  julyValue: number;
  augustValue: number;
  septemberValue: number;
  octoberValue: number;
  novemberValue: number;
  decemberValue: number;
  createdAt: string;
  updatedAt: string;
}
export interface BudgetLineItem {
  id: string;
  outletId: string;
  accountCode: string;
  accountName: string;
  accountType: "revenue" | "expense" | "cogs" | "labor";
  month: number;
  budgetAmount: number;
  forecastAmount: number;
  actualAmount: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}
export interface MonthlyPnL {
  month: number;
  monthName: string;
  revenue: { budget: number; forecast: number; actual: number };
  cogs: { budget: number; forecast: number; actual: number };
  labor: { budget: number; forecast: number; actual: number };
  otherExpenses: { budget: number; forecast: number; actual: number };
  grossProfit: { budget: number; forecast: number; actual: number };
  ebitda: { budget: number; forecast: number; actual: number };
}
export interface OutletPnLReport {
  outletId: string;
  outletName: string;
  year: number;
  currency: string;
  monthly: MonthlyPnL[];
  ytd: {
    revenue: { budget: number; forecast: number; actual: number };
    cogs: { budget: number; forecast: number; actual: number };
    labor: { budget: number; forecast: number; actual: number };
    otherExpenses: { budget: number; forecast: number; actual: number };
    grossProfit: { budget: number; forecast: number; actual: number };
    ebitda: { budget: number; forecast: number; actual: number };
  };
  priorYear: {
    revenue: number;
    cogs: number;
    labor: number;
    otherExpenses: number;
    ebitda: number;
  };
  variance: {
    budgetVsActual: number;
    budgetVsActualPercent: number;
    forecastVsActual: number;
    forecastVsActualPercent: number;
  };
}
export interface ConsolidatedPnL {
  year: number;
  currency: string;
  outletCount: number;
  totalOutlets: Outlet[];
  monthly: MonthlyPnL[];
  ytd: OutletPnLReport["ytd"];
  byOutlet: { [outletId: string]: OutletPnLReport };
}
export interface LegacyPnLImport {
  id: string;
  fileName: string;
  year: number;
  outletId?: string;
  importedData: {
    [accountCode: string]: {
      accountName: string;
      accountType: "revenue" | "expense" | "cogs" | "labor";
      janAmount: number;
      febAmount: number;
      marAmount: number;
      aprAmount: number;
      mayAmount: number;
      junAmount: number;
      julAmount: number;
      augAmount: number;
      sepAmount: number;
      octAmount: number;
      novAmount: number;
      decAmount: number;
    };
  };
  status: "pending" | "validated" | "imported";
  validationErrors: string[];
  createdAt: string;
}
export interface OutletPermission {
  userId: string;
  outletId: string;
  permission: "none" | "view-summary" | "view-detail" | "edit" | "admin";
  restrictToGLCodes?: string[];
  createdAt: string;
  updatedAt: string;
}
