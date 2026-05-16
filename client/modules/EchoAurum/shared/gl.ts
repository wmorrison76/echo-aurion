export type GLAccountClassification =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";
export type GLAccountStatus = "active" | "archived" | "inactive";
export type GLTransactionType = "debit" | "credit";
export interface GLAccountCode {
  code: string;
  name: string;
  classification: GLAccountClassification;
  description?: string;
  status: GLAccountStatus;
  parentCode?: string;
  level: number;
  isControlAccount: boolean;
}
export interface GLTransaction {
  id: string;
  accountCode: string;
  accountName: string;
  transactionType: GLTransactionType;
  amount: number;
  currency: string;
  postedAt: string;
  referenceId?: string;
  memo?: string;
  source: "manual" | "opera" | "toast" | "vendor" | "purchase_order";
}
export interface GLAccountBalance {
  accountCode: string;
  accountName: string;
  classification: GLAccountClassification;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  currency: string;
  asOf: string;
  transactionCount: number;
}
export interface GLHierarchyNode {
  code: string;
  name: string;
  level: number;
  parent?: string;
  children: GLHierarchyNode[];
  balance: number;
  classification: GLAccountClassification;
}
export interface GLExplorerNode {
  code: string;
  name: string;
  classification: GLAccountClassification;
  level: number;
  balance: number;
  debitBalance: number;
  creditBalance: number;
  transactionCount: number;
  hasChildren: boolean;
  children?: GLExplorerNode[];
  recentTransactions: GLTransaction[];
}
export interface GLDrillDownContext {
  accountCode: string;
  accountName: string;
  classification: GLAccountClassification;
  parentCode?: string;
  ancestors: Array<{ code: string; name: string }>;
  balance: number;
  transactions: GLTransaction[];
  variances?: VarianceDetail[];
}
export interface VarianceDetail {
  period: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  trend: "favorable" | "unfavorable" | "neutral";
}
export interface GLCodeCatalog {
  codes: GLAccountCode[];
  hierarchy: Record<string, GLHierarchyNode>;
  classifications: Record<GLAccountClassification, string>;
}
export interface GLAccountSummary {
  code: string;
  name: string;
  classification: GLAccountClassification;
  totalBalance: number;
  debitBalance: number;
  creditBalance: number;
  monthlyChange: number;
  yearToDateChange: number;
  variance?: { budgeted: number; actual: number; variance: number };
}
export interface GLReport {
  period: { start: string; end: string };
  generatedAt: string;
  accounts: GLAccountSummary[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
}
