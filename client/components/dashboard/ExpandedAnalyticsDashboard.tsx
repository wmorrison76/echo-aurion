import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  GripVertical,
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Zap,
  Users,
  DollarSign,
  Settings,
  BarChart3,
  Truck,
  Package,
  Copy,
  Calendar,
  Clock,
} from "lucide-react";
import { MiniPanelManager } from "@/lib/mini-panel-storage";

interface AnalyticsPanelConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: "enterprise" | "operations" | "marketplace";
  content: React.ReactNode;
}

const REVENUE_TREND = [
  { week: "W1", revenue: 45000, target: 50000 },
  { week: "W2", revenue: 52000, target: 50000 },
  { week: "W3", revenue: 48000, target: 50000 },
  { week: "W4", revenue: 61000, target: 50000 },
  { week: "W5", revenue: 58000, target: 50000 },
];

const COST_BREAKDOWN = [
  { name: "Ingredients", value: 35, color: "#ef4444" },
  { name: "Labor", value: 28, color: "#f97316" },
  { name: "Overhead", value: 22, color: "#eab308" },
  { name: "Other", value: 15, color: "#06b6d4" },
];

const QUALITY_METRICS = [
  { metric: "Recipe Compliance", score: 96, status: "excellent" },
  { metric: "Health Score", score: 94, status: "excellent" },
  { metric: "Audit Pass Rate", score: 92, status: "excellent" },
];

const MAINTENANCE_ALERTS = [
  { equipment: "Dishwasher", risk: "critical", hours: 120 },
  { equipment: "Main Oven", risk: "high", hours: 480 },
  { equipment: "Cooler", risk: "low", hours: 1200 },
];

const STAFF_WELLNESS = [
  { name: "Marcus Johnson", fatigue: 78, risk: "high" },
  { name: "Sarah Williams", fatigue: 42, risk: "low" },
  { name: "David Chen", fatigue: 68, risk: "medium" },
];

const SCHEDULE_STATUS = [
  { shift: "Morning", staff: 4, status: "scheduled", time: "6:00 AM - 2:00 PM" },
  { shift: "Evening", staff: 3, status: "scheduled", time: "4:00 PM - 11:00 PM" },
  { shift: "Training", staff: 2, status: "pending", time: "2:00 PM - 4:00 PM" },
];

const CUSTOMER_METRICS = [
  { metric: "Satisfaction", value: 4.6, target: 4.5 },
  { metric: "Retention", value: 78, target: 75 },
  { metric: "Churn Risk", value: 12, target: 15 },
];

const TEMPLATE_STATS = [
  { template: "Spring Menu", downloads: 1250, rating: 4.8 },
  { template: "Beef Wellington", downloads: 2840, rating: 4.9 },
  { template: "Wedding Catering", downloads: 1998, rating: 4.9 },
];

const NETWORK_SAVINGS = [
  { supplier: "Fresh Harvest", savings: 612, category: "Produce" },
  { supplier: "Premium Butcher", savings: 4300, category: "Meat" },
  { supplier: "Artisan Cheese", savings: 2400, category: "Dairy" },
];

const BENCHMARK_STATUS = [
  { metric: "Food Cost", percentile: 65, status: "exceeding" },
  { metric: "Labor Cost", percentile: 72, status: "exceeding" },
  { metric: "Customer Sat", percentile: 78, status: "exceeding" },
];

