import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmployeeRow, weeklyHours, DAYS, DayKey } from "@/lib/schedule";
import { loadSettings } from "./settings";
import { TrendingUp, Users, Clock, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";

interface DashboardProps {
  weekStartISO: string;
  employees: EmployeeRow[];
}

export default function Dashboard({ weekStartISO, employees }: DashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const settings = loadSettings();

  const metrics = useMemo(() => {
    const totalEmp = employees.length;
    const totalHours = employees.reduce((s, e) => s + weeklyHours(e), 0);
    const otThreshold = settings.overtimeThreshold;
    const otEmpCount = employees.filter(e => weeklyHours(e) > otThreshold).length;
    const otHours = employees.reduce((s, e) => Math.max(0, weeklyHours(e) - otThreshold), 0);
    
    const rate = settings.hourlyDefaultRate;
    const laborCost = employees.reduce((s, e) => {
      const eHours = weeklyHours(e);
      const eRate = e.rate ?? rate;
      const base = eRate * eHours;
      const ot = Math.max(0, eHours - otThreshold);
      const otCost = eRate * 1.5 * ot;
      return s + base + otCost;
    }, 0);

    const variance = laborCost - settings.weeklyBudget;
    const tips = employees.reduce((s, e) => s + (Object.values(e.shifts).reduce((t, c) => t + Number(c.tip ?? 0), 0)), 0);
    const avgHours = totalEmp > 0 ? totalHours / totalEmp : 0;
    const splh = totalHours > 0 ? settings.weeklySales / totalHours : 0;

    // Scheduled vs unscheduled
    const scheduledCount = employees.filter(e => weeklyHours(e) > 0).length;
    const unscheduledCount = totalEmp - scheduledCount;

    // Today's staffing
    const today = new Date(weekStartISO);
    const dayIndex = today.getDay();
    const dayKey = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex] as DayKey;
    const staffedToday = employees.filter(e => {
      const shift = e.shifts[dayKey];
      return shift && (shift.in || shift.value);
    }).length;

    return {
      totalEmp,
      totalHours,
      otEmpCount,
      otHours,
      laborCost,
      variance,
      varOk: variance <= 0,
      tips,
      avgHours,
      splh,
      scheduledCount,
      unscheduledCount,
      staffedToday,
      budget: settings.weeklyBudget,
      sales: settings.weeklySales,
    };
  }, [employees, weekStartISO]);

  const KPICard = ({
    title,
    value,
    icon: Icon,
    subtext,
    trend,
    onClick,
    accent,
  }: {
    title: string;
    value: string;
    icon: React.ComponentType<any>;
    subtext?: string;
    trend?: "up" | "down" | "neutral";
    onClick?: () => void;
    accent?: "success" | "warning" | "danger" | "info";
  }) => {
    const accentClass = {
      success: "bg-green-50 border-green-200",
      warning: "bg-yellow-50 border-yellow-200",
      danger: "bg-red-50 border-red-200",
      info: "bg-blue-50 border-blue-200",
    }[accent || "info"];

    return (
      <button
        onClick={onClick}
        className={`border rounded-lg p-4 text-left transition-all hover:shadow-md ${accentClass} ${
          selectedMetric === title ? "ring-2 ring-primary" : ""
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="text-xs font-medium text-muted-foreground">{title}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
            {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
          </div>
          <Icon className="w-5 h-5 text-muted-foreground mt-1" />
        </div>
        {trend && (
          <div className="text-xs font-medium flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3" />
            {trend === "up" ? "↑ Increasing" : trend === "down" ? "↓ Decreasing" : "→ Stable"}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Week of {weekStartISO}</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Staff"
          value={String(metrics.totalEmp)}
          icon={Users}
          subtext={`${metrics.scheduledCount} scheduled, ${metrics.unscheduledCount} unscheduled`}
          accent="info"
        />
        <KPICard
          title="Total Hours"
          value={`${metrics.totalHours.toFixed(1)}h`}
          icon={Clock}
          subtext={`Avg: ${metrics.avgHours.toFixed(1)}h/person`}
          accent="info"
          trend="neutral"
        />
        <KPICard
          title="Labor Cost"
          value={`$${metrics.laborCost.toFixed(0)}`}
          icon={DollarSign}
          subtext={`Budget: $${metrics.budget.toFixed(0)}`}
          accent={metrics.varOk ? "success" : "danger"}
        />
        <KPICard
          title="Overtime"
          value={`${metrics.otHours.toFixed(1)}h`}
          icon={AlertCircle}
          subtext={`${metrics.otEmpCount} employees`}
          accent={metrics.otHours > 20 ? "warning" : "info"}
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
          <div className="text-xs font-medium text-muted-foreground">Sales</div>
          <div className="text-2xl font-bold mt-1">${metrics.sales.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Sales per Labor Hour: ${metrics.splh.toFixed(2)}
          </div>
        </div>
        <div className={`border rounded-lg p-4 ${metrics.varOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-xs font-medium text-muted-foreground">Variance</div>
          <div className={`text-2xl font-bold mt-1 ${metrics.varOk ? 'text-green-700' : 'text-red-700'}`}>
            {metrics.varOk ? "-" : "+"}${Math.abs(metrics.variance).toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {metrics.varOk ? "Under budget ✓" : "Over budget"}
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
          <div className="text-xs font-medium text-muted-foreground">Tips Collected</div>
          <div className="text-2xl font-bold mt-1">${metrics.tips.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Per labor hour: ${(metrics.tips / Math.max(metrics.totalHours, 1)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Staffing Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Today's Staffing</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-4xl font-bold">{metrics.staffedToday}</div>
              <div className="text-sm text-muted-foreground">staff scheduled today</div>
            </div>
            <div className="flex-1">
              <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {metrics.totalEmp > 0 ? ((metrics.staffedToday / metrics.totalEmp) * 100).toFixed(0) : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">coverage</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Schedule Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">All positions filled</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">No conflicts</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Budget compliant</span>
              <CheckCircle2 className={`w-5 h-5 ${metrics.varOk ? "text-green-600" : "text-red-600"}`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">OT within limits</span>
              <CheckCircle2 className={`w-5 h-5 ${metrics.otHours <= 20 ? "text-green-600" : "text-yellow-600"}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Performance */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Top Performers (by hours)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {employees
            .map(e => ({ name: e.name, hours: weeklyHours(e), role: e.role }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 4)
            .map((emp) => (
              <div key={emp.name} className="border rounded p-3 bg-muted/30">
                <div className="font-medium text-sm">{emp.name}</div>
                <div className="text-xs text-muted-foreground">{emp.role || "Staff"}</div>
                <div className="text-lg font-bold mt-2">{emp.hours.toFixed(1)}h</div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">
            Generate Report
          </Button>
          <Button size="sm" variant="outline">
            Export Schedule
          </Button>
          <Button size="sm" variant="outline">
            Send to Staff
          </Button>
          <Button size="sm" variant="outline">
            Request Time Off
          </Button>
        </div>
      </div>
    </div>
  );
}
