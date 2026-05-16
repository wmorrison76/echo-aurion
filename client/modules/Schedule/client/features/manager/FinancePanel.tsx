import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { EmployeeRow } from "../../lib/schedule";
import { weeklyHours } from "../../lib/schedule";
import { loadSettings } from "../standalone/settings";

interface CostCenter {
  code: string;
  name: string;
  budget: number;
  department?: string;
}

const DEFAULT_COST_CENTERS: CostCenter[] = [
  {
    code: "1100",
    name: "Salaries & Wages",
    budget: 30_000,
    department: "Payroll",
  },
  {
    code: "1110",
    name: "Overtime Premium",
    budget: 5_000,
    department: "Payroll",
  },
  { code: "1120", name: "Benefits", budget: 8_000, department: "Payroll" },
  { code: "5200", name: "Supplies", budget: 3_000, department: "Operations" },
  {
    code: "5300",
    name: "Equipment Rental",
    budget: 2_000,
    department: "Operations",
  },
];

export default function FinancePanel({
  employees,
  weekStartISO,
}: {
  employees: EmployeeRow[];
  weekStartISO?: string;
}) {
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "details" | "costcenters"
  >("overview");

  const [costCenters, setCostCenters] = React.useState<CostCenter[]>(() => {
    try {
      const parsed = JSON.parse(
        localStorage.getItem("shiftflow:cost-centers") || "null",
      );
      if (Array.isArray(parsed) && parsed.length) return parsed as CostCenter[];
    } catch {
      /* ignore */
    }
    return DEFAULT_COST_CENTERS;
  });

  const settings = loadSettings();

  const financials = React.useMemo(() => {
    const totalEmp = employees.length;
    const totalHours = employees.reduce((s, e) => s + weeklyHours(e), 0);
    const otThreshold = settings.overtimeThreshold;
    const defaultRate = settings.hourlyDefaultRate;

    const regularCost = employees.reduce((s, e) => {
      const eHours = weeklyHours(e);
      const eRate = e.rate ?? defaultRate;
      const regHours = Math.min(eHours, otThreshold);
      return s + eRate * regHours;
    }, 0);

    const otCost = employees.reduce((s, e) => {
      const eHours = weeklyHours(e);
      const eRate = e.rate ?? defaultRate;
      const ot = Math.max(0, eHours - otThreshold);
      return s + eRate * 1.5 * ot;
    }, 0);

    const benefitsCost = totalHours * 2.5;
    const payrollTax = (regularCost + otCost) * 0.15;

    const totalLaborCost = regularCost + otCost + benefitsCost + payrollTax;
    const variance = totalLaborCost - settings.weeklyBudget;
    const variancePercent =
      settings.weeklyBudget > 0 ? (variance / settings.weeklyBudget) * 100 : 0;
    const splh = totalHours > 0 ? settings.weeklySales / totalHours : 0;
    const laborPercent =
      settings.weeklySales > 0
        ? (totalLaborCost / settings.weeklySales) * 100
        : 0;

    return {
      totalEmp,
      totalHours,
      regularCost,
      otCost,
      benefitsCost,
      payrollTax,
      totalLaborCost,
      variance,
      variancePercent,
      splh,
      laborPercent,
      budget: settings.weeklyBudget,
      sales: settings.weeklySales,
    };
  }, [
    employees,
    settings.hourlyDefaultRate,
    settings.overtimeThreshold,
    settings.weeklyBudget,
    settings.weeklySales,
    weekStartISO,
  ]);

  const saveCostCenters = () => {
    try {
      localStorage.setItem(
        "shiftflow:cost-centers",
        JSON.stringify(costCenters),
      );
      alert("Cost centers saved");
    } catch {
      alert("Failed to save cost centers");
    }
  };

  const LineItem = ({
    label,
    amount,
    percent,
    trend,
  }: {
    label: string;
    amount: number;
    percent?: number;
    trend?: "up" | "down";
  }) => (
    <div className="flex items-center justify-between p-2 border-b last:border-b-0">
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {percent !== undefined ? (
          <div className="text-xs text-muted-foreground">
            {percent.toFixed(1)}% of sales
          </div>
        ) : null}
      </div>
      <div className="text-right">
        <div className="font-medium">${amount.toFixed(0)}</div>
        {trend ? (
          <div className="text-xs flex items-center gap-1 justify-end">
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3 text-red-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-green-600" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Finance & General Ledger Costing</h3>
        <p className="text-sm text-muted-foreground">
          Inline finance and costing view for the active schedule panel.
        </p>
      </div>

      <div className="flex gap-2 border-b mb-4">
          {(["overview", "details", "costcenters"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "overview"
                ? "Overview"
                : tab === "details"
                  ? "Detailed Breakdown"
                  : "Cost Centers"}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Total Sales</div>
                <div className="text-2xl font-bold mt-1">
                  ${financials.sales.toFixed(0)}
                </div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">
                  Total Labor Cost
                </div>
                <div className="text-2xl font-bold mt-1">
                  ${financials.totalLaborCost.toFixed(0)}
                </div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Labor %</div>
                <div
                  className={`text-2xl font-bold mt-1 ${financials.laborPercent > 30 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-emerald-400"}`}
                >
                  {financials.laborPercent.toFixed(1)}%
                </div>
              </div>
              <div
                className={`border rounded p-3 ${financials.variance > 0 ? "bg-red-50 dark:bg-red-950/30 dark:border-red-900/40" : "bg-green-50 dark:bg-emerald-950/30 dark:border-emerald-900/40"}`}
              >
                <div className="text-xs text-muted-foreground">Variance</div>
                <div
                  className={`text-2xl font-bold mt-1 ${financials.variance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-emerald-400"}`}
                >
                  {financials.variance > 0 ? "+" : "-"}$
                  {Math.abs(financials.variance).toFixed(0)}
                </div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">SPLH</div>
                <div className="text-2xl font-bold mt-1">
                  ${financials.splh.toFixed(2)}
                </div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Total Hours</div>
                <div className="text-2xl font-bold mt-1">
                  {financials.totalHours.toFixed(1)}h
                </div>
              </div>
            </div>

            <div className="border rounded overflow-hidden">
              <div className="bg-muted/50 p-3 font-semibold">
                Income Statement
              </div>
              <LineItem label="Sales Revenue" amount={financials.sales} />
              <LineItem
                label="Regular Pay"
                amount={financials.regularCost}
                percent={
                  (financials.regularCost / Math.max(financials.sales, 1)) * 100
                }
              />
              <LineItem
                label="Overtime Premium"
                amount={financials.otCost}
                percent={
                  (financials.otCost / Math.max(financials.sales, 1)) * 100
                }
                trend={financials.otCost > 2000 ? "up" : "down"}
              />
              <LineItem
                label="Benefits & Taxes"
                amount={financials.benefitsCost + financials.payrollTax}
                percent={
                  ((financials.benefitsCost + financials.payrollTax) /
                    Math.max(financials.sales, 1)) *
                  100
                }
              />
              <div className="p-2 bg-primary/10 border-t font-semibold flex items-center justify-between">
                <span>Total Labor Cost</span>
                <span>${financials.totalLaborCost.toFixed(0)}</span>
              </div>
              <LineItem label="Budgeted Labor" amount={financials.budget} />
              <div
                className={`p-2 border-t font-semibold flex items-center justify-between ${financials.variance > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-emerald-950/30"}`}
              >
                <span>Budget Variance</span>
                <span
                  className={
                    financials.variance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-emerald-400"
                  }
                >
                  {financials.variance > 0 ? "+" : ""}$
                  {financials.variance.toFixed(0)} (
                  {financials.variancePercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "details" ? (
          <div className="grid gap-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Cost Category</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">% of Sales</th>
                    <th className="text-right p-2">Per Hour</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">Regular Pay</td>
                    <td className="text-right p-2 font-medium">
                      ${financials.regularCost.toFixed(0)}
                    </td>
                    <td className="text-right p-2">
                      {(
                        (financials.regularCost /
                          Math.max(financials.sales, 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                    <td className="text-right p-2">
                      $
                      {(
                        financials.regularCost /
                        Math.max(financials.totalHours, 1)
                      ).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Overtime (1.5x)</td>
                    <td className="text-right p-2 font-medium text-orange-600">
                      ${financials.otCost.toFixed(0)}
                    </td>
                    <td className="text-right p-2 text-orange-600">
                      {(
                        (financials.otCost / Math.max(financials.sales, 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                    <td className="text-right p-2 text-orange-600">
                      1.5x base
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Benefits</td>
                    <td className="text-right p-2 font-medium">
                      ${financials.benefitsCost.toFixed(0)}
                    </td>
                    <td className="text-right p-2">
                      {(
                        (financials.benefitsCost /
                          Math.max(financials.sales, 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                    <td className="text-right p-2">
                      $
                      {(
                        financials.benefitsCost /
                        Math.max(financials.totalHours, 1)
                      ).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Payroll Taxes</td>
                    <td className="text-right p-2 font-medium">
                      ${financials.payrollTax.toFixed(0)}
                    </td>
                    <td className="text-right p-2">
                      {(
                        (financials.payrollTax /
                          Math.max(financials.sales, 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                    <td className="text-right p-2">
                      $
                      {(
                        financials.payrollTax /
                        Math.max(financials.totalHours, 1)
                      ).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-primary/10 font-semibold">
                    <td className="p-2">Total Labor Expense</td>
                    <td className="text-right p-2">
                      ${financials.totalLaborCost.toFixed(0)}
                    </td>
                    <td className="text-right p-2">
                      {financials.laborPercent.toFixed(1)}%
                    </td>
                    <td className="text-right p-2">
                      $
                      {(
                        financials.totalLaborCost /
                        Math.max(financials.totalHours, 1)
                      ).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeTab === "costcenters" ? (
          <div className="grid gap-4">
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Cost Code</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-right p-2">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {costCenters.map((cc, idx) => (
                    <tr key={cc.code} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-mono">{cc.code}</td>
                      <td className="p-2">
                        <Input
                          value={cc.name}
                          onChange={(e) =>
                            setCostCenters((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, name: e.target.value } : p,
                              ),
                            )
                          }
                          className="h-8"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={cc.department || ""}
                          onChange={(e) =>
                            setCostCenters((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? { ...p, department: e.target.value }
                                  : p,
                              ),
                            )
                          }
                          className="h-8"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          value={cc.budget}
                          onChange={(e) =>
                            setCostCenters((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? { ...p, budget: Number(e.target.value) }
                                  : p,
                              ),
                            )
                          }
                          className="h-8 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={saveCostCenters} className="w-full">
              Save Cost Centers
            </Button>
          </div>
        ) : null}
    </div>
  );
}
