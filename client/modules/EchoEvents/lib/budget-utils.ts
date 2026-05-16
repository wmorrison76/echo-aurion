import {
  MONTHS,
  type BudgetLine,
  type FiscalYearBudget,
  type InvoiceRecord,
  type MonthKey,
  type PnLReport,
} from "@shared/accounting-types";
import { GL_ACCOUNTS } from "@shared/gl-accounts";
const BUDGET_KEY = (year: number) => `budget__${year}`;
const INVOICES_KEY = (year: number) => `invoices__${year}`;
const EVENTS_KEY = (year: number) => `events__${year}`;
export function emptyMonthly(): Record<MonthKey, number> {
  return MONTHS.reduce(
    (acc, m) => {
      acc[m] = 0;
      return acc;
    },
    {} as Record<MonthKey, number>,
  );
}
export function getOrCreateBudget(year: number): FiscalYearBudget {
  const raw = localStorage.getItem(BUDGET_KEY(year));
  if (raw) return JSON.parse(raw) as FiscalYearBudget;
  const lines: BudgetLine[] = GL_ACCOUNTS.map((a) => ({
    accountCode: a.code,
    amounts: emptyMonthly(),
  }));
  const now = new Date().toISOString();
  const created: FiscalYearBudget = {
    fiscalYear: year,
    lines,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem(BUDGET_KEY(year), JSON.stringify(created));
  return created;
}
export function saveBudget(b: FiscalYearBudget): void {
  b.updatedAt = new Date().toISOString();
  localStorage.setItem(BUDGET_KEY(b.fiscalYear), JSON.stringify(b));
}
export function listAvailableBudgets(): number[] {
  const years: number[] = [];
  for (let i = 2000; i <= 2100; i++) {
    if (localStorage.getItem(BUDGET_KEY(i))) years.push(i);
  }
  return years;
}
export function setAccountMonthly(
  year: number,
  accountCode: string,
  month: MonthKey,
  value: number,
) {
  const b = getOrCreateBudget(year);
  const line = b.lines.find((l) => l.accountCode === accountCode);
  if (!line) return;
  line.amounts[month] = value;
  saveBudget(b);
}
export function setAccountAllMonths(
  year: number,
  accountCode: string,
  values: Partial<Record<MonthKey, number>>,
) {
  const b = getOrCreateBudget(year);
  const line = b.lines.find((l) => l.accountCode === accountCode);
  if (!line) return;
  for (const k of Object.keys(values) as MonthKey[]) {
    if (k in line.amounts && typeof values[k] === "number")
      line.amounts[k] = values[k]!;
  }
  saveBudget(b);
}
export function accountAnnualTotal(line: BudgetLine): number {
  return MONTHS.reduce((sum, m) => sum + (line.amounts[m] || 0), 0);
}
export function sumBy(
  predicate: (glCode: string) => boolean,
  b: FiscalYearBudget,
): number {
  return b.lines.reduce(
    (sum, l) => sum + (predicate(l.accountCode) ? accountAnnualTotal(l) : 0),
    0,
  );
}
function isRevenue(code: string): boolean {
  const a = GL_ACCOUNTS.find((x) => x.code === code);
  return !!a && (a.type === "Revenue" || a.type === "Other Income");
}
function isCOGS(code: string): boolean {
  const a = GL_ACCOUNTS.find((x) => x.code === code);
  return !!a && a.type === "COGS";
}
function isUndistributedOrDeptExpense(code: string): boolean {
  const a = GL_ACCOUNTS.find((x) => x.code === code);
  return (
    !!a &&
    a.type === "Expense" &&
    (a.section === "Departmental" || a.section === "Undistributed")
  );
}
function isFixedChargesOrNonOp(code: string): boolean {
  const a = GL_ACCOUNTS.find((x) => x.code === code);
  return !!a && a.section === "Non-Operating/Fixed";
}
export function buildPnL(year: number): PnLReport {
  const b = getOrCreateBudget(year);
  const totalRevenue = sumBy(isRevenue, b);
  const totalCOGS = sumBy(isCOGS, b);
  const grossProfit = totalRevenue - totalCOGS;
  const operatingExpenses = sumBy(isUndistributedOrDeptExpense, b);
  const ebitdaLike = grossProfit - operatingExpenses;
  const fixedCharges = sumBy(isFixedChargesOrNonOp, b);
  const netOperatingIncome = ebitdaLike - fixedCharges;
  const rows = [
    { label: "Total Revenue", amount: totalRevenue },
    { label: "COGS", amount: -totalCOGS },
    { label: "Gross Profit", amount: grossProfit },
    {
      label: "Operating Expenses (Dept + Undistributed)",
      amount: -operatingExpenses,
    },
    { label: "EBITDA-like", amount: ebitdaLike },
    { label: "Fixed Charges / Non-Operating", amount: -fixedCharges },
    { label: "Net Operating Income", amount: netOperatingIncome },
  ];
  return {
    fiscalYear: year,
    rows,
    totalRevenue,
    totalCOGS,
    grossProfit,
    operatingExpenses,
    ebitdaLike,
    netOperatingIncome,
    fixedCharges,
  };
}
export function comparePnL(year: number, compareYears: number[]) {
  const base = buildPnL(year);
  const comparisons = compareYears.map((y) => {
    const r = buildPnL(y);
    const variance = base.netOperatingIncome - r.netOperatingIncome;
    const variancePct =
      r.netOperatingIncome !== 0
        ? variance / Math.abs(r.netOperatingIncome)
        : 0;
    return { year: y, report: r, variance, variancePct };
  });
  return { base, comparisons };
}
export function exportBudgetToCSV(year: number): string {
  const b = getOrCreateBudget(year);
  const header = [
    "Year",
    "GL Code",
    "Name",
    "Section",
    "Department",
    "Type",
    "USALI",
    "Scope",
    ...MONTHS.map((m) => m.toUpperCase()),
    "AnnualTotal",
  ].join(",");
  const rows = b.lines.map((l) => {
    const a = GL_ACCOUNTS.find((x) => x.code === l.accountCode)!;
    const months = MONTHS.map((m) => (l.amounts[m] ?? 0).toFixed(2));
    const total = accountAnnualTotal(l).toFixed(2);
    return [
      String(year),
      a.code,
      a.name,
      a.section,
      a.department,
      a.type,
      a.usaliRef,
      a.scope,
      ...months,
      total,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}
export function importInvoicesCSV(year: number, csv: string): InvoiceRecord[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return [];
  const cols = header.split(",").map((s) => s.trim().toLowerCase());
  const dateIdx = cols.indexOf("date");
  const vendorIdx = cols.indexOf("vendor");
  const descIdx = cols.indexOf("description");
  const amtIdx = cols.indexOf("amount");
  const codeIdx = cols.indexOf("glcode");
  const records: InvoiceRecord[] = [];
  for (const row of lines) {
    const parts = row.split(",");
    const rec: InvoiceRecord = {
      id: crypto.randomUUID(),
      date: parts[dateIdx]?.trim() ?? "",
      vendor: parts[vendorIdx]?.trim() ?? "",
      description: descIdx >= 0 ? parts[descIdx]?.trim() : undefined,
      amount: parseFloat(parts[amtIdx] ?? "0") || 0,
      glCode: parts[codeIdx]?.trim() ?? "",
    };
    records.push(rec);
  }
  localStorage.setItem(INVOICES_KEY(year), JSON.stringify(records));
  return records;
}
export function getInvoices(year: number): InvoiceRecord[] {
  const raw = localStorage.getItem(INVOICES_KEY(year));
  return raw ? (JSON.parse(raw) as InvoiceRecord[]) : [];
}
export function saveInvoices(year: number, rows: InvoiceRecord[]) {
  localStorage.setItem(INVOICES_KEY(year), JSON.stringify(rows));
}
export function listYearsWithInvoices(): number[] {
  const years: number[] = [];
  for (let i = 2000; i <= 2100; i++) {
    if (localStorage.getItem(INVOICES_KEY(i))) years.push(i);
  }
  return years;
}
