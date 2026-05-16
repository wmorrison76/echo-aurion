import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle,
  ChefHat, Clock, ShoppingCart, FileText, RefreshCw,
  ArrowUpRight, ArrowDownRight, BarChart3, Activity, Gauge,
  ChevronRight, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;

async function api(path: string) {
  const res = await fetch(`${BACKEND}/api/event-cost-tracker${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type ViewMode = "aggregate" | "detail";

export default function EventCostTrackerPanel() {
  const [view, setView] = useState<ViewMode>("aggregate");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#070b14" }} data-testid="event-cost-tracker-panel">
      <Header view={view} onViewChange={setView} onBack={() => { setView("aggregate"); setSelectedEventId(null); }} />
      <div className="flex-1 overflow-y-auto">
        {view === "aggregate" && !selectedEventId && (
          <AggregateView onSelectEvent={(id) => { setSelectedEventId(id); setView("detail"); }} />
        )}
        {view === "detail" && selectedEventId && (
          <DetailView eventId={selectedEventId} />
        )}
      </div>
    </div>
  );
}

function Header({ view, onViewChange, onBack }: { view: ViewMode; onViewChange: (v: ViewMode) => void; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{
        background: "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(239,68,68,0.15))",
        border: "1px solid rgba(234,179,8,0.3)"
      }}>
        <Gauge className="w-[18px] h-[18px] text-amber-400" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-white tracking-wide">Event Cost Tracker</div>
        <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Real-Time P&L Dashboard</div>
      </div>
      {view === "detail" && (
        <button data-testid="cost-tracker-back-btn" onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-md text-slate-400 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          All Events
        </button>
      )}
    </div>
  );
}

function AggregateView({ onSelectEvent }: { onSelectEvent: (id: string) => void }) {
  const [agg, setAgg] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, e] = await Promise.all([api("/aggregate"), api("/events")]);
      setAgg(a);
      setEvents(e.events || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;

  return (
    <div className="p-5 space-y-5">
      {agg && <AggregateKPIs data={agg} />}
      <EventsList events={events} onSelect={onSelectEvent} />
    </div>
  );
}

function AggregateKPIs({ data }: { data: any }) {
  const kpis = [
    { label: "Total Revenue", value: `$${(data.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: "#10b981", sub: `${data.total_events} events` },
    { label: "Net Profit", value: `$${(data.net_profit || 0).toLocaleString()}`, icon: TrendingUp, color: data.net_margin_pct >= 15 ? "#10b981" : "#ef4444", sub: `${data.net_margin_pct}% margin` },
    { label: "Total Guests", value: (data.total_guests || 0).toLocaleString(), icon: Users, color: "#8b5cf6", sub: `$${data.avg_revenue_per_guest}/guest` },
    { label: "Labor Cost", value: `$${(data.total_labor || 0).toLocaleString()}`, icon: Clock, color: "#f59e0b", sub: `of $${(data.total_expenses || 0).toLocaleString()} total` },
    { label: "PO Value", value: `$${(data.total_po_value || 0).toLocaleString()}`, icon: ShoppingCart, color: "#06b6d4", sub: "Purchase Orders" },
    { label: "Invoice Total", value: `$${(data.total_invoice_value || 0).toLocaleString()}`, icon: FileText, color: "#ec4899", sub: "Vendor Invoices" },
  ];

  return (
    <div data-testid="aggregate-kpis">
      <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-3">Portfolio Overview</div>
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
              <span className="text-[10px] font-mono text-slate-500 uppercase">{k.label}</span>
            </div>
            <div className="text-lg font-bold text-white">{k.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsList({ events, onSelect }: { events: any[]; onSelect: (id: string) => void }) {
  return (
    <div data-testid="events-list">
      <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-3">Events ({events.length})</div>
      <div className="space-y-2">
        {events.map((ev) => {
          const margin = ev.net_margin_pct || 0;
          const marginColor = margin >= 15 ? "#10b981" : margin >= 5 ? "#f59e0b" : "#ef4444";
          return (
            <button key={ev.id} data-testid={`event-row-${ev.id}`} onClick={() => onSelect(ev.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:scale-[1.005]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{ev.name}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-mono text-slate-500">{ev.event_date}</span>
                  <span className="text-[10px] text-slate-500">{ev.guest_count} guests</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                    background: ev.has_financials ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                    color: ev.has_financials ? "#6ee7b7" : "#fbbf24",
                  }}>{ev.has_financials ? "Costed" : "Pending"}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                {ev.total_revenue > 0 ? (
                  <>
                    <div className="text-sm font-mono text-white">${ev.total_revenue.toLocaleString()}</div>
                    <div className="text-[10px] font-mono" style={{ color: marginColor }}>{margin}% margin</div>
                  </>
                ) : (
                  <div className="text-[10px] text-slate-600">No financials</div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          );
        })}
        {events.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-sm">No events found</div>
        )}
      </div>
    </div>
  );
}

function DetailView({ eventId }: { eventId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/event/${eventId}`).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <LoadingState />;
  if (!data) return <div className="p-5 text-red-400">Failed to load event data</div>;

  return (
    <div className="p-5 space-y-5" data-testid="event-cost-detail">
      <EventHeader event={data.event} pnl={data.pnl} />
      {data.alerts.length > 0 && <AlertsPanel alerts={data.alerts} />}
      <PnLSummary pnl={data.pnl} />
      <CostBreakdown food={data.food} labor={data.labor} opex={data.operating_expenses} purchasing={data.purchasing} />
      <RevenueBreakdown revenue={data.revenue} />
      <CompletenessCheck completeness={data.completeness} />
    </div>
  );
}

function EventHeader({ event, pnl }: { event: any; pnl: any }) {
  const marginColor = pnl.net_margin_pct >= 15 ? "#10b981" : pnl.net_margin_pct >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center justify-between" data-testid="event-detail-header">
      <div>
        <div className="text-lg font-bold text-white">{event.name}</div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-400">{event.event_date}</span>
          <span className="text-xs text-slate-400">{event.guest_count} guests</span>
          <span className="text-xs text-slate-400">{event.room}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold font-mono" style={{ color: marginColor }}>{pnl.net_margin_pct}%</div>
        <div className="text-[10px] text-slate-500 uppercase">Net Margin</div>
      </div>
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: any[] }) {
  return (
    <div className="space-y-2" data-testid="cost-alerts">
      {alerts.map((a, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{
          background: a.type === "critical" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${a.type === "critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
          color: a.type === "critical" ? "#fca5a5" : "#fde68a",
        }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {a.message}
        </div>
      ))}
    </div>
  );
}

function PnLSummary({ pnl }: { pnl: any }) {
  const items = [
    { label: "Gross Profit", value: `$${(pnl.gross_profit || 0).toLocaleString()}`, pct: `${pnl.gross_margin_pct}%`, color: "#10b981" },
    { label: "Net Profit", value: `$${(pnl.net_profit || 0).toLocaleString()}`, pct: `${pnl.net_margin_pct}%`, color: pnl.net_margin_pct >= 15 ? "#10b981" : "#f59e0b" },
    { label: "Cost/Guest", value: `$${pnl.cost_per_guest}`, pct: "", color: "#8b5cf6" },
    { label: "Revenue/Guest", value: `$${pnl.revenue_per_guest}`, pct: "", color: "#06b6d4" },
  ];

  return (
    <div data-testid="pnl-summary">
      <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-2">P&L Summary</div>
      <div className="grid grid-cols-4 gap-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">{it.label}</div>
            <div className="text-base font-bold text-white">{it.value}</div>
            {it.pct && <div className="text-[10px] font-mono mt-0.5" style={{ color: it.color }}>{it.pct}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CostBreakdown({ food, labor, opex, purchasing }: { food: any; labor: any; opex: any; purchasing: any }) {
  const sections = [
    { title: "Food Cost", icon: ChefHat, color: "#f59e0b", items: [
      { label: "Total", value: `$${food.total_cost}` },
      { label: "Per Guest", value: `$${food.cost_per_guest}` },
      { label: "Food Cost %", value: `${food.food_cost_pct}%`, alert: food.food_cost_pct > 18 },
      { label: "Target", value: `${food.target_range.min}-${food.target_range.max}%` },
    ]},
    { title: "Labor", icon: Clock, color: "#8b5cf6", items: [
      { label: "Total", value: `$${labor.total_cost}` },
      { label: "Staff", value: `${labor.total_staff}` },
      { label: "Labor %", value: `${labor.labor_pct}%`, alert: labor.labor_pct > 35 },
    ]},
    { title: "Operating Expenses", icon: Activity, color: "#06b6d4", items: [
      { label: "Linen", value: `$${opex.linen}` },
      { label: "Misc", value: `$${opex.misc}` },
      { label: "Total", value: `$${opex.total}` },
    ]},
    { title: "Purchasing", icon: ShoppingCart, color: "#ec4899", items: [
      { label: "POs", value: `${purchasing.po_count} ($${purchasing.po_total})` },
      { label: "Invoices", value: `${purchasing.invoice_count} ($${purchasing.invoice_total})` },
    ]},
  ];

  return (
    <div data-testid="cost-breakdown">
      <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-2">Cost Breakdown</div>
      <div className="grid grid-cols-2 gap-3">
        {sections.map((s, i) => (
          <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              <span className="text-xs font-medium text-white">{s.title}</span>
            </div>
            <div className="space-y-1.5">
              {s.items.map((it, j) => (
                <div key={j} className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{it.label}</span>
                  <span className={cn("font-mono", (it as any).alert ? "text-red-400" : "text-slate-300")}>{it.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueBreakdown({ revenue }: { revenue: any }) {
  if (!revenue.items?.length) return null;
  return (
    <div data-testid="revenue-breakdown">
      <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-2">Revenue Breakdown</div>
      <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="space-y-1.5">
          {revenue.items.map((it: any, i: number) => (
            <div key={i} className="flex justify-between text-[11px]">
              <span className="text-slate-500">{it.gl_name}</span>
              <span className="font-mono text-emerald-400">${it.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs pt-1.5 mt-1.5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-white font-medium">Total Revenue</span>
            <span className="font-mono text-emerald-400 font-bold">${revenue.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletenessCheck({ completeness }: { completeness: any }) {
  const checks = [
    { label: "BEO Created", done: completeness.has_beo },
    { label: "Menu Attached", done: completeness.has_menu },
    { label: "Labor Scheduled", done: completeness.has_schedules },
    { label: "Financials Posted", done: completeness.has_financials },
    { label: "Purchase Orders", done: completeness.has_purchase_orders },
    { label: "Invoices", done: completeness.has_invoices },
  ];

  return (
    <div data-testid="completeness-check">
      <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-2">Event Completeness</div>
      <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="grid grid-cols-3 gap-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
              <span className={c.done ? "text-slate-300" : "text-slate-600"}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full" data-testid="cost-tracker-loading">
      <div className="flex items-center gap-2 text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading cost data...</span>
      </div>
    </div>
  );
}
