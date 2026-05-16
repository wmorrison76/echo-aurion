import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  TrendingDown,
} from "lucide-react";

type ExpenseCategory = {
  name: string;
  budgeted: number;
  actual: number;
  variance: number;
  status: "on-track" | "warning" | "over-budget";
  trend: number;
};

type DailyCost = {
  date: string;
  total: number;
  food: number;
  labor: number;
  utilities: number;
  other: number;
};

type CostAlert = {
  id: string;
  category: string;
  type: "warning" | "critical";
  message: string;
  amount: number;
  suggestion: string;
};

type OptimizationTip = {
  id: string;
  category: string;
  potential_savings: number;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  action_items: string[];
};

const EXPENSE_DATA: ExpenseCategory[] = [
  {
    name: "Food & Beverage",
    budgeted: 45000,
    actual: 47200,
    variance: -2200,
    status: "warning",
    trend: 2.3,
  },
  {
    name: "Labor",
    budgeted: 42000,
    actual: 41800,
    variance: 200,
    status: "on-track",
    trend: -0.5,
  },
  {
    name: "Utilities",
    budgeted: 8000,
    actual: 8250,
    variance: -250,
    status: "warning",
    trend: 1.2,
  },
  {
    name: "Supplies & Equipment",
    budgeted: 6000,
    actual: 5900,
    variance: 100,
    status: "on-track",
    trend: -0.8,
  },
  {
    name: "Rent & Lease",
    budgeted: 15000,
    actual: 15000,
    variance: 0,
    status: "on-track",
    trend: 0,
  },
  {
    name: "Marketing & Events",
    budgeted: 5000,
    actual: 6100,
    variance: -1100,
    status: "over-budget",
    trend: 3.5,
  },
];

const DAILY_COSTS: DailyCost[] = [
  {
    date: "Mon",
    total: 14250,
    food: 6200,
    labor: 5500,
    utilities: 1200,
    other: 1350,
  },
  {
    date: "Tue",
    total: 13800,
    food: 5800,
    labor: 5400,
    utilities: 1100,
    other: 1500,
  },
  {
    date: "Wed",
    total: 14100,
    food: 6000,
    labor: 5600,
    utilities: 1100,
    other: 1400,
  },
  {
    date: "Thu",
    total: 15200,
    food: 6800,
    labor: 5800,
    utilities: 1300,
    other: 1300,
  },
  {
    date: "Fri",
    total: 16800,
    food: 7500,
    labor: 6200,
    utilities: 1400,
    other: 1700,
  },
  {
    date: "Sat",
    total: 17500,
    food: 7800,
    labor: 6500,
    utilities: 1500,
    other: 1700,
  },
  {
    date: "Sun",
    total: 14900,
    food: 6500,
    labor: 5900,
    utilities: 1200,
    other: 1300,
  },
];

const COST_ALERTS: CostAlert[] = [
  {
    id: "1",
    category: "Food Costs",
    type: "critical",
    message: "Food costs exceed budget by $2,200 (5.9% over)",
    amount: 2200,
    suggestion:
      "Review menu costing and reduce portion sizes on high-cost items",
  },
  {
    id: "2",
    category: "Utilities",
    type: "warning",
    message: "Utility costs trending up (+1.2%)",
    amount: 250,
    suggestion:
      "Check HVAC maintenance schedule and review energy conservation practices",
  },
  {
    id: "3",
    category: "Marketing",
    type: "critical",
    message: "Marketing spend over budget by $1,100 (22% over)",
    amount: 1100,
    suggestion:
      "Review campaign effectiveness and pause underperforming channels",
  },
];

const OPTIMIZATION_TIPS: OptimizationTip[] = [
  {
    id: "1",
    category: "Food Waste",
    potential_savings: 1200,
    difficulty: "easy",
    description: "Implement portion control templates and prep standardization",
    action_items: [
      "Create standardized portion guides",
      "Train staff on portion sizing",
      "Track daily waste by category",
    ],
  },
  {
    id: "2",
    category: "Labor Scheduling",
    potential_savings: 2500,
    difficulty: "medium",
    description: "Optimize shift scheduling based on demand patterns",
    action_items: [
      "Analyze covers by day/time",
      "Adjust labor curves",
      "Add forecast-based scheduling",
    ],
  },
  {
    id: "3",
    category: "Supplier Consolidation",
    potential_savings: 1800,
    difficulty: "hard",
    description: "Consolidate suppliers and negotiate volume discounts",
    action_items: [
      "Audit supplier spend",
      "Identify duplicates",
      "Negotiate consolidated rates",
    ],
  },
];

