/**
 * LUCCCA Enterprise Command Center Dashboard
 * Real-time data-driven dashboard with WebSocket live updates
 * Pulls from all 10 enterprise engines + live activity feed
 */
import React from "react";
import { cn } from "@/lib/glass";
import { openPanel } from "@/lib/open-panel";
import { Cloud, Sun, CloudSun, CloudRain, CloudSnow, CloudLightning, Wind, Calendar, TrendingUp } from "lucide-react";

// Navigate: close dashboard, then open target panel
function navigateTo(panelId: string) {
  // Close the dashboard panel first
  window.dispatchEvent(new CustomEvent("close-panel", { detail: { id: "dashboard" } }));
  // Small delay to allow close animation, then open target
  setTimeout(() => openPanel(panelId), 100);
}

const API_BASE = "";

// ─── WebSocket Hook ───────────────────────────────────────────────────────
function useWebSocket() {
  const [events, setEvents] = React.useState<Array<{ type: string; data: any; ts: number }>>([]);
  const [connected, setConnected] = React.useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectRef = React.useRef<ReturnType<typeof setTimeout>>();

  const connect = React.useCallback(() => {
    try {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        ws.send("ping");
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "pong") return;
          setEvents((prev) => [{ type: msg.type, data: msg.data, ts: Date.now() }, ...prev].slice(0, 50));
        } catch { /* ignore non-JSON */ }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    } catch {
      reconnectRef.current = setTimeout(connect, 5000);
    }
  }, []);

  React.useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  return { events, connected };
}

