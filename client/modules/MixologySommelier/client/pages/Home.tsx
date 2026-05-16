import React, { useState, useEffect } from "react";
import {
  Wine,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Droplets,
  ThermometerSun,
  Package,
  BarChart3,
  ArrowRight,
  Clock,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Quick stat metric card
function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  accent,
  testId,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  trend?: "up" | "down" | "flat";
  accent?: string;
  testId: string;
}) {
  return (
    <Card
      className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl"
      data-testid={testId}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              {label}
            </p>
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight tabular-nums",
                accent || "text-zinc-50",
              )}
            >
              {value}
            </p>
            {sub && (
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                {trend === "up" && (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                )}
                {trend === "down" && (
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                )}
                {sub}
              </p>
            )}
          </div>
          <div
            className={cn(
              "p-2 rounded-lg",
              accent
                ? "bg-amber-500/10"
                : "bg-zinc-800/60",
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                accent || "text-zinc-400",
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Alert row
function AlertRow({
  severity,
  message,
  time,
}: {
  severity: "critical" | "warning" | "info";
  message: string;
  time: string;
}) {
  const colors = {
    critical: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    info: "bg-zinc-800/40 border-zinc-700/30 text-zinc-400",
  };
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm",
        colors[severity],
      )}
    >
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1 truncate">{message}</span>
      <span className="text-[10px] opacity-60 tabular-nums">{time}</span>
    </div>
  );
}

