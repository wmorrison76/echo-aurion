import { type ReactNode, useEffect, useEffect as scheduleUseEffect, useMemo, useMemo as scheduleUseMemo, useState, useState as scheduleUseState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenancy } from "../../hooks/useTenancy";
import {
  DAYS,
  hoursForCell,
  loadSchedule,
  startOfWeekISO,
  weeklyHours,
  type EmployeeRow,
} from "../../lib/schedule";
import { loadSettings } from "./settings";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  LineChart,
  TrendingUp,
  Users,
} from "lucide-react";

type DashboardView = "covers" | "labor" | "forecast";
type ChartSeriesKind = "bar" | "line" | "area";

type ChartSeriesOption = {
  key: string;
  name: string;
  color: string;
  kind: ChartSeriesKind;
};

type DashboardConfig = {
  title: string;
  description: string;
  series: ChartSeriesOption[];
};

interface DashboardProps {
  weekStartISO?: string;
  employees?: EmployeeRow[];
}

function MetricCard({
  title,
  value,
  subtext,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: ReactNode;
  tone?: "default" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-border bg-card";

  return (
    <Card className={`rounded-xl ${toneClass}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function currency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export default function Dashboard({ weekStartISO, employees }: DashboardProps) {
  const [selectedView, setSelectedView] = useState<DashboardView>("covers");
  const [activeSeriesKeys, setActiveSeriesKeys] = useState<string[]>([]);
  const { tenancy, loading } = useTenancy();
  const settings = loadSettings();

  const resolvedSchedule = useMemo(
    () =>
      loadSchedule({
        outletId: tenancy.outlet_id,
        deptId: tenancy.dept_id,
      }),
    [tenancy.dept_id, tenancy.outlet_id],
  );

  const resolvedEmployees = useMemo(
    () => employees ?? resolvedSchedule?.employees ?? [],
    [employees, resolvedSchedule],
  );
  const resolvedWeekStartISO =
    weekStartISO ?? resolvedSchedule?.weekStartISO ?? startOfWeekISO(new Date(), settings.startDay);

  const chartData = useMemo(() => {
    const totalCovers = DAYS.reduce((sum, day) => {
      return (
        sum +
        resolvedEmployees.filter((employee) => {
          const shift = employee.shifts?.[day];
          return hoursForCell(shift) > 0;
        }).length
      );
    }, 0);
    const avgCovers = totalCovers > 0 ? totalCovers / DAYS.length : 0;
    const budgetPerDay = settings.weeklyBudget / DAYS.length;
    const salesPerDay = settings.weeklySales / DAYS.length;

    return DAYS.map((day, index) => {
      const actualCovers = resolvedEmployees.filter((employee) => hoursForCell(employee.shifts?.[day]) > 0).length;
      const actualHours = resolvedEmployees.reduce((sum, employee) => sum + hoursForCell(employee.shifts?.[day]), 0);
      const actualLabor = resolvedEmployees.reduce((sum, employee) => {
        const shiftHours = hoursForCell(employee.shifts?.[day]);
        const rate = employee.rate ?? settings.hourlyDefaultRate;
        return sum + shiftHours * rate;
      }, 0);
      const budgetedCovers = Math.max(1, Math.round(budgetPerDay / (settings.hourlyDefaultRate * 5.5)));
      const forecastCovers = Math.max(
        0,
        Math.round(Math.max(actualCovers, avgCovers) * (1.04 + index * 0.01)),
      );
      const forecastLabor = Math.round(actualLabor * (1.03 + index * 0.008));
      const actualSales = totalCovers > 0 ? (settings.weeklySales * actualCovers) / totalCovers : salesPerDay;
      const forecastSales = Math.round(actualSales * (1.06 + index * 0.012));

      return {
        day,
        label: day,
        actualCovers,
        budgetedCovers,
        forecastCovers,
        actualHours: Math.round(actualHours * 10) / 10,
        actualLabor: Math.round(actualLabor),
        budgetLabor: Math.round(budgetPerDay),
        forecastLabor,
        actualSales: Math.round(actualSales),
        forecastSales,
        salesTarget: Math.round(salesPerDay),
      };
    });
  }, [resolvedEmployees, settings.hourlyDefaultRate, settings.weeklyBudget, settings.weeklySales]);

  const totals = useMemo(() => {
    const totalCovers = chartData.reduce((sum, day) => sum + day.actualCovers, 0);
    const totalHours = resolvedEmployees.reduce((sum, employee) => sum + weeklyHours(employee), 0);
    const activeEmployees = resolvedEmployees.filter((employee) => weeklyHours(employee) > 0).length;
    const scheduledDays = DAYS.filter((day) =>
      resolvedEmployees.some((employee) => hoursForCell(employee.shifts?.[day]) > 0),
    ).length;
    const overtimeHours = resolvedEmployees.reduce((sum, employee) => {
      const hours = weeklyHours(employee);
      return sum + Math.max(0, hours - settings.overtimeThreshold);
    }, 0);
    const overtimeEmployees = resolvedEmployees.filter(
      (employee) => weeklyHours(employee) > settings.overtimeThreshold,
    ).length;
    const laborCost = resolvedEmployees.reduce((sum, employee) => {
      const hours = weeklyHours(employee);
      const rate = employee.rate ?? settings.hourlyDefaultRate;
      const overtime = Math.max(0, hours - settings.overtimeThreshold);
      return sum + hours * rate + overtime * rate * 0.5;
    }, 0);
    const tips = resolvedEmployees.reduce(
      (sum, employee) =>
        sum + Object.values(employee.shifts).reduce((shiftTotal, shift) => shiftTotal + Number(shift.tip ?? 0), 0),
      0,
    );
    const variance = laborCost - settings.weeklyBudget;
    const forecastSales = chartData.reduce((sum, day) => sum + day.forecastSales, 0);
    const budgetedCovers = chartData.reduce((sum, day) => sum + day.budgetedCovers, 0);
    const coverageRatio = budgetedCovers > 0 ? totalCovers / budgetedCovers : 0;
    const budgetVariancePct = settings.weeklyBudget > 0 ? (variance / settings.weeklyBudget) * 100 : 0;
    const splh = totalHours > 0 ? settings.weeklySales / totalHours : 0;
    const forecastGap = forecastSales - settings.weeklySales;
    const avgCoversPerDay = DAYS.length > 0 ? totalCovers / DAYS.length : 0;

    return {
      totalCovers,
      totalHours,
      activeEmployees,
      scheduledDays,
      overtimeHours,
      overtimeEmployees,
      laborCost,
      tips,
      variance,
      forecastSales,
      budgetedCovers,
      coverageRatio,
      budgetVariancePct,
      splh,
      forecastGap,
      avgCoversPerDay,
    };
  }, [chartData, resolvedEmployees, settings.hourlyDefaultRate, settings.overtimeThreshold, settings.weeklyBudget, settings.weeklySales]);

  const selectedConfig = useMemo<DashboardConfig>(() => {
    if (selectedView === "labor") {
      return {
        title: "Labor spend vs budget",
        description: "Track actual labor against the weekly budget and projected spend.",
        series: [
          { key: "actualLabor", name: "Actual labor", color: "#60a5fa", kind: "bar" },
          { key: "budgetLabor", name: "Budget", color: "#a78bfa", kind: "line" },
          { key: "forecastLabor", name: "Forecast", color: "#34d399", kind: "line" },
        ],
      };
    }

    if (selectedView === "forecast") {
      return {
        title: "Forecast vs actual sales",
        description: "See actual sales pacing against the forecast and target run-rate.",
        series: [
          { key: "actualSales", name: "Actual sales", color: "#22c55e", kind: "area" },
          { key: "salesTarget", name: "Target", color: "#f59e0b", kind: "line" },
          { key: "forecastSales", name: "Forecast", color: "#60a5fa", kind: "line" },
        ],
      };
    }

    return {
      title: "Covers vs budget",
      description: "Compare daily covers with the budgeted staffing level and forecasted demand.",
      series: [
        { key: "actualCovers", name: "Actual covers", color: "#38bdf8", kind: "bar" },
        { key: "budgetedCovers", name: "Budgeted covers", color: "#a78bfa", kind: "line" },
        { key: "forecastCovers", name: "Forecast covers", color: "#34d399", kind: "line" },
      ],
    };
  }, [selectedView]);

  useEffect(() => {
    setActiveSeriesKeys(selectedConfig.series.map((series) => series.key));
  }, [selectedConfig]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!tenancy.org_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Welcome</h1>
          <p className="text-muted-foreground mb-4">
            Select your organization, outlet, and department to get started.
          </p>
        </Card>
      </div>
    );
  }

  const selectedSeries = selectedConfig.series.filter((series) => activeSeriesKeys.includes(series.key));
  const keyMetrics = [
    {
      title: "Active employees",
      value: String(totals.activeEmployees),
      subtext: `${totals.scheduledDays} active days`,
      icon: <Users className="h-4 w-4" />,
      tone: "good" as const,
    },
    {
      title: "Overtime hours",
      value: `${totals.overtimeHours.toFixed(1)}h`,
      subtext: `${totals.overtimeEmployees} employees over threshold`,
      icon: <Clock className="h-4 w-4" />,
      tone: totals.overtimeHours > 0 ? ("warn" as const) : ("good" as const),
    },
    {
      title: "Tips",
      value: currency(totals.tips),
      subtext: "Tracked across scheduled shifts",
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "SPLH",
      value: currency(totals.splh),
      subtext: "Sales per labor hour",
      icon: <LineChart className="h-4 w-4" />,
    },
    {
      title: "Coverage ratio",
      value: `${(totals.coverageRatio * 100).toFixed(0)}%`,
      subtext: `${totals.totalCovers} actual vs ${totals.budgetedCovers} budgeted`,
      icon: <CalendarDays className="h-4 w-4" />,
      tone: totals.coverageRatio >= 1 ? ("good" as const) : ("warn" as const),
    },
    {
      title: "Budget variance",
      value: `${totals.budgetVariancePct.toFixed(1)}%`,
      subtext: currency(totals.variance),
      icon: <TrendingUp className="h-4 w-4" />,
      tone: totals.variance > 0 ? ("warn" as const) : ("good" as const),
    },
    {
      title: "Forecast gap",
      value: currency(totals.forecastGap),
      subtext: "Forecast vs target sales",
      icon: <TrendingUp className="h-4 w-4" />,
      tone: totals.forecastGap >= 0 ? ("good" as const) : ("warn" as const),
    },
    {
      title: "Labor cost",
      value: currency(totals.laborCost),
      subtext: `Budget ${currency(settings.weeklyBudget)}`,
      icon: <DollarSign className="h-4 w-4" />,
      tone: totals.variance > 0 ? ("warn" as const) : ("good" as const),
    },
  ];

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="rounded-3xl border border-border/60 bg-background/80 p-4 md:p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <LineChart className="h-4 w-4" />
              Dashboard
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Schedule command center</h2>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Weekly view for covers, labor, forecast, and budget performance for {resolvedWeekStartISO}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={selectedView === "covers" ? "default" : "outline"} size="sm" onClick={() => setSelectedView("covers")}>
              Covers
            </Button>
            <Button variant={selectedView === "labor" ? "default" : "outline"} size="sm" onClick={() => setSelectedView("labor")}>
              Labor vs budget
            </Button>
            <Button variant={selectedView === "forecast" ? "default" : "outline"} size="sm" onClick={() => setSelectedView("forecast")}>
              Forecast vs actual
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {keyMetrics.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            subtext={metric.subtext}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/60 px-3 py-1">Week total: {currency(totals.laborCost)}</span>
        <span className="rounded-full border border-border/60 px-3 py-1">Avg covers/day: {totals.avgCoversPerDay.toFixed(1)}</span>
        <span className="rounded-full border border-border/60 px-3 py-1">Labor share: {settings.weeklySales > 0 ? `${((totals.laborCost / settings.weeklySales) * 100).toFixed(1)}%` : "0.0%"}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
          <CardHeader className="space-y-2 border-b border-border/60 bg-gradient-to-r from-slate-950/5 via-transparent to-cyan-500/5 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base tracking-tight">{selectedConfig.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedConfig.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {selectedConfig.series.map((series) => {
                  const active = activeSeriesKeys.includes(series.key);
                  const isOnlyActive = active && activeSeriesKeys.length === 1;

                  return (
                    <Button
                      key={series.key}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="h-8 rounded-full px-3 text-[11px]"
                      disabled={isOnlyActive}
                      onClick={() => {
                        setActiveSeriesKeys((current) => {
                          if (current.includes(series.key)) {
                            return current.filter((key) => key !== series.key);
                          }

                          return [...current, series.key];
                        });
                      }}
                    >
                      {series.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[380px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={42} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(15,23,42,0.95)",
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#fff", fontWeight: 600 }}
                />
                <Legend />
                {selectedSeries
                  .filter((series) => series.kind === "bar")
                  .map((series) => (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={series.name}
                      fill={series.color}
                      radius={[10, 10, 0, 0]}
                      barSize={28}
                    />
                  ))}
                {selectedSeries
                  .filter((series) => series.kind === "line")
                  .map((series) => (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.name}
                      stroke={series.color}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  ))}
                {selectedSeries
                  .filter((series) => series.kind === "area")
                  .map((series) => (
                    <Area
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.name}
                      fill={series.color}
                      fillOpacity={0.14}
                      stroke={series.color}
                      strokeWidth={2}
                    />
                  ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium tracking-tight">Operational signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Budget status</span>
                <span className={`font-medium ${totals.variance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {totals.variance > 0 ? "Over budget" : "Within budget"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Forecast strength</span>
                <span className="font-medium text-foreground">Strong</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Coverage pace</span>
                <span className="font-medium text-foreground">Balanced</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                {totals.variance > 0 ? (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {totals.variance > 0
                  ? "Labor is trending above the weekly budget."
                  : "Labor is tracking within the weekly budget."}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium tracking-tight">Chart filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Select a graph mode to switch between covers, labor spend, and forecast pacing.
              </p>
              <p>
                Use the pills above the chart to turn actual, budget, and forecast series on or off dynamically.
              </p>
              <p>
                The chart updates instantly using the current schedule, budget, and sales settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
