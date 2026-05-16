import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmployeeRow, weeklyHours, DAYS, DayKey } from "@/lib/schedule";
import { loadSettings } from "@/features/standalone/settings";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";

interface CostCenter {
  code: string;
  name: string;
  budget: number;
  department?: string;
}

const DEFAULT_COST_CENTERS: CostCenter[] = [
  { code: "1100", name: "Salaries & Wages", budget: 30000, department: "Payroll" },
  { code: "1110", name: "Overtime Premium", budget: 5000, department: "Payroll" },
  { code: "1120", name: "Benefits", budget: 8000, department: "Payroll" },
  { code: "5200", name: "Supplies", budget: 3000, department: "Operations" },
  { code: "5300", name: "Equipment Rental", budget: 2000, department: "Operations" },
];

export default function FinancePanel({ employees, weekStartISO }: { employees: EmployeeRow[]; weekStartISO?: string }) {
  const [open, setOpen] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("shiftflow:cost-centers") || "[]") || DEFAULT_COST_CENTERS;
    } catch {
      return DEFAULT_COST_CENTERS;
    }
  });
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "costcenters">("overview");

  const settings = loadSettings();

  const financials = useMemo(() => {
    const totalEmp = employees.length;
    const totalHours = employees.reduce((s, e) => s + weeklyHours(e), 0);
    const otThreshold = settings.overtimeThreshold;

    const rate = settings.hourlyDefaultRate;
    const regularCost = employees.reduce((s, e) => {
      const eHours = weeklyHours(e);
      const eRate = e.rate ?? rate;
      const regHours = Math.min(eHours, otThreshold);
      return s + eRate * regHours;
    }, 0);

    const otCost = employees.reduce((s, e) => {
      const eHours = weeklyHours(e);
      const eRate = e.rate ?? rate;
      const ot = Math.max(0, eHours - otThreshold);
      return s + eRate * 1.5 * ot;
    }, 0);

    const dtCost = 0; // Can be expanded based on double-time rules

    const benefitsCost = totalHours * 2.5; // Assumed cost per hour
    const payrollTax = (regularCost + otCost) * 0.15; // 15% tax burden

    const totalLaborCost = regularCost + otCost + dtCost + benefitsCost + payrollTax;

    const tips = employees.reduce((s, e) => s + (Object.values(e.shifts).reduce((t, c) => t + Number(c.tip ?? 0), 0)), 0);

    const variance = totalLaborCost - settings.weeklyBudget;
    const variancePercent = settings.weeklyBudget > 0 ? (variance / settings.weeklyBudget) * 100 : 0;

    const splh = totalHours > 0 ? settings.weeklySales / totalHours : 0;
    const laborPercent = settings.weeklySales > 0 ? (totalLaborCost / settings.weeklySales) * 100 : 0;

    return {
      totalEmp,
      totalHours,
      regularCost,
      otCost,
      dtCost,
      benefitsCost,
      payrollTax,
      totalLaborCost,
      tips,
      variance,
      variancePercent,
      splh,
      laborPercent,
      budget: settings.weeklyBudget,
      sales: settings.weeklySales,
    };
  }, [employees, weekStartISO]);

  const saveCostCenters = () => {
    try {
      localStorage.setItem("shiftflow:cost-centers", JSON.stringify(costCenters));
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
        {percent !== undefined && (
          <div className="text-xs text-muted-foreground">{percent.toFixed(1)}% of sales</div>
        )}
      </div>
      <div className="text-right">
        <div className="font-medium">${amount.toFixed(0)}</div>
        {trend && (
          <div className="text-xs flex items-center gap-1 justify-end">
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3 text-red-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-green-600" />
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Finance + GL Costing
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Finance & General Ledger Costing</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
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
              {tab === "overview" && "Overview"}
              {tab === "details" && "Detailed Breakdown"}
              {tab === "costcenters" && "Cost Centers"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid gap-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Total Sales</div>
                <div className="text-2xl font-bold mt-1">${financials.sales.toFixed(0)}</div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Total Labor Cost</div>
                <div className="text-2xl font-bold mt-1">${financials.totalLaborCost.toFixed(0)}</div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Labor %</div>
                <div className={`text-2xl font-bold mt-1 ${financials.laborPercent > 30 ? "text-red-600" : "text-green-600"}`}>
                  {financials.laborPercent.toFixed(1)}%
                </div>
              </div>
              <div className={`border rounded p-3 ${financials.variance > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <div className="text-xs text-muted-foreground">Variance</div>
                <div className={`text-2xl font-bold mt-1 ${financials.variance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {financials.variance > 0 ? "+" : "-"}${Math.abs(financials.variance).toFixed(0)}
                </div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">SPLH</div>
                <div className="text-2xl font-bold mt-1">${financials.splh.toFixed(2)}</div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Total Hours</div>
                <div className="text-2xl font-bold mt-1">{financials.totalHours.toFixed(1)}h</div>
              </div>
            </div>

            {/* Income Statement */}
            <div className="border rounded overflow-hidden">
              <div className="bg-muted/50 p-3 font-semibold">Income Statement</div>
              <LineItem label="Sales Revenue" amount={financials.sales} />
              <LineItem label="Regular Pay" amount={financials.regularCost} percent={financials.regularCost / financials.sales * 100} />
              <LineItem label="Overtime Premium" amount={financials.otCost} percent={financials.otCost / financials.sales * 100} trend={financials.otCost > 2000 ? "up" : "down"} />
              <LineItem label="Benefits & Taxes" amount={financials.benefitsCost + financials.payrollTax} percent={(financials.benefitsCost + financials.payrollTax) / financials.sales * 100} />
              <div className="p-2 bg-primary/10 border-t font-semibold flex items-center justify-between">
                <span>Total Labor Cost</span>
                <span>${financials.totalLaborCost.toFixed(0)}</span>
              </div>
              <LineItem label="Budgeted Labor" amount={financials.budget} />
              <div className={`p-2 border-t font-semibold flex items-center justify-between ${financials.variance > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <span>Budget Variance</span>
                <span className={financials.variance > 0 ? "text-red-600" : "text-green-600"}>
                  {financials.variance > 0 ? "+" : ""}${financials.variance.toFixed(0)} ({financials.variancePercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Breakdown Tab */}
        {activeTab === "details" && (
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
                    <td className="p-2">Regular Pay (40-hour rate)</td>
                    <td className="text-right p-2 font-medium">${financials.regularCost.toFixed(0)}</td>
                    <td className="text-right p-2">{(financials.regularCost / financials.sales * 100).toFixed(1)}%</td>
                    <td className="text-right p-2">${(financials.regularCost / Math.max(financials.totalHours, 1)).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Overtime (1.5x rate)</td>
                    <td className="text-right p-2 font-medium text-orange-600">${financials.otCost.toFixed(0)}</td>
                    <td className="text-right p-2 text-orange-600">{(financials.otCost / financials.sales * 100).toFixed(1)}%</td>
                    <td className="text-right p-2 text-orange-600">1.5x base</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Benefits (Health, Retirement)</td>
                    <td className="text-right p-2 font-medium">${financials.benefitsCost.toFixed(0)}</td>
                    <td className="text-right p-2">{(financials.benefitsCost / financials.sales * 100).toFixed(1)}%</td>
                    <td className="text-right p-2">${(financials.benefitsCost / Math.max(financials.totalHours, 1)).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Payroll Taxes (FICA, etc.)</td>
                    <td className="text-right p-2 font-medium">${financials.payrollTax.toFixed(0)}</td>
                    <td className="text-right p-2">{(financials.payrollTax / financials.sales * 100).toFixed(1)}%</td>
                    <td className="text-right p-2">${(financials.payrollTax / Math.max(financials.totalHours, 1)).toFixed(2)}</td>
                  </tr>
                  <tr className="bg-primary/10 font-semibold">
                    <td className="p-2">Total Labor Expense</td>
                    <td className="text-right p-2">${financials.totalLaborCost.toFixed(0)}</td>
                    <td className="text-right p-2">{financials.laborPercent.toFixed(1)}%</td>
                    <td className="text-right p-2">${(financials.totalLaborCost / Math.max(financials.totalHours, 1)).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border rounded p-4 bg-muted/30">
              <h3 className="font-semibold mb-3">Metrics & Targets</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Target Labor %</div>
                  <div className="text-lg font-bold">30%</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {financials.laborPercent.toFixed(1)}% 
                    <span className={financials.laborPercent > 30 ? " text-red-600" : " text-green-600"}>
                      {financials.laborPercent > 30 ? " ⚠ Over" : " ✓ On Track"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sales per Labor Hour</div>
                  <div className="text-lg font-bold">${financials.splh.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Target: $100</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cost Centers Tab */}
        {activeTab === "costcenters" && (
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
                  {costCenters.map((cc) => (
                    <tr key={cc.code} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-mono">{cc.code}</td>
                      <td className="p-2">{cc.name}</td>
                      <td className="p-2">{cc.department || "—"}</td>
                      <td className="text-right p-2">${cc.budget.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border rounded p-4 bg-muted/30">
              <h3 className="font-semibold mb-3">Add New Cost Center</h3>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Cost Code" className="border rounded px-2 py-1" />
                <input placeholder="Description" className="border rounded px-2 py-1" />
                <input placeholder="Department" className="border rounded px-2 py-1" />
                <input type="number" placeholder="Budget" className="border rounded px-2 py-1" />
              </div>
              <Button size="sm" className="mt-2">
                Add Cost Center
              </Button>
            </div>

            <Button onClick={saveCostCenters} className="w-full">
              Save Cost Centers
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