// Top mover item
function TopMover({
  name,
  type,
  pours,
  revenue,
  trend,
}: {
  name: string;
  type: string;
  pours: number;
  revenue: number;
  trend: "up" | "down";
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-800/30 last:border-0">
      <div
        className={cn(
          "w-1.5 h-8 rounded-full",
          trend === "up" ? "bg-emerald-500" : "bg-rose-500",
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{name}</p>
        <p className="text-[11px] text-zinc-500">{type}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium tabular-nums text-zinc-200">
          {pours} pours
        </p>
        <p className="text-[11px] tabular-nums text-zinc-500">
          ${revenue.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export const Home: React.FC = () => {
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="sommelier-module p-6 md:p-8 space-y-6 bg-zinc-950 min-h-full"
      data-testid="sommelier-home-dashboard"
    >
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Beverage Intelligence Center
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time pour analytics, cellar monitoring & procurement
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums">
            {liveTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* KPI Grid — Bento layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Pour Cost"
          value="18.2%"
          sub="1.3% below target"
          icon={Droplets}
          trend="down"
          accent="text-emerald-400"
          testId="metric-pour-cost"
        />
        <MetricCard
          label="Beverage Revenue"
          value="$14,820"
          sub="+8.4% vs last week"
          icon={DollarSign}
          trend="up"
          testId="metric-bev-revenue"
        />
        <MetricCard
          label="Inventory Value"
          value="$128,450"
          sub="1,247 bottles on hand"
          icon={Package}
          trend="flat"
          testId="metric-inventory-value"
        />
        <MetricCard
          label="Cellar Temp"
          value="55.2°F"
          sub="Optimal range"
          icon={ThermometerSun}
          accent="text-amber-400"
          testId="metric-cellar-temp"
        />
      </div>

      {/* Second row — Bento 3-column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Alerts */}
        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Active Alerts
              <Badge
                variant="outline"
                className="ml-auto bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]"
              >
                3
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2" data-testid="alerts-panel">
            <AlertRow
              severity="critical"
              message="Walk-in cooler B: 48°F — above threshold"
              time="12m ago"
            />
            <AlertRow
              severity="warning"
              message="Ketel One Vodka below par (4 bottles)"
              time="1h ago"
            />
            <AlertRow
              severity="warning"
              message="Opus One 2018 — last 2 bottles in cellar"
              time="3h ago"
            />
            <AlertRow
              severity="info"
              message="Sysco delivery confirmed for tomorrow 6 AM"
              time="5h ago"
            />
          </CardContent>
        </Card>

        {/* Top Movers */}
        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              Top Movers — This Shift
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="top-movers-panel">
            <TopMover
              name="Clase Azul Reposado"
              type="Tequila"
              pours={28}
              revenue={1680}
              trend="up"
            />
            <TopMover
              name="Veuve Clicquot Brut"
              type="Champagne"
              pours={14}
              revenue={1260}
              trend="up"
            />
            <TopMover
              name="Macallan 18yr"
              type="Single Malt"
              pours={9}
              revenue={810}
              trend="up"
            />
            <TopMover
              name="Grey Goose Martini"
              type="Cocktail"
              pours={22}
              revenue={506}
              trend="down"
            />
            <TopMover
              name="Caymus Cabernet 2021"
              type="Red Wine"
              pours={8}
              revenue={480}
              trend="up"
            />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Wine className="w-4 h-4 text-zinc-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2" data-testid="quick-actions-panel">
            {[
              { label: "Run Variance Audit", icon: BarChart3, accent: "text-rose-400" },
              { label: "Log Physical Count", icon: Package, accent: "text-zinc-300" },
              { label: "Create Purchase Order", icon: ShoppingCart, accent: "text-zinc-300" },
              { label: "Record Comped Drinks", icon: Wine, accent: "text-amber-400" },
              { label: "Check Cellar Temps", icon: ThermometerSun, accent: "text-zinc-300" },
            ].map((action) => (
              <button
                key={action.label}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-800/40 bg-zinc-800/20 hover:bg-zinc-800/50 transition-colors text-sm text-zinc-300 hover:text-zinc-100"
                data-testid={`action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <action.icon className={cn("w-4 h-4", action.accent)} />
                <span className="flex-1 text-left">{action.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Third row — Pour Cost by Category + Procurement Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">
              Pour Cost by Category
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="pour-cost-table">
            <div className="space-y-1.5">
              {[
                { cat: "Spirits", cost: 16.8, target: 18, rev: 6420, status: "good" },
                { cat: "Wine by Glass", cost: 22.1, target: 25, rev: 3210, status: "good" },
                { cat: "Wine by Bottle", cost: 31.5, target: 30, rev: 4850, status: "over" },
                { cat: "Beer (Draft)", cost: 20.2, target: 22, rev: 1890, status: "good" },
                { cat: "Beer (Bottle)", cost: 24.0, target: 25, rev: 980, status: "good" },
                { cat: "Cocktails", cost: 14.2, target: 18, rev: 2470, status: "great" },
              ].map((row) => (
                <div
                  key={row.cat}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors"
                >
                  <span className="text-sm text-zinc-300 w-32 truncate">
                    {row.cat}
                  </span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        row.status === "great"
                          ? "bg-emerald-500"
                          : row.status === "good"
                            ? "bg-emerald-500/70"
                            : "bg-rose-500",
                      )}
                      style={{ width: `${Math.min((row.cost / 40) * 100, 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm tabular-nums font-medium w-14 text-right",
                      row.status === "over"
                        ? "text-rose-400"
                        : "text-emerald-400",
                    )}
                  >
                    {row.cost}%
                  </span>
                  <span className="text-xs tabular-nums text-zinc-500 w-16 text-right">
                    ${row.rev.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">
              Procurement Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="procurement-pipeline">
            <div className="space-y-3">
              {[
                { vendor: "Southern Glazer's", items: 24, value: 8450, status: "submitted", eta: "Feb 12" },
                { vendor: "Republic National", items: 18, value: 6200, status: "confirmed", eta: "Feb 13" },
                { vendor: "Young's Market", items: 12, value: 3800, status: "delivered", eta: "Today" },
              ].map((po) => (
                <div
                  key={po.vendor}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg border border-zinc-800/30 bg-zinc-800/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {po.vendor}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {po.items} items — ETA {po.eta}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums font-medium text-zinc-300">
                    ${po.value.toLocaleString()}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      po.status === "delivered"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : po.status === "confirmed"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    )}
                  >
                    {po.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default Home;