export default function ExpandedAnalyticsDashboard() {
  const [minimizedPanels, setMinimizedPanels] = useState<Set<string>>(
    new Set(),
  );

  const toggleMinimize = (panelId: string) => {
    setMinimizedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  };

  const analyticsPanels: AnalyticsPanelConfig[] = [
    // ENTERPRISE OS - Financial
    {
      id: "revenue-trend",
      title: "Revenue Operations",
      icon: <DollarSign size={18} className="text-green-500" />,
      category: "enterprise",
      content: (
        <div className="space-y-3">
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={REVENUE_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="week"
                stroke="#999"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#999" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#6b7280"
                strokeDasharray="5 5"
                strokeWidth={1}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-foreground/60">This Week</p>
              <p className="text-lg font-bold text-green-500">$58,000</p>
            </div>
            <div>
              <p className="text-foreground/60">vs Target</p>
              <p className="text-lg font-bold text-blue-500">+16%</p>
            </div>
          </div>
        </div>
      ),
    },

    // ENTERPRISE OS - Costs
    {
      id: "cost-breakdown",
      title: "Cost Management",
      icon: <TrendingDown size={18} className="text-orange-500" />,
      category: "enterprise",
      content: (
        <div className="space-y-3">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={COST_BREAKDOWN}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {COST_BREAKDOWN.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 text-xs">
            {COST_BREAKDOWN.map((item) => (
              <div key={item.name} className="flex justify-between">
                <span className="text-foreground/70">{item.name}</span>
                <span className="font-semibold">{item.value}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-emerald-500 font-semibold pt-2 border-t border-border/30">
            Monthly savings: $2,450
          </p>
        </div>
      ),
    },

    // ENTERPRISE OS - Quality
    {
      id: "quality-assurance",
      title: "Quality Assurance",
      icon: <CheckCircle2 size={18} className="text-cyan-500" />,
      category: "enterprise",
      content: (
        <div className="space-y-2">
          {QUALITY_METRICS.map((item) => (
            <div key={item.metric}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium">{item.metric}</span>
                <span
                  className={`text-sm font-bold ${item.status === "excellent" ? "text-green-500" : "text-yellow-500"}`}
                >
                  {item.score}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${item.status === "excellent" ? "bg-green-500" : "bg-yellow-500"}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-foreground/60 pt-2 border-t border-border/30">
            ✓ All audits passed this month
          </p>
        </div>
      ),
    },

    // ENTERPRISE OS - Guest
    {
      id: "guest-experience",
      title: "Guest Experience",
      icon: <Users size={18} className="text-pink-500" />,
      category: "enterprise",
      content: (
        <div className="space-y-2">
          {CUSTOMER_METRICS.map((item) => (
            <div key={item.metric} className="p-2 bg-slate-800/50 rounded">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">{item.metric}</span>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${item.value >= item.target ? "text-green-500" : "text-yellow-500"}`}
                  >
                    {item.value}
                  </p>
                  <p className="text-xs text-foreground/60">
                    Target: {item.target}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },

    // ENTERPRISE OS - Supply
    {
      id: "supply-chain",
      title: "Supply Chain",
      icon: <Truck size={18} className="text-purple-500" />,
      category: "enterprise",
      content: (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-500/10 rounded">
              <p className="text-xs text-foreground/60">On-Time</p>
              <p className="text-lg font-bold text-green-500">96%</p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded">
              <p className="text-xs text-foreground/60">Suppliers</p>
              <p className="text-lg font-bold text-blue-500">287</p>
            </div>
            <div className="p-2 bg-orange-500/10 rounded">
              <p className="text-xs text-foreground/60">Waste Reduced</p>
              <p className="text-lg font-bold text-orange-500">8.2%</p>
            </div>
          </div>
          <p className="text-xs text-foreground/60 pt-2 border-t border-border/30">
            Next delivery: 2:00 PM
          </p>
        </div>
      ),
    },

    // PREDICTIVE OPS - Maintenance
    {
      id: "maintenance-alerts",
      title: "Predictive Maintenance",
      icon: <Zap size={18} className="text-yellow-500" />,
      category: "operations",
      content: (
        <div className="space-y-2">
          {MAINTENANCE_ALERTS.map((item) => (
            <div
              key={item.equipment}
              className={`p-2 rounded border ${item.risk === "critical" ? "bg-red-500/10 border-red-500/30" : item.risk === "high" ? "bg-orange-500/10 border-orange-500/30" : "bg-green-500/10 border-green-500/30"}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">{item.equipment}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${item.risk === "critical" ? "bg-red-500/20 text-red-300" : item.risk === "high" ? "bg-orange-500/20 text-orange-300" : "bg-green-500/20 text-green-300"}`}
                >
                  {item.hours}h
                </Badge>
              </div>
            </div>
          ))}
          <p className="text-xs text-red-400 font-semibold pt-2 border-t border-border/30">
            ⚠ 1 critical alert
          </p>
        </div>
      ),
    },

    // PREDICTIVE OPS - Staff
    {
      id: "staff-wellness",
      title: "Staff Wellness",
      icon: <BarChart3 size={18} className="text-cyan-500" />,
      category: "operations",
      content: (
        <div className="space-y-2">
          {STAFF_WELLNESS.map((staff) => (
            <div key={staff.name}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium truncate">
                  {staff.name}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${staff.risk === "high" ? "bg-red-500/20 text-red-300" : staff.risk === "medium" ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"}`}
                >
                  {staff.fatigue}
                </Badge>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${staff.risk === "high" ? "bg-red-500" : staff.risk === "medium" ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${staff.fatigue}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ),
    },

    // PREDICTIVE OPS - Schedule
    {
      id: "schedule-status",
      title: "Schedule Status",
      icon: <Calendar size={18} className="text-purple-500" />,
      category: "operations",
      content: (
        <div className="space-y-2">
          {SCHEDULE_STATUS.map((item) => (
            <div
              key={item.shift}
              className="p-2 bg-slate-800/50 rounded border border-slate-700/50"
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {item.shift}
                  </p>
                  <p className="text-xs text-foreground/60 flex items-center gap-1 mt-0.5">
                    <Clock size={12} />
                    {item.time}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs flex-shrink-0 ${
                    item.status === "scheduled"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {item.staff} staff
                </Badge>
              </div>
            </div>
          ))}
          <p className="text-xs text-purple-400 font-semibold pt-2 border-t border-border/30">
            ✓ 9 staff assigned today
          </p>
        </div>
      ),
    },

    // MARKETPLACE - Templates
    {
      id: "templates-popular",
      title: "Template Marketplace",
      icon: <Package size={18} className="text-indigo-500" />,
      category: "marketplace",
      content: (
        <div className="space-y-2">
          {TEMPLATE_STATS.map((template) => (
            <div
              key={template.template}
              className="p-2 bg-slate-800/50 rounded text-xs"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold truncate">
                  {template.template}
                </span>
                <span className="text-yellow-400">★ {template.rating}</span>
              </div>
              <p className="text-foreground/60">
                {template.downloads.toLocaleString()} downloads
              </p>
            </div>
          ))}
          <p className="text-xs text-blue-400 font-semibold pt-2 border-t border-border/30">
            2,456 templates active
          </p>
        </div>
      ),
    },

    // MARKETPLACE - Network
    {
      id: "network-savings",
      title: "Network Savings",
      icon: <TrendingDown size={18} className="text-emerald-500" />,
      category: "marketplace",
      content: (
        <div className="space-y-2">
          {NETWORK_SAVINGS.map((supplier) => (
            <div
              key={supplier.supplier}
              className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-xs"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{supplier.supplier}</p>
                  <p className="text-foreground/60">{supplier.category}</p>
                </div>
                <p className="text-emerald-400 font-bold">
                  +${supplier.savings}
                </p>
              </div>
            </div>
          ))}
          <p className="text-xs text-emerald-400 font-semibold pt-2 border-t border-border/30">
            Total: $45,620/year
          </p>
        </div>
      ),
    },

    // MARKETPLACE - Benchmarking
    {
      id: "benchmarking",
      title: "Industry Benchmarks",
      icon: <TrendingUp size={18} className="text-violet-500" />,
      category: "marketplace",
      content: (
        <div className="space-y-2">
          {BENCHMARK_STATUS.map((item) => (
            <div key={item.metric} className="p-2 bg-slate-800/50 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium">{item.metric}</span>
                <Badge
                  variant="outline"
                  className="text-xs bg-green-500/20 text-green-300"
                >
                  {item.percentile}th
                </Badge>
              </div>
              <p className="text-xs text-emerald-400">
                ✓ Exceeding industry average
              </p>
            </div>
          ))}
          <p className="text-xs text-violet-400 font-semibold pt-2 border-t border-border/30">
            Overall: 70th percentile
          </p>
        </div>
      ),
    },
  ];

  const enterprisePanels = analyticsPanels.filter(
    (p) => p.category === "enterprise",
  );
  const operationsPanels = analyticsPanels.filter(
    (p) => p.category === "operations",
  );
  const marketplacePanels = analyticsPanels.filter(
    (p) => p.category === "marketplace",
  );

  const renderPanelGroup = (
    panels: AnalyticsPanelConfig[],
    title: string,
    color: string,
  ) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-1 h-6 rounded ${color}`} />
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {panels.map((panel) => (
          <Card
            key={panel.id}
            className="border-border/30 hover:border-primary/50 transition-colors"
          >
            <CardHeader className="p-3 bg-gradient-to-r from-primary/20 to-primary/10 cursor-move hover:bg-primary/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-foreground/40" />
                  <div className="flex items-center gap-2">
                    {panel.icon}
                    <CardTitle className="text-sm">{panel.title}</CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs hover:bg-primary/20"
                    onClick={() =>
                      MiniPanelManager.createMiniPanel(panel.id, panel.title)
                    }
                    title="Extract as floating mini panel"
                  >
                    <Copy size={12} className="mr-1" />
                    Extract
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-primary/20"
                    onClick={() => toggleMinimize(panel.id)}
                    title="Minimize"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {!minimizedPanels.has(panel.id) && (
              <CardContent className="p-4">{panel.content}</CardContent>
            )}

            {minimizedPanels.has(panel.id) && (
              <CardContent className="p-3 text-xs text-foreground/50 text-center">
                Minimized
              </CardContent>
            )}

            <div className="px-3 py-2 border-t border-border/20 flex justify-between items-center">
              <span className="text-xs text-foreground/50">{panel.title}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMinimize(panel.id)}
                className="h-6 px-2 text-xs"
              >
                {minimizedPanels.has(panel.id) ? "↑" : "↓"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full p-4 bg-gradient-to-br from-background to-background/50 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome */}
        <Card className="border border-border/30 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Executive Dashboard
              </h2>
              <p className="text-foreground/70">
                Complete operations view across all 12 business modules -
                Real-time analytics from Enterprise OS, Predictive Operations,
                and Marketplace systems.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              All Business Metrics
            </h1>
            <p className="text-sm text-foreground/60">
              Unified view of finances, operations, quality, guests, supply
              chain, predictive alerts, and market performance
            </p>
          </div>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-panel", { detail: { id: "settings" } }),
              )
            }
            className="inline-flex items-center justify-center w-10 h-10 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors"
            title="Settings"
            type="button"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Enterprise OS Section */}
        {renderPanelGroup(enterprisePanels, "Enterprise OS", "bg-blue-500")}

        {/* Predictive Operations Section */}
        {renderPanelGroup(
          operationsPanels,
          "Predictive Operations",
          "bg-orange-500",
        )}

        {/* Marketplace Section */}
        {renderPanelGroup(
          marketplacePanels,
          "Marketplace & Network",
          "bg-purple-500",
        )}
      </div>
    </div>
  );
}