const COLORS = ["#00b4d8", "#0096c7", "#0077b6", "#03045e", "#caf0f8"];

export default function CostManagementModule() {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );

  const totalBudget = React.useMemo(
    () => EXPENSE_DATA.reduce((sum, item) => sum + item.budgeted, 0),
    [],
  );
  const totalActual = React.useMemo(
    () => EXPENSE_DATA.reduce((sum, item) => sum + item.actual, 0),
    [],
  );
  const totalVariance = totalBudget - totalActual;
  const variancePercentage = (
    (totalVariance / Math.max(1, totalBudget)) *
    100
  ).toFixed(1);
  const onTrackItems = EXPENSE_DATA.filter(
    (item) => item.status === "on-track",
  ).length;
  const warningItems = EXPENSE_DATA.filter(
    (item) => item.status === "warning",
  ).length;
  const totalPotentialSavings = OPTIMIZATION_TIPS.reduce(
    (sum, item) => sum + item.potential_savings,
    0,
  );

  const handleAnalyze = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/cost-management/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses: EXPENSE_DATA,
          dailyCosts: DAILY_COSTS,
          budget: totalBudget,
        }),
      });
      if (!response.ok) throw new Error("Analysis failed");
    } catch (error) {
      console.error("Cost analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [totalBudget]);

  return (
    <div
      className={cn(
        "w-full h-full overflow-y-auto bg-background/50 backdrop-blur-sm p-6 space-y-6",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-500" />
            Cost Management
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Track, analyze, and optimize all operational expenses
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Analyze Costs
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              ${(totalBudget / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-foreground/50 mt-1">This month</p>
          </CardContent>
        </Card>
        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              Actual Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              ${(totalActual / 1000).toFixed(0)}K
            </div>
            <p
              className={cn(
                "text-xs font-semibold mt-1",
                totalVariance >= 0 ? "text-green-500" : "text-red-500",
              )}
            >
              {totalVariance >= 0 ? "−" : "+"}$
              {Math.abs(totalVariance / 1000).toFixed(0)}K vs budget
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                totalVariance >= 0 ? "text-green-500" : "text-red-500",
              )}
            >
              {totalVariance >= 0 ? "+" : ""}$
              {(totalVariance / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              {variancePercentage}% of budget
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              On Track
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {onTrackItems}
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              {warningItems} warning{warningItems !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/60">
              Savings Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              ${(totalPotentialSavings / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              Monthly opportunity
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-background border border-white/10 p-1 rounded-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card className="bg-background border-white/10">
            <CardHeader>
              <CardTitle>7-Day Cost Trend</CardTitle>
              <CardDescription>
                Daily operational costs by category
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DAILY_COSTS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" stroke="#ffffff60" />
                  <YAxis stroke="#ffffff60" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #ffffff20",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="food"
                    stackId="1"
                    stroke="#00b4d8"
                    fillOpacity={0.35}
                    fill="#00b4d8"
                  />
                  <Area
                    type="monotone"
                    dataKey="labor"
                    stackId="1"
                    stroke="#ff6b6b"
                    fillOpacity={0.25}
                    fill="#ff6b6b"
                  />
                  <Area
                    type="monotone"
                    dataKey="utilities"
                    stackId="1"
                    stroke="#ffd700"
                    fillOpacity={0.2}
                    fill="#ffd700"
                  />
                  <Area
                    type="monotone"
                    dataKey="other"
                    stackId="1"
                    stroke="#00d4aa"
                    fillOpacity={0.2}
                    fill="#00d4aa"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-background border-white/10">
              <CardHeader>
                <CardTitle>Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={EXPENSE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis
                      dataKey="name"
                      stroke="#ffffff60"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis stroke="#ffffff60" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #ffffff20",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="budgeted" fill="#00b4d8" />
                    <Bar dataKey="actual" fill="#ff6b6b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-background border-white/10">
              <CardHeader>
                <CardTitle>Cost Distribution (Actual)</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={EXPENSE_DATA}
                      dataKey="actual"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {EXPENSE_DATA.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #ffffff20",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          <Card className="bg-background border-white/10">
            <CardHeader>
              <CardTitle>Detailed Expense Breakdown</CardTitle>
              <CardDescription>Click a row to expand details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[520px] overflow-y-auto">
              {EXPENSE_DATA.map((item) => {
                const percentSpent =
                  (item.actual / Math.max(1, item.budgeted)) * 100;
                const statusColor =
                  item.status === "on-track"
                    ? "text-green-500"
                    : item.status === "warning"
                      ? "text-yellow-500"
                      : "text-red-500";
                return (
                  <div
                    key={item.name}
                    className="border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-background transition-colors"
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === item.name ? null : item.name,
                      )
                    }
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {item.name}
                        </h4>
                        <p className="text-xs text-foreground/60 mt-1">
                          Budget: ${(item.budgeted / 1000).toFixed(1)}K |
                          Actual: ${(item.actual / 1000).toFixed(1)}K
                        </p>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            "text-lg font-bold",
                            item.variance > 0
                              ? "text-green-500"
                              : item.variance < 0
                                ? "text-red-500"
                                : "text-foreground",
                          )}
                        >
                          {item.variance > 0 ? "+" : ""}$
                          {(item.variance / 1000).toFixed(1)}K
                        </div>
                        <div
                          className={cn(
                            "text-xs font-semibold mt-1",
                            statusColor,
                          )}
                        >
                          {item.status === "on-track"
                            ? "✓ On Track"
                            : item.status === "warning"
                              ? "⚠ Warning"
                              : "✕ Over Budget"}
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          item.status === "on-track"
                            ? "bg-green-500"
                            : item.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-red-500",
                        )}
                        style={{ width: `${Math.min(percentSpent, 100)}%` }}
                      />
                    </div>
                    {selectedCategory === item.name ? (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
                        <p className="text-foreground/80">
                          <span className="font-semibold">Monthly Trend:</span>{" "}
                          {item.trend > 0 ? "↑" : "↓"} {Math.abs(item.trend)}%
                        </p>
                        <p className="text-foreground/80">
                          <span className="font-semibold">Spend:</span>{" "}
                          {percentSpent.toFixed(0)}% of budget
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-4">
          <Card className="bg-background border-white/10">
            <CardHeader>
              <CardTitle>Active Cost Alerts</CardTitle>
              <CardDescription>Issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {COST_ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "border rounded-lg p-4 flex gap-3",
                    alert.type === "critical"
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-yellow-500/30 bg-yellow-500/10",
                  )}
                >
                  {alert.type === "critical" ? (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {alert.message}
                    </p>
                    <p className="text-sm text-foreground/70 mt-2">
                      {alert.suggestion}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p
                      className={cn(
                        "font-bold",
                        alert.type === "critical"
                          ? "text-red-500"
                          : "text-yellow-500",
                      )}
                    >
                      ${(alert.amount / 1000).toFixed(1)}K
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4 mt-4">
          <Card className="bg-background border-white/10">
            <CardHeader>
              <CardTitle>Cost Optimization Opportunities</CardTitle>
              <CardDescription>
                Potential monthly savings: $
                {(totalPotentialSavings / 1000).toFixed(1)}K
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {OPTIMIZATION_TIPS.map((tip) => (
                <div
                  key={tip.id}
                  className="border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {tip.category}
                      </h4>
                      <p className="text-sm text-foreground/70 mt-1">
                        {tip.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-500">
                        ${(tip.potential_savings / 1000).toFixed(1)}K
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        {tip.difficulty === "easy"
                          ? "🟢 Easy"
                          : tip.difficulty === "medium"
                            ? "🟡 Medium"
                            : "🔴 Hard"}
                      </div>
                    </div>
                  </div>
                  <div className="bg-background rounded p-3 text-sm">
                    <p className="text-foreground/70 font-semibold mb-2 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Action items
                    </p>
                    <ul className="space-y-1 text-foreground/60">
                      {tip.action_items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
