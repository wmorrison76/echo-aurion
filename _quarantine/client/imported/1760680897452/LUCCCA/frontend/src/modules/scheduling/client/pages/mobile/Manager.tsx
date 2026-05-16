import { useEffect, useMemo, useState } from "react";
import {
  EmployeeRow,
  ScheduleState,
  loadSchedule,
  startOfWeekISO,
  weeklyHours,
  DAYS,
  DayKey,
} from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Clock, Users, DollarSign, Zap } from "lucide-react";

export default function ManagerMobile() {
  const [weekISO, setWeekISO] = useState(startOfWeekISO());
  const [state, setState] = useState<ScheduleState | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "labor" | "alerts">("overview");
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editDay, setEditDay] = useState<DayKey | null>(null);
  const [newShiftValue, setNewShiftValue] = useState("");

  useEffect(() => {
    setState(loadSchedule());
  }, [weekISO]);

  const changeWeek = (delta: number) => {
    const d = new Date(weekISO);
    d.setDate(d.getDate() + delta * 7);
    setWeekISO(d.toISOString().slice(0, 10));
  };

  const metrics = useMemo(() => {
    if (!state) return { total: 0, staffed: 0, cost: 0, budget: 5000 };
    const totalEmp = state.employees.length;
    const staffedCount = state.employees.filter((e) => weeklyHours(e) > 0).length;
    const cost = state.employees.reduce((s, e) => {
      const h = weeklyHours(e);
      const r = e.rate || 20;
      return s + h * r + Math.max(0, h - 40) * r * 0.5;
    }, 0);
    return { total: totalEmp, staffed: staffedCount, cost, budget: 5000 };
  }, [state]);

  const alerts = useMemo(() => {
    if (!state) return [];
    const issues = [];
    const otCount = state.employees.filter((e) => weeklyHours(e) > 40).length;
    const unscheduledCount = state.employees.filter((e) => weeklyHours(e) === 0)
      .length;

    if (otCount > 0) {
      issues.push({
        type: "overtime",
        message: `${otCount} employee(s) on overtime`,
        severity: "warning",
      });
    }
    if (unscheduledCount > 0) {
      issues.push({
        type: "unscheduled",
        message: `${unscheduledCount} employee(s) not scheduled`,
        severity: "info",
      });
    }
    if (metrics.cost > metrics.budget) {
      issues.push({
        type: "budget",
        message: `Over budget: $${(metrics.cost - metrics.budget).toFixed(0)}`,
        severity: "danger",
      });
    }
    return issues;
  }, [state, metrics]);

  const saveSchedule = () => {
    if (state) {
      try {
        localStorage.setItem("shiftflow:schedule", JSON.stringify(state));
        alert("Schedule saved");
      } catch {
        alert("Failed to save");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background md:hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Manager Dashboard</div>
            <div className="text-xs text-muted-foreground">{weekISO}</div>
          </div>
          <a href="/" className="underline text-xs text-primary">
            Desktop
          </a>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
          <Button size="sm" variant="outline" onClick={() => changeWeek(-1)}>
            ← Prev
          </Button>
          <div className="flex-1 text-center text-sm font-medium">{weekISO}</div>
          <Button size="sm" variant="outline" onClick={() => changeWeek(1)}>
            Next →
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="border rounded p-3 bg-blue-50">
            <Users className="w-4 h-4 text-blue-600 mb-1" />
            <div className="text-xs text-muted-foreground">Staffed</div>
            <div className="text-xl font-bold text-blue-600">
              {metrics.staffed}/{metrics.total}
            </div>
          </div>
          <div className={`border rounded p-3 ${metrics.cost > metrics.budget ? "bg-red-50" : "bg-green-50"}`}>
            <DollarSign className={`w-4 h-4 mb-1 ${metrics.cost > metrics.budget ? "text-red-600" : "text-green-600"}`} />
            <div className="text-xs text-muted-foreground">Cost</div>
            <div className={`text-xl font-bold ${metrics.cost > metrics.budget ? "text-red-600" : "text-green-600"}`}>
              ${metrics.cost.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`border rounded p-3 ${
                  alert.severity === "danger"
                    ? "bg-red-50 border-red-200"
                    : alert.severity === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex gap-2">
                  <AlertCircle
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      alert.severity === "danger"
                        ? "text-red-600"
                        : alert.severity === "warning"
                          ? "text-yellow-600"
                          : "text-blue-600"
                    }`}
                  />
                  <div className="text-sm">{alert.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b bg-muted/30 rounded-lg overflow-hidden">
          {(["overview", "schedule", "labor", "alerts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-1 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {tab === "overview" && "📊 Overview"}
              {tab === "schedule" && "📅 Schedule"}
              {tab === "labor" && "💼 Labor"}
              {tab === "alerts" && "🚨 Alerts"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && state && (
          <div className="space-y-3">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm">Weekly Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Staff</span>
                  <span className="font-medium">{metrics.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="font-medium">{metrics.staffed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Hours</span>
                  <span className="font-medium">
                    {state.employees
                      .reduce((s, e) => s + weeklyHours(e), 0)
                      .toFixed(1)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-medium">Labor Cost</span>
                  <span className={`font-bold ${metrics.cost > metrics.budget ? "text-red-600" : "text-green-600"}`}>
                    ${metrics.cost.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm">Top Performers</h3>
              <div className="space-y-2">
                {state.employees
                  .map((e) => ({ name: e.name, hours: weeklyHours(e) }))
                  .sort((a, b) => b.hours - a.hours)
                  .slice(0, 3)
                  .map((emp, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{emp.name}</span>
                      <span className="font-medium">{emp.hours.toFixed(1)}h</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && state && (
          <div className="space-y-3">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 font-semibold text-sm">Staff Schedule</div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {state.employees.map((emp) => (
                  <div key={emp.id} className="p-3">
                    <div className="font-medium text-sm mb-2">{emp.name}</div>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      {(DAYS.slice(0, 4) as DayKey[]).map((day) => {
                        const shift = emp.shifts[day];
                        const hasShift = shift && (shift.in || shift.out || shift.value);
                        return (
                          <div
                            key={day}
                            className={`p-1 rounded text-center ${
                              hasShift ? "bg-primary/10" : "bg-muted"
                            }`}
                          >
                            {day}
                            <div className="text-[10px] mt-0.5">
                              {hasShift ? "✓" : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveSchedule} className="w-full">
              Save Schedule
            </Button>
          </div>
        )}

        {/* Labor Tab */}
        {activeTab === "labor" && (
          <div className="space-y-3">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm">Labor Cost Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Regular Pay</span>
                  <span className="font-mono">${(metrics.cost * 0.85).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime</span>
                  <span className="font-mono text-orange-600">
                    ${(metrics.cost * 0.15).toFixed(0)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span className="font-mono">${metrics.cost.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Budget</span>
                  <span className="font-mono">${metrics.budget.toFixed(0)}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      + Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                    </DialogHeader>
                    <Input placeholder="Employee name" />
                    <Input placeholder="Role" />
                    <Button>Add</Button>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="outline">
                  📊 Reports
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                No alerts
              </div>
            ) : (
              alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-4 ${
                    alert.severity === "danger"
                      ? "bg-red-50 border-red-200"
                      : alert.severity === "warning"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">{alert.message}</div>
                      <Button size="sm" className="mt-2">
                        Take Action
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