// ─── Data Hook ────────────────────────────────────────────────────────────
function useCommandCenter() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState<number>(0);
  const [dateRange, setDateRange] = React.useState<{ from: string; to: string }>(() => {
    const today = new Date().toISOString().split("T")[0];
    const mtdStart = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-01`;
    return { from: mtdStart, to: today };
  });

  const refresh = React.useCallback(async () => {
    try {
      let url = `${API_BASE}/api/enterprise/command-center`;
      const params = new URLSearchParams();
      if (dateRange.from) params.append("date_from", dateRange.from);
      if (dateRange.to) params.append("date_to", dateRange.to);
      if (params.toString()) url += `?${params}`;
      const res = await fetch(url);
      if (res.ok) {
        setData(await res.json());
        setLastUpdate(Date.now());
      }
    } catch (e) {
      console.error("[CommandCenter] fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  React.useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { data, loading, refresh, lastUpdate, dateRange, setDateRange };
}

// ─── Sub-components ───────────────────────────────────────────────────────
function KPICard({ label, value, sub, trend, color = "blue", pulse = false, onClick }: {
  label: string; value: string | number; sub?: string; trend?: string; color?: string; pulse?: boolean; onClick?: () => void;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/30",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
    rose: "from-rose-500/20 to-rose-600/5 border-rose-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30",
  };
  const textColor: Record<string, string> = {
    blue: "text-blue-400", green: "text-emerald-400", amber: "text-amber-400",
    purple: "text-purple-400", rose: "text-rose-400", cyan: "text-cyan-400",
  };
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm transition-all hover:scale-[1.02]",
        colorMap[color] || colorMap.blue,
        pulse && "ring-2 ring-primary/40 animate-pulse",
        onClick && "cursor-pointer hover:shadow-lg"
      )}
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-foreground/50">{label}</div>
      <div className={cn("mt-1 font-bold tabular-nums truncate", textColor[color] || textColor.blue, String(value).length > 10 ? "text-lg" : "text-2xl")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-foreground/40">{sub}</div>}
      {trend && <div className="mt-1 text-[10px] font-medium text-emerald-400">{trend}</div>}
      {onClick && <div className="mt-1 text-[9px] text-foreground/30 font-medium">Click for details →</div>}
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm">{icon}</span>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">{title}</h3>
      <div className="flex-1 h-px bg-border/30" />
    </div>
  );
}

function EngineStatus({ name, status }: { name: string; status: string }) {
  return (
    <div className="flex items-center gap-2 py-1" data-testid={`engine-${name}`}>
      <div className={cn("h-2 w-2 rounded-full", status === "active" || status === "healthy" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" : "bg-red-400")} />
      <span className="text-xs text-foreground/70 capitalize">{name.replace(/_/g, " ")}</span>
    </div>
  );
}

function EventRow({ event }: { event: any }) {
  const stageColors: Record<string, string> = {
    inquiry: "bg-yellow-500/20 text-yellow-300", prospect: "bg-yellow-500/20 text-yellow-300",
    proposal: "bg-blue-500/20 text-blue-300", deposit_received: "bg-blue-500/20 text-blue-300",
    confirmed: "bg-emerald-500/20 text-emerald-300", contract_signed: "bg-emerald-500/20 text-emerald-300",
    execution: "bg-purple-500/20 text-purple-300",
    closed: "bg-gray-500/20 text-gray-300",
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground/90 truncate">{event.name || "Unnamed Event"}</div>
        <div className="text-[11px] text-foreground/40">{event.client || ""} &middot; {event.guests || 0} guests</div>
      </div>
      <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap", stageColors[event.stage] || stageColors.inquiry)}>
        {(event.stage || "pending").replace(/_/g, " ")}
      </span>
    </div>
  );
}

// ─── Live Activity Feed ──────────────────────────────────────────────────
function LiveActivityFeed({ events, connected }: { events: Array<{ type: string; data: any; ts: number }>; connected: boolean }) {
  const typeIcons: Record<string, { icon: string; color: string }> = {
    "pos.transaction": { icon: "$", color: "text-emerald-400" },
    "inventory.update": { icon: "#", color: "text-blue-400" },
    "event.stage_changed": { icon: "*", color: "text-purple-400" },
    "payroll.executed": { icon: "%", color: "text-amber-400" },
    "pong": { icon: "~", color: "text-foreground/30" },
    // iter263.3 · new module events
    "beo.planned": { icon: "♦", color: "text-purple-300" },
    "beo.day_planned": { icon: "◆", color: "text-purple-400" },
    "vendor.contract_violation": { icon: "!", color: "text-red-400" },
    "purchrec.match_resolved": { icon: "✓", color: "text-emerald-400" },
    "purchrec.auto_po_created": { icon: "→", color: "text-emerald-300" },
    "admin.support_ticket": { icon: "?", color: "text-amber-300" },
    "admin.rollout": { icon: "↑", color: "text-blue-300" },
    "admin.flag_update": { icon: "⚑", color: "text-amber-400" },
  };

  const formatEvent = (ev: { type: string; data: any; ts: number }) => {
    const ago = Math.round((Date.now() - ev.ts) / 1000);
    const agoStr = ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;
    const info = typeIcons[ev.type] || { icon: ">", color: "text-foreground/50" };

    let message = ev.type.replace(/\./g, " ").replace(/_/g, " ");
    if (ev.type === "pos.transaction" && ev.data) {
      message = `POS Sale: $${ev.data.total || ev.data.amount || 0}`;
    } else if (ev.type === "event.stage_changed" && ev.data) {
      message = `Event "${ev.data.event_name || ""}" moved to ${ev.data.to_stage || ""}`;
    } else if (ev.type === "payroll.executed" && ev.data) {
      message = `Payroll: $${Number(ev.data.total_net || 0).toLocaleString()} disbursed`;
    } else if (ev.type === "inventory.update" && ev.data) {
      message = `Inventory: ${ev.data.ingredient_name || "item"} updated`;
    } else if (ev.type === "beo.planned" && ev.data) {
      message = `BEO planned: ${ev.data.event_name || ev.data.beo_id} (${ev.data.guest_count || "?"}g, ${(ev.data.elapsed_ms / 1000).toFixed(1)}s)`;
    } else if (ev.type === "beo.day_planned" && ev.data) {
      message = `BEO day plan ${ev.data.date}: ${ev.data.beo_count} events, ${ev.data.collisions} collisions`;
    } else if (ev.type === "vendor.contract_violation" && ev.data) {
      message = `Contract violations: ${ev.data.violations} ($${ev.data.estimated_overcharge_usd})`;
    } else if (ev.type === "purchrec.auto_po_created" && ev.data) {
      message = `Auto-PO: ${ev.data.count} cut → $${ev.data.total_amount}`;
    } else if (ev.type === "purchrec.match_resolved" && ev.data) {
      message = `3-way match resolved: ${ev.data.po_id}`;
    } else if (ev.type === "admin.rollout" && ev.data) {
      message = `Rollout v${ev.data.target_version}: ${ev.data.percent}%`;
    } else if (ev.type === "admin.support_ticket" && ev.data) {
      message = `Support ticket: ${ev.data.subject}`;
    } else if (ev.type === "admin.flag_update" && ev.data) {
      message = `Flag ${ev.data.flag} → ${ev.data.enabled ? "ON" : "OFF"}`;
    }

    return { message, agoStr, ...info };
  };

  return (
    <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4" data-testid="live-activity-feed">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)] animate-pulse" : "bg-red-400")} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Live Activity Feed</h3>
        </div>
        <span className="text-[10px] text-foreground/30">{connected ? "Connected" : "Reconnecting..."}</span>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-hide">
        {events.length === 0 ? (
          <div className="text-xs text-foreground/30 py-3 text-center">
            {connected ? "Waiting for live events... (trigger a POS sale or event change)" : "Connecting to WebSocket..."}
          </div>
        ) : (
          events.slice(0, 10).map((ev, i) => {
            const { message, agoStr, icon, color } = formatEvent(ev);
            return (
              <div key={i} className={cn("flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition-colors", i === 0 ? "bg-primary/5" : "")}>
                <span className={cn("font-mono text-sm w-4 text-center", color)}>{icon}</span>
                <span className="flex-1 text-foreground/70 truncate">{message}</span>
                <span className="text-[10px] text-foreground/30 whitespace-nowrap">{agoStr}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Weather Mini Widget ──────────────────────────────────────────────────
function WeatherWidget({ weather }: { weather: { temp: number; description: string; icon: string } | null }) {
  if (!weather) return null;
  const iconMap: Record<string, React.ReactNode> = {
    "sun": <Sun className="h-5 w-5 text-amber-400" />,
    "cloud-sun": <CloudSun className="h-5 w-5 text-blue-300" />,
    "cloud": <Cloud className="h-5 w-5 text-gray-400" />,
    "cloud-rain": <CloudRain className="h-5 w-5 text-blue-400" />,
    "cloud-snow": <CloudSnow className="h-5 w-5 text-blue-200" />,
    "cloud-lightning": <CloudLightning className="h-5 w-5 text-yellow-400" />,
    "wind": <Wind className="h-5 w-5 text-teal-300" />,
  };
  return (
    <button
      onClick={() => navigateTo("weather-forecast")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/30 bg-card/50 hover:bg-card transition-colors"
      data-testid="dashboard-weather-widget"
    >
      {iconMap[weather.icon] || <Cloud className="h-5 w-5 text-gray-400" />}
      <span className="text-sm font-semibold text-foreground/80">{weather.temp}°F</span>
      <span className="text-[10px] text-foreground/40 hidden sm:inline">{weather.description}</span>
    </button>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────
export default function EnterpriseCommandCenter() {
  const { data, loading, refresh, lastUpdate, dateRange, setDateRange } = useCommandCenter();
  const { events: wsEvents, connected } = useWebSocket();
  const [pulsing, setPulsing] = React.useState<Set<string>>(new Set());

  // Pulse KPIs when relevant WS events arrive
  React.useEffect(() => {
    if (wsEvents.length === 0) return;
    const latest = wsEvents[0];
    const pulseMap: Record<string, string[]> = {
      "pos.transaction": ["revenue", "labor-cost"],
      "inventory.update": ["inventory"],
      "event.stage_changed": ["events"],
      "payroll.executed": ["workflows"],
    };
    const targets = pulseMap[latest.type];
    if (targets) {
      setPulsing(new Set(targets));
      // Auto-refresh data on WS event
      refresh();
      setTimeout(() => setPulsing(new Set()), 2000);
    }
  }, [wsEvents, refresh]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="dashboard-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          <span className="text-sm text-foreground/50">Loading Command Center...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-foreground/50">
        <span>Failed to connect to enterprise engines</span>
      </div>
    );
  }

  const { operations, pos, labor, events, forecasting, event_bus, payroll, workflows, notifications, audit, system_health, weather } = data;
  const lastUpdateStr = lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "...";

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5" data-testid="enterprise-command-center">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground/90 tracking-tight">Operations Command Center</h1>
          <p className="text-[11px] text-foreground/40 mt-0.5">
            {system_health.engines_active}/{system_health.engines_total} engines &middot; Last update: {lastUpdateStr}
            {connected && <span className="ml-2 text-emerald-400">LIVE</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WeatherWidget weather={weather} />
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border", connected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400")} data-testid="ws-status">
            <div className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
            {connected ? "LIVE" : "OFFLINE"}
          </div>
          <button
            onClick={refresh}
            className="rounded-lg border border-border/30 bg-card/50 px-3 py-1.5 text-xs font-medium text-foreground/60 hover:text-foreground hover:bg-card transition-colors"
            data-testid="refresh-dashboard"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div data-testid="date-range-selector" className="flex items-center gap-3 -mt-2">
        <Calendar className="w-4 h-4 text-foreground/40" />
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))} className="bg-card/50 border border-border/30 rounded-lg px-2 py-1 text-xs text-foreground/70" />
          <span className="text-xs text-foreground/30">to</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))} className="bg-card/50 border border-border/30 rounded-lg px-2 py-1 text-xs text-foreground/70" />
        </div>
        {(dateRange.from || dateRange.to) && (
          <button onClick={() => setDateRange({ from: "", to: "" })} className="text-[10px] text-foreground/40 hover:text-foreground/60 underline">Clear</button>
        )}
        <div className="flex gap-1 ml-2">
          {[
            { label: "Today", from: new Date().toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] },
            { label: "7d", from: new Date(Date.now() - 7*86400000).toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] },
            { label: "30d", from: new Date(Date.now() - 30*86400000).toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] },
            { label: "MTD", from: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-01`, to: new Date().toISOString().split("T")[0] },
          ].map(p => (
            <button key={p.label} onClick={() => setDateRange({ from: p.from, to: p.to })}
              className={cn("px-2 py-0.5 rounded text-[10px] border transition-colors",
                dateRange.from === p.from && dateRange.to === p.to ? "bg-blue-500/20 border-blue-500/30 text-blue-300" : "border-border/30 text-foreground/40 hover:text-foreground/60")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Revenue"
          value={`$${(pos.revenue_today || 0).toLocaleString()}`}
          sub={`${pos.transactions_today} transactions`}
          color="green"
          pulse={pulsing.has("revenue")}
          onClick={() => navigateTo("pos-connector")}
        />
        <KPICard
          label="Labor Cost"
          value={`${labor.labor_pct}%`}
          sub={`Target: ${labor.target_pct}%`}
          color={labor.labor_pct > labor.target_pct ? "rose" : "green"}
          pulse={pulsing.has("labor-cost")}
          onClick={() => navigateTo("schedule")}
        />
        <KPICard
          label="Inventory"
          value={`$${Math.round(operations.inventory_value).toLocaleString()}`}
          sub={`${operations.ingredients} items`}
          color="blue"
          pulse={pulsing.has("inventory")}
          onClick={() => navigateTo("inventory")}
        />
        <KPICard
          label="Events"
          value={events.total}
          sub="Pipeline active"
          color="purple"
          pulse={pulsing.has("events")}
          onClick={() => navigateTo("echo-events")}
        />
        <KPICard
          label="Workflows"
          value={workflows.pending}
          sub={`${workflows.completed} completed`}
          color="amber"
          pulse={pulsing.has("workflows")}
          onClick={() => navigateTo("integration-command-center")}
        />
        <KPICard
          label="Forecast"
          value={`${forecasting.accuracy}%`}
          sub="AI accuracy"
          color="cyan"
          onClick={() => navigateTo("forecast-hub")}
        />
      </div>

      {/* Top Sellers + Labor Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top-Selling Items */}
        <div className="lg:col-span-2 rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4" data-testid="top-sellers">
          <SectionHeader title="Top-Selling Items" icon="$" />
          <div className="space-y-0">
            {(pos.top_items || []).map((item: any, i: number) => {
              const maxQty = Math.max(...(pos.top_items || []).map((x: any) => x.quantity || x.qty || 0), 1);
              const qty = item.quantity || item.qty || 0;
              const pct = (qty / maxQty) * 100;
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/10 last:border-0" data-testid={`top-item-${i}`}>
                  <span className="text-[10px] font-mono text-foreground/30 w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground/80 truncate">{item.name || item.item_name}</span>
                      <span className="text-xs font-semibold text-emerald-400 ml-2">${(item.revenue || (qty * (item.price || 0))).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-border/20 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-foreground/40 w-12 text-right">{qty} sold</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {(!pos.top_items || pos.top_items.length === 0) && <div className="text-xs text-foreground/30 py-4 text-center">No sales data</div>}
          </div>
        </div>

        {/* Labor Breakdown Pie */}
        <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4" data-testid="labor-breakdown">
          <SectionHeader title="Labor Breakdown" icon="%" />
          {labor.breakdown ? (
            <div className="space-y-3">
              {/* Visual pie-like bars */}
              <div className="space-y-1.5">
                {[
                  { label: "FOH Servers", value: labor.breakdown.foh_servers, color: "bg-blue-500" },
                  { label: "FOH Bartenders", value: labor.breakdown.foh_bartenders, color: "bg-cyan-500" },
                  { label: "FOH Hosts", value: labor.breakdown.foh_hosts, color: "bg-sky-400" },
                  { label: "BOH Cooks", value: labor.breakdown.boh_cooks, color: "bg-orange-500" },
                  { label: "BOH Prep", value: labor.breakdown.boh_prep, color: "bg-amber-500" },
                  { label: "BOH Dish", value: labor.breakdown.boh_dish, color: "bg-yellow-500" },
                  { label: "Management", value: labor.breakdown.management, color: "bg-purple-500" },
                ].map(seg => {
                  const pct = labor.total_cost > 0 ? (seg.value / labor.total_cost) * 100 : 0;
                  return (
                    <div key={seg.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-foreground/50 w-24 truncate">{seg.label}</span>
                      <div className="flex-1 h-2 bg-border/20 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", seg.color)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-foreground/40 w-12 text-right">{pct.toFixed(0)}%</span>
                      <span className="text-[10px] text-foreground/60 w-16 text-right">${seg.value?.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              {/* Summary */}
              <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs">
                <div>
                  <span className="text-foreground/40">Total: </span>
                  <span className="font-semibold text-foreground/80">${labor.total_cost?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-foreground/40">Revenue: </span>
                  <span className="font-semibold text-foreground/80">${labor.revenue_base?.toLocaleString()}</span>
                </div>
                <div className={cn("font-semibold", labor.labor_pct > labor.target_pct ? "text-rose-400" : "text-emerald-400")}>
                  {labor.labor_pct}%
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-foreground/30 py-4 text-center">No labor data</div>
          )}
        </div>
      </div>

      {/* Live Activity + Sales Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Trend */}
        <div className="lg:col-span-2 rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
          <SectionHeader title="Hourly Revenue" icon="$" />
          <div className="flex items-end gap-1 h-28">
            {(pos.hourly_trend || []).map((h: any, i: number) => {
              const max = Math.max(...(pos.hourly_trend || []).map((x: any) => x.revenue), 1);
              const pct = (h.revenue / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="text-[9px] text-foreground/0 group-hover:text-foreground/50 transition-colors">${h.revenue}</div>
                  <div className="w-full rounded-t bg-blue-500/40 hover:bg-blue-500/70 transition-colors" style={{ height: `${pct}%`, minHeight: 2 }} />
                  <span className="text-[9px] text-foreground/30">{h.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity Feed */}
        <LiveActivityFeed events={wsEvents} connected={connected} />
      </div>

      {/* System Health + Engine Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Events Pipeline */}
        <div className="lg:col-span-2 rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
          <SectionHeader title="Event Pipeline" icon="#" />
          {events.upcoming && events.upcoming.length > 0 ? (
            <div className="space-y-0">
              {events.upcoming.map((ev: any, i: number) => (
                <EventRow key={i} event={ev} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-foreground/30 py-4 text-center">No upcoming events</div>
          )}
        </div>

        {/* System Health */}
        <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
          <SectionHeader title="System Health" icon="*" />
          <div className="grid grid-cols-2 gap-x-4">
            {["operations_core", "ai_forecasting", "pos_integration", "event_lifecycle", "labor_cost", "event_bus", "payroll", "workflow", "notifications", "tamper_audit", "knowledge_engine", "scenario_planner", "menu_ingest", "client_portal"].map(
              (engine) => <EngineStatus key={engine} name={engine} status="active" />
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/20">
            <span className="text-[10px] text-foreground/40">Bus: {event_bus.total_events} events</span>
            <span className="text-[10px] text-foreground/40">&middot;</span>
            <span className="text-[10px] text-foreground/40">Dead: {event_bus.dead_letters}</span>
            <span className="text-[10px] text-foreground/40">&middot;</span>
            <span className="text-[10px] text-foreground/40">WS: {connected ? "OK" : "DOWN"}</span>
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Operations */}
        <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
          <SectionHeader title="Operations" icon=">" />
          <div className="space-y-2">
            <StatRow label="Recipes" value={operations.recipes} />
            <StatRow label="Low Stock" value={operations.low_stock} warn={operations.low_stock > 0} />
            <StatRow label="Invoices" value={operations.invoices_processed} />
            <StatRow label="Productions" value={operations.productions} />
          </div>
        </div>

        {/* Labor & Payroll */}
        <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
          <SectionHeader title="Labor & Payroll" icon="%" />
          <div className="space-y-2">
            <StatRow label="Total Cost" value={`$${labor.total_cost?.toLocaleString()}`} />
            <StatRow label="FOH" value={`$${labor.by_department?.foh?.toLocaleString() || 0}`} />
            <StatRow label="BOH" value={`$${labor.by_department?.boh?.toLocaleString() || 0}`} />
            <StatRow label="Payroll Runs" value={`${payroll.pending_runs} pending`} />
          </div>
        </div>

        {/* Notifications & Audit */}
        <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
          <SectionHeader title="Notifications" icon="!" />
          <div className="flex items-center gap-6 mt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground/80">{notifications.total}</div>
              <div className="text-[10px] text-foreground/40">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{notifications.unread}</div>
              <div className="text-[10px] text-foreground/40">Unread</div>
            </div>
          </div>
        </div>

        {/* Audit + Forecast */}
        <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
          <SectionHeader title="Audit & Forecast" icon="~" />
          <div className="space-y-2">
            <StatRow label="Audit Entries" value={audit.total_entries} />
            <StatRow label="Chain Status" value={audit.chain_healthy ? "Healthy" : "ALERT"} warn={!audit.chain_healthy} good={audit.chain_healthy} />
            <StatRow label="AI Accuracy" value={`${forecasting.accuracy}%`} />
            <StatRow label="Alerts" value={(forecasting.alerts || []).length} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility row component
function StatRow({ label, value, warn, good }: { label: string; value: string | number; warn?: boolean; good?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-foreground/50">{label}</span>
      <span className={cn("font-medium", warn ? "text-rose-400" : good ? "text-emerald-400" : "text-foreground/80")}>{value}</span>
    </div>
  );
}
