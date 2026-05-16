// iter266.13 · BEO Timeline UI (P&L-replay style for Chef Gio / MaestroBQT)
// =========================================================================
// Handles up to 1500 BEOs/month with:
//   • Horizontal day-strip timeline (month view) virtualized via CSS grid
//   • Color tags: last_minute (red), changed (amber), past (muted), scheduled (cyan)
//   • Multi-select for cumulative covers/revenue/cost totals
//   • Detail drawer with per-person breakdown (covers × $/cover by service style)
//   • Central P&R / Commissary on-hand pull via /api/beverage-network/availability
//   • Live KPI strip
//
// Backend: /api/chef-outlet/beo-timeline + /beo-timeline/cumulative
//          /api/beverage-network/availability (sidebar widget)

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useThemeTokens } from "@/styles/design-tokens";
import {
  CalendarDays, ChefHat, Check, ChevronLeft, ChevronRight, ClipboardList,
  Clock, DollarSign, Filter, Layers, Loader2, Package, RefreshCw, Users, X,
  FileText, BookOpen,
} from "lucide-react";

type BEOEvent = {
  id: string; name: string; property_id?: string; venue_id?: string;
  venue_type?: string; start_at: string; end_at?: string;
  expected_covers: number; estimated_revenue: number; estimated_cost: number;
  client_name?: string; status: string; menu_summary?: string;
  is_past: boolean; is_last_minute: boolean; is_recent_change: boolean;
  color_tag: "last_minute" | "changed" | "past" | "scheduled";
};

type TimelineResp = {
  month: string;
  events: BEOEvent[];
  totals: {
    count: number; past_count: number; future_count: number;
    last_minute_count: number; recent_change_count: number;
    covers_total: number; estimated_revenue_total: number;
    estimated_cost_total: number;
  };
};

type CumulativeResp = {
  count: number; covers: number; revenue: number; cost: number;
  margin_pct: number;
  events: Array<{ id: string; name: string; covers: number; start_at: string }>;
};

const tagColor: Record<BEOEvent["color_tag"], string> = {
  last_minute: "#ef4444",
  changed: "#f59e0b",
  past: "#64748b",
  scheduled: "#38bdf8",
};
const tagLabel: Record<BEOEvent["color_tag"], string> = {
  last_minute: "Last Min",
  changed: "Changed",
  past: "Past",
  scheduled: "Scheduled",
};

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmt$(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function BEOTimelineUI() {
  const t = useThemeTokens();
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<TimelineResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cumulative, setCumulative] = useState<CumulativeResp | null>(null);
  const [detailEvent, setDetailEvent] = useState<BEOEvent | null>(null);
  const [filter, setFilter] = useState<"all" | BEOEvent["color_tag"]>("all");
  const [beverageState, setBeverageState] = useState<any>(null);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/chef-outlet/beo-timeline?month=${month}`);
      const j = await r.json();
      setData(j);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);
  useEffect(() => {
    fetch("/api/beverage-network/availability")
      .then(r => r.json()).then(setBeverageState).catch(() => setBeverageState(null));
  }, []);

  // Recompute cumulative when selection changes
  useEffect(() => {
    if (selected.size === 0) { setCumulative(null); return; }
    const ids = Array.from(selected);
    fetch(`/api/chef-outlet/beo-timeline/cumulative`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids),
    })
      .then(r => r.json()).then(setCumulative).catch(() => setCumulative(null));
  }, [selected]);

  const filtered = useMemo(
    () => (data?.events || []).filter(e => filter === "all" || e.color_tag === filter),
    [data?.events, filter],
  );

  // Group by day for the timeline strip
  const byDay = useMemo(() => {
    const map = new Map<string, BEOEvent[]>();
    for (const e of filtered) {
      const day = (e.start_at || "").slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <div data-testid="beo-timeline-ui" style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: t.panelBg, color: t.textPrimary, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 20px", borderBottom: `1px solid ${t.border}`,
        background: "var(--aurion-surface-elevated)",
      }}>
        <ChefHat size={18} style={{ color: t.accent }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: t.accent, letterSpacing: "0.18em",
            textTransform: "uppercase", fontWeight: 700 }}>
            MaestroBqt · BEO Month Timeline
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {new Date(`${month}-01`).toLocaleDateString(undefined,
              { year: "numeric", month: "long" })}
          </div>
        </div>
        <button data-testid="beo-prev-month" onClick={() => setMonth(shiftMonth(month, -1))}
          style={navBtn(t)}><ChevronLeft size={12} />Prev</button>
        <button data-testid="beo-today" onClick={() => {
          const d = new Date();
          setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }} style={navBtn(t)}>Today</button>
        <button data-testid="beo-next-month" onClick={() => setMonth(shiftMonth(month, 1))}
          style={navBtn(t)}>Next<ChevronRight size={12} /></button>
        <button data-testid="beo-refresh" onClick={fetchTimeline} style={navBtn(t)}>
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        </button>
      </div>

      {/* KPI strip */}
      {data && (
        <div data-testid="beo-totals" style={{
          display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 8, padding: "10px 20px", borderBottom: `1px solid ${t.border}`,
        }}>
          <Kpi t={t} label="Events" value={String(data.totals.count)} icon={<CalendarDays size={11} />} />
          <Kpi t={t} label="Future" value={String(data.totals.future_count)} icon={<Clock size={11} />} />
          <Kpi t={t} label="Past" value={String(data.totals.past_count)} icon={<Layers size={11} />} tone="muted" />
          <Kpi t={t} label="Last-Min" value={String(data.totals.last_minute_count)} icon={<Filter size={11} />} tone={data.totals.last_minute_count > 0 ? "warn" : undefined} color={data.totals.last_minute_count > 0 ? "#ef4444" : undefined} />
          <Kpi t={t} label="Recent Chg" value={String(data.totals.recent_change_count)} icon={<RefreshCw size={11} />} color="#f59e0b" />
          <Kpi t={t} label="Covers" value={data.totals.covers_total.toLocaleString()} icon={<Users size={11} />} />
          <Kpi t={t} label="Est. Revenue" value={fmt$(data.totals.estimated_revenue_total)} icon={<DollarSign size={11} />} color={t.accent} />
        </div>
      )}

      {/* Filter chips */}
      <div style={{
        display: "flex", gap: 6, padding: "8px 20px",
        borderBottom: `1px solid ${t.border}`,
      }}>
        <FilterChip t={t} active={filter === "all"} onClick={() => setFilter("all")} label="All" testid="beo-filter-all" />
        <FilterChip t={t} active={filter === "scheduled"} onClick={() => setFilter("scheduled")} label="Scheduled" color={tagColor.scheduled} testid="beo-filter-scheduled" />
        <FilterChip t={t} active={filter === "last_minute"} onClick={() => setFilter("last_minute")} label="Last-Minute" color={tagColor.last_minute} testid="beo-filter-last-minute" />
        <FilterChip t={t} active={filter === "changed"} onClick={() => setFilter("changed")} label="Changed" color={tagColor.changed} testid="beo-filter-changed" />
        <FilterChip t={t} active={filter === "past"} onClick={() => setFilter("past")} label="Past" color={tagColor.past} testid="beo-filter-past" />
        <div style={{ flex: 1 }} />
        {selected.size > 0 && (
          <button data-testid="beo-clear-selection" onClick={clearSelection} style={{
            ...navBtn(t), borderColor: t.accent, color: t.accent,
          }}>Clear {selected.size}</button>
        )}
      </div>

      {/* Body: timeline + side panels */}
      <div style={{
        flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px",
        overflow: "hidden",
      }}>
        <div data-testid="beo-timeline-strip" style={{ overflow: "auto", padding: "12px 20px" }}>
          {!data || data.events.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
              {loading ? "Loading BEOs…" : "No BEOs for this month yet."}
            </div>
          ) : byDay.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
              No BEOs match the current filter.
            </div>
          ) : (
            byDay.map(([day, events]) => (
              <DaySection
                key={day} day={day} events={events}
                selected={selected} onToggle={toggleSelect}
                onOpenDetail={setDetailEvent} t={t}
              />
            ))
          )}
        </div>

        <aside style={{
          borderLeft: `1px solid ${t.border}`,
          background: "var(--aurion-surface-elevated)",
          overflow: "auto", padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <CumulativePanel t={t} selected={selected} cumulative={cumulative} />
          <BeverageNetworkWidget t={t} state={beverageState} />
        </aside>
      </div>

      {detailEvent && (
        <DetailDrawer event={detailEvent} t={t} onClose={() => setDetailEvent(null)} />
      )}
    </div>
  );
}

// ─────────────── building blocks ───────────────

function navBtn(t: ReturnType<typeof useThemeTokens>): React.CSSProperties {
  return {
    background: "transparent", border: `1px solid ${t.border}`,
    color: t.textSecondary, padding: "5px 9px", borderRadius: 3,
    fontSize: 10, cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", gap: 4, fontWeight: 600,
  };
}

function Kpi({ t, label, value, icon, tone, color }: {
  t: ReturnType<typeof useThemeTokens>;
  label: string; value: string; icon: React.ReactNode;
  tone?: "warn" | "muted"; color?: string;
}) {
  const c = color || (tone === "warn" ? "#f59e0b" : tone === "muted" ? t.textMuted : t.textPrimary);
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 3, padding: "6px 8px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4,
        fontSize: 8, color: t.textMuted, letterSpacing: "0.1em",
        textTransform: "uppercase", fontWeight: 600 }}>
        <span style={{ color: c }}>{icon}</span>{label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: c, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function FilterChip({ t, active, onClick, label, color, testid }: {
  t: ReturnType<typeof useThemeTokens>;
  active: boolean; onClick: () => void; label: string; color?: string; testid: string;
}) {
  return (
    <button data-testid={testid} onClick={onClick} style={{
      padding: "4px 10px", fontSize: 10, fontWeight: 700,
      background: active ? (color || t.accent) : "transparent",
      color: active ? t.panelBg : t.textSecondary,
      border: `1px solid ${active ? (color || t.accent) : t.border}`,
      borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>{label}</button>
  );
}

function DaySection({ day, events, selected, onToggle, onOpenDetail, t }: {
  day: string; events: BEOEvent[];
  selected: Set<string>; onToggle: (id: string) => void;
  onOpenDetail: (e: BEOEvent) => void;
  t: ReturnType<typeof useThemeTokens>;
}) {
  const dateLabel = new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined,
    { weekday: "short", month: "short", day: "numeric" });
  const dayTotal = events.reduce((sum, e) => sum + e.expected_covers, 0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
        position: "sticky", top: 0, background: t.panelBg, padding: "4px 0",
        zIndex: 1,
      }}>
        <span style={{
          fontSize: 9, color: t.accent, fontFamily: "monospace",
          fontWeight: 700, letterSpacing: "0.08em",
        }}>{dateLabel.toUpperCase()}</span>
        <span style={{ fontSize: 9, color: t.textMuted, fontFamily: "monospace" }}>
          {events.length} BEO{events.length !== 1 ? "s" : ""} · {dayTotal} covers
        </span>
        <div style={{ flex: 1, height: 1, background: t.border }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
        {events.map(e => (
          <BEOCard key={e.id} event={e}
            selected={selected.has(e.id)}
            onToggle={() => onToggle(e.id)}
            onOpenDetail={() => onOpenDetail(e)}
            t={t} />
        ))}
      </div>
    </div>
  );
}

function BEOCard({ event, selected, onToggle, onOpenDetail, t }: {
  event: BEOEvent; selected: boolean;
  onToggle: () => void; onOpenDetail: () => void;
  t: ReturnType<typeof useThemeTokens>;
}) {
  const color = tagColor[event.color_tag];
  const timeStr = event.start_at
    ? new Date(event.start_at).toLocaleTimeString(undefined,
      { hour: "numeric", minute: "2-digit" })
    : "—";
  const perCover = event.expected_covers > 0
    ? event.estimated_revenue / event.expected_covers : 0;
  return (
    <div
      data-testid={`beo-card-${event.id}`}
      onClick={onOpenDetail}
      style={{
        background: selected ? `${color}11` : t.surface,
        border: `1px solid ${selected ? color : t.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4, padding: "8px 10px", cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 4,
        opacity: event.is_past && !selected ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          data-testid={`beo-select-${event.id}`}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            width: 14, height: 14, padding: 0,
            background: selected ? color : "transparent",
            border: `1px solid ${selected ? color : t.border}`,
            color: t.panelBg, borderRadius: 2, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {selected && <Check size={10} />}
        </button>
        <span style={{
          fontSize: 9, color, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>{tagLabel[event.color_tag]}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: t.textMuted,
          fontFamily: "monospace" }}>{timeStr}</span>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 700, color: t.textPrimary,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{event.name}</div>
      {event.client_name && (
        <div style={{ fontSize: 10, color: t.textMuted,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.client_name}
        </div>
      )}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4,
        fontSize: 9, fontFamily: "monospace", marginTop: 2,
      }}>
        <Mini t={t} k="Covers" v={String(event.expected_covers)} />
        <Mini t={t} k="$/cv" v={perCover > 0 ? `$${perCover.toFixed(0)}` : "—"} />
        <Mini t={t} k="Rev" v={fmt$(event.estimated_revenue)} />
      </div>
    </div>
  );
}

function Mini({ t, k, v }: {
  t: ReturnType<typeof useThemeTokens>; k: string; v: string;
}) {
  return (
    <div>
      <div style={{ color: t.textMuted, letterSpacing: "0.06em",
        textTransform: "uppercase" }}>{k}</div>
      <div style={{ color: t.accent, fontWeight: 700 }}>{v}</div>
    </div>
  );
}

function CumulativePanel({ t, selected, cumulative }: {
  t: ReturnType<typeof useThemeTokens>;
  selected: Set<string>;
  cumulative: CumulativeResp | null;
}) {
  return (
    <section data-testid="beo-cumulative" style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderTop: `2px solid ${t.accent}`,
      borderRadius: 4, padding: 12,
    }}>
      <div style={{
        fontSize: 10, color: t.accent, letterSpacing: "0.18em",
        textTransform: "uppercase", fontWeight: 700, marginBottom: 4,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <Layers size={12} /> Multi-Select Cumulative
      </div>
      {selected.size === 0 ? (
        <div style={{ fontSize: 11, color: t.textMuted, padding: "8px 0" }}>
          Pick BEOs by their checkboxes to see cumulative covers, revenue, and cost.
        </div>
      ) : !cumulative ? (
        <div style={{ fontSize: 11, color: t.textMuted }}>Computing…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
            <Stat t={t} label="Selected" value={String(cumulative.count)} />
            <Stat t={t} label="Covers" value={cumulative.covers.toLocaleString()} />
            <Stat t={t} label="Est. Revenue" value={fmt$(cumulative.revenue)} color={t.accent} />
            <Stat t={t} label="Est. Cost" value={fmt$(cumulative.cost)} color="#ef4444" />
            <Stat t={t} label="Margin %" value={`${cumulative.margin_pct}%`} color="#22c55e" />
            <Stat t={t} label="Per-cover" value={cumulative.covers > 0 ? `$${(cumulative.revenue / cumulative.covers).toFixed(0)}` : "—"} />
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ t, label, value, color }: {
  t: ReturnType<typeof useThemeTokens>;
  label: string; value: string; color?: string;
}) {
  return (
    <div style={{
      background: t.panelBg, border: `1px solid ${t.border}`,
      borderRadius: 3, padding: "5px 7px",
    }}>
      <div style={{ fontSize: 8, color: t.textMuted, letterSpacing: "0.1em",
        textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700,
        color: color || t.textPrimary, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function BeverageNetworkWidget({ t, state }: {
  t: ReturnType<typeof useThemeTokens>; state: any;
}) {
  if (!state) return null;
  return (
    <section data-testid="beverage-network-widget" style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 4, padding: 12,
    }}>
      <div style={{
        fontSize: 10, color: t.accent, letterSpacing: "0.18em",
        textTransform: "uppercase", fontWeight: 700, marginBottom: 6,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <Package size={12} /> Beverage Network · P&R On-Hand
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Stat t={t} label="Central SKUs" value={String(state.totals?.central_sku_count || 0)} />
        <Stat t={t} label="Value" value={fmt$(state.totals?.central_value || 0)} color={t.accent} />
        <Stat t={t} label="Below Re-Order" value={String(state.totals?.below_reorder_count || 0)} color={(state.totals?.below_reorder_count || 0) > 0 ? "#ef4444" : t.textPrimary} />
        <Stat t={t} label="Outlets Selling" value={String(state.totals?.outlets_with_sales || 0)} />
      </div>
      {state.low_stock?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 4 }}>Low Stock</div>
          {state.low_stock.slice(0, 4).map((c: any) => (
            <div key={c.id} style={{
              display: "flex", justifyContent: "space-between",
              padding: "3px 0", fontSize: 10, borderBottom: `1px dashed ${t.border}`,
            }}>
              <span style={{ color: t.textPrimary,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span style={{ color: c.status === "below_reorder" ? "#ef4444" : "#f59e0b",
                fontFamily: "monospace" }}>{c.on_hand}/{c.par_level}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DetailDrawer({ event, t, onClose }: {
  event: BEOEvent; t: ReturnType<typeof useThemeTokens>; onClose: () => void;
}) {
  const start = new Date(event.start_at);
  const end = event.end_at ? new Date(event.end_at) : null;
  const perCover = event.expected_covers > 0
    ? event.estimated_revenue / event.expected_covers : 0;
  // iter266.16 · enriched detail
  const [detail, setDetail] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ menu: false, order: true, prep: false, setup: false, team: false, messages: false });
  const [autoBuilding, setAutoBuilding] = useState(false);
  const [thread, setThread] = useState<any>(null);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<"chef" | "setup_team">("chef");
  useEffect(() => {
    fetch(`/api/chef-outlet/beo-timeline/${event.id}/detail`)
      .then(r => r.json()).then(setDetail).catch(() => setDetail(null));
    // iter266.17 · WhatsApp-style thread for this BEO
    fetch(`/api/beo-messaging/thread/${event.id}`)
      .then(r => r.json()).then(setThread).catch(() => setThread(null));
  }, [event.id]);

  const autoBuild = async () => {
    setAutoBuilding(true);
    try {
      await fetch(`/api/chef-outlet/beo-timeline/${event.id}/auto-build`,
        { method: "POST" });
      const d = await fetch(`/api/chef-outlet/beo-timeline/${event.id}/detail`)
        .then(r => r.json());
      setDetail(d);
    } finally { setAutoBuilding(false); }
  };

  const sendMessage = async (autoCtx: boolean = false) => {
    const body = autoCtx
      ? thread?.auto_context_template + "\n\n" + composer.trim()
      : composer.trim();
    if (!body) return;
    setSending(true);
    try {
      await fetch(`/api/beo-messaging/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beo_id: event.id,
          sender_id: "desktop-user",
          sender_name: "Booking Coordinator",
          sender_role: "booker",
          body,
          is_auto_context: autoCtx,
          channel: "desktop",
        }),
      });
      setComposer("");
      const t2 = await fetch(`/api/beo-messaging/thread/${event.id}`).then(r => r.json());
      setThread(t2);
    } finally { setSending(false); }
  };
  const open = (k: string) =>
    setExpanded(prev => ({ ...prev, [k]: !prev[k] }));
  const submitOrder = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(
        `/api/chef-outlet/beo-timeline/${event.id}/order/submit?submitted_by=${encodeURIComponent("echo-ai-3-operator")}`,
        { method: "POST" },
      );
      const j = await r.json();
      // Re-fetch detail to refresh order_status
      const d = await fetch(`/api/chef-outlet/beo-timeline/${event.id}/detail`).then(rr => rr.json());
      setDetail(d);
    } finally { setSubmitting(false); }
  };
  return (
    <div
      data-testid="beo-detail-drawer"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        zIndex: 9999, display: "flex", justifyContent: "flex-end",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, height: "100%", background: t.panelBg,
          borderLeft: `2px solid ${tagColor[event.color_tag]}`,
          overflow: "auto", padding: 20, color: t.textPrimary,
        }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: "inline-block", padding: "3px 8px",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", borderRadius: 2,
              background: `${tagColor[event.color_tag]}22`,
              color: tagColor[event.color_tag], marginBottom: 6,
            }}>{tagLabel[event.color_tag]}</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{event.name}</h2>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              {event.client_name} · {event.venue_id}
            </div>
          </div>
          <button data-testid="beo-detail-close" onClick={onClose} style={{
            background: "transparent", border: `1px solid ${t.border}`,
            color: t.textPrimary, padding: 6, borderRadius: 3, cursor: "pointer",
          }}><X size={14} /></button>
        </div>

        {/* iter266.16 · View toggle: Chef vs Banquet Setup Team */}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {[
            { k: "chef" as const, label: "Chef View" },
            { k: "setup_team" as const, label: "Banquet Setup Team View" },
          ].map(o => (
            <button
              key={o.k}
              data-testid={`beo-drawer-view-${o.k}`}
              onClick={() => setView(o.k)}
              style={{
                padding: "5px 10px", fontSize: 10, fontWeight: 700,
                background: view === o.k ? t.accent : "transparent",
                color: view === o.k ? t.panelBg : t.textSecondary,
                border: `1px solid ${view === o.k ? t.accent : t.border}`,
                borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >{o.label}</button>
          ))}
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Stat t={t} label="Start" value={start.toLocaleString()} />
          <Stat t={t} label="End" value={end ? end.toLocaleString() : "—"} />
          <Stat t={t} label="Covers" value={String(event.expected_covers)} />
          <Stat t={t} label="$/Cover" value={perCover > 0 ? `$${perCover.toFixed(0)}` : "—"} />
          <Stat t={t} label="Est. Revenue" value={fmt$(event.estimated_revenue)} color={t.accent} />
          <Stat t={t} label="Est. Cost" value={fmt$(event.estimated_cost)} color="#ef4444" />
        </div>

        {/* Quick-action buttons: PDF, Recipes, Setup, Timeline, Schedule */}
        {detail && (
          <div data-testid="beo-drawer-quick-actions" style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 6, marginTop: 14,
          }}>
            <ActionButton t={t} testid="beo-print-pdf"
              icon={<FileText size={11} />} label="Print BEO PDF"
              onClick={() => window.open(detail.printable_urls.beo_pdf, "_blank")} />
            <ActionButton t={t} testid="beo-print-recipes"
              icon={<BookOpen size={11} />} label="Recipe Packet"
              onClick={() => window.open(detail.printable_urls.recipe_packet, "_blank")} />
            <ActionButton t={t} testid="beo-print-setup"
              icon={<ClipboardList size={11} />} label="Setup Sheet"
              onClick={() => window.open(detail.printable_urls.setup_sheet, "_blank")} />
            <ActionButton t={t} testid="beo-open-timeline-popup"
              icon={<Clock size={11} />} label="Event Timeline"
              onClick={() => openTimelinePopup(detail, event)} />
            {detail.schedule_team_visible && (
              <ActionButton t={t} testid="beo-open-schedule"
                icon={<Users size={11} />} label="Schedule"
                onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "schedule", date: detail.start_at?.slice(0, 10) } }))} />
            )}
          </div>
        )}

        {/* CHEF VIEW: Menu, Order, Prep */}
        {view === "chef" && detail && (
          <>
            <Collapsible t={t} title="Menu" testid="beo-section-menu" count={detail.menu_items.length} expanded={expanded.menu} onToggle={() => open("menu")}>
              {detail.menu_items.length === 0 ? (
                <div style={{ fontSize: 11, color: t.textMuted }}>No menu items recorded yet.</div>
              ) : detail.menu_items.map((m: any, i: number) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "5px 0", fontSize: 11, borderBottom: `1px dashed ${t.border}`,
                }}>
                  <span style={{ color: t.textPrimary }}>
                    {m.name}{" "}
                    {!m.is_costed && (
                      <span style={{
                        fontSize: 8, padding: "1px 4px", marginLeft: 4,
                        color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)",
                        borderRadius: 2, letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}>uncosted</span>
                    )}
                  </span>
                  {m.cost_per_cover != null && (
                    <span style={{ color: t.accent, fontFamily: "monospace", fontWeight: 700 }}>
                      ${m.cost_per_cover.toFixed(2)}/cv
                    </span>
                  )}
                </div>
              ))}
              {detail.menu_summary && (
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 6, fontStyle: "italic" }}>
                  Summary: {detail.menu_summary}
                </div>
              )}
            </Collapsible>

            <Collapsible t={t} title="Order Status" testid="beo-section-order"
              expanded={expanded.order} onToggle={() => open("order")}
              badge={detail.order_status.submitted
                ? { label: "SUBMITTED", color: "#22c55e" }
                : { label: "NOT SUBMITTED", color: "#ef4444" }}>
              {detail.order_status.submitted ? (
                <div style={{ fontSize: 11, color: t.textPrimary }}>
                  <div data-testid="beo-order-submitted-by">By <strong>{detail.order_status.submitted_by}</strong></div>
                  <div>On {detail.order_status.submitted_at ? new Date(detail.order_status.submitted_at).toLocaleString() : "—"}</div>
                  {detail.order_status.expected_arrival && (
                    <div>Arrival: <strong>{new Date(detail.order_status.expected_arrival).toLocaleString()}</strong></div>
                  )}
                  {detail.order_status.vendor && <div>Vendor: {detail.order_status.vendor}</div>}
                  {detail.order_status.total != null && <div>Total: ${detail.order_status.total.toLocaleString()}</div>}
                </div>
              ) : (
                <button
                  data-testid="beo-submit-order"
                  onClick={submitOrder}
                  disabled={submitting}
                  style={{
                    width: "100%", padding: "8px 12px", marginTop: 4,
                    background: t.accent, color: t.panelBg, border: "none",
                    borderRadius: 3, fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: submitting ? "wait" : "pointer", fontFamily: "inherit",
                    opacity: submitting ? 0.6 : 1,
                  }}>
                  {submitting ? "Submitting…" : "Send Order to Purchasing"}
                </button>
              )}
            </Collapsible>

            <Collapsible t={t} title={`Production Sheet · ${detail.same_day_beo_count} same-day BEO${detail.same_day_beo_count !== 1 ? "s" : ""}`}
              testid="beo-section-prep" count={detail.prep_items.length}
              expanded={expanded.prep} onToggle={() => open("prep")}>
              {/* iter266.17 · Echo AI³ auto-build button */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  data-testid="beo-auto-build-prep"
                  onClick={autoBuild}
                  disabled={autoBuilding}
                  style={{
                    padding: "5px 10px", fontSize: 10, fontWeight: 700,
                    background: t.accent, color: t.panelBg, border: "none",
                    borderRadius: 3, cursor: autoBuilding ? "wait" : "pointer",
                    fontFamily: "inherit", letterSpacing: "0.06em",
                    textTransform: "uppercase", opacity: autoBuilding ? 0.6 : 1,
                  }}>
                  {autoBuilding ? "Auto-building…" : "✦ Auto-Build (Echo AI³)"}
                </button>
                {detail.prep_items.length > 0 && (
                  <span style={{ fontSize: 9, color: t.textMuted, alignSelf: "center" }}>
                    Chef approves what Echo AI³ generates.
                  </span>
                )}
              </div>
              {detail.prep_items.length === 0 ? (
                <div style={{ fontSize: 11, color: t.textMuted }}>No prep items yet — click Auto-Build to let Echo AI³ generate the production sheet from the menu.</div>
              ) : detail.prep_items.map((p: any, i: number) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 0", fontSize: 11, borderBottom: `1px dashed ${t.border}`,
                  background: p.is_for_this_beo ? `${t.accent}11` : "transparent",
                  paddingLeft: p.is_for_this_beo ? 6 : 0,
                  borderLeft: p.is_for_this_beo ? `2px solid ${t.accent}` : "none",
                }}>
                  <span style={{ color: t.textPrimary, flex: 1 }}>{p.name}</span>
                  <span style={{ color: t.textSecondary, fontFamily: "monospace", fontSize: 10 }}>
                    {p.quantity_total?.toFixed(1) || "?"} {p.unit || ""}
                  </span>
                  {p.for_beos.length > 1 && (
                    <span style={{
                      fontSize: 8, padding: "1px 4px",
                      color: "#38bdf8", background: "rgba(56,189,248,0.1)",
                      border: "1px solid rgba(56,189,248,0.3)",
                      borderRadius: 2, letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}>×{p.for_beos.length} BEOs</span>
                  )}
                </div>
              ))}
            </Collapsible>

            {/* iter266.17 · WhatsApp-style messages w/ Event Manager */}
            <Collapsible t={t} title="Message Event Manager"
              testid="beo-section-messages" count={thread?.count || 0}
              expanded={expanded.messages} onToggle={() => open("messages")}>
              <div data-testid="beo-thread-list" style={{
                maxHeight: 240, overflowY: "auto", marginBottom: 8,
                background: t.panelBg, border: `1px solid ${t.border}`,
                borderRadius: 4, padding: 8,
              }}>
                {!thread || thread.messages?.length === 0 ? (
                  <div style={{ fontSize: 11, color: t.textMuted, padding: 12, textAlign: "center" }}>
                    No messages yet. Send the first one — it auto-includes BEO #, client, date, and guest count.
                  </div>
                ) : thread.messages.map((m: any) => {
                  const mine = m.sender_id === "desktop-user";
                  return (
                    <div key={m.id} data-testid={`beo-msg-${m.id}`} style={{
                      display: "flex", justifyContent: mine ? "flex-end" : "flex-start",
                      marginBottom: 6,
                    }}>
                      <div style={{
                        maxWidth: "78%",
                        background: mine ? `${t.accent}22` : t.surface,
                        border: `1px solid ${mine ? `${t.accent}44` : t.border}`,
                        borderRadius: 6, padding: "6px 9px",
                      }}>
                        <div style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, marginBottom: 2 }}>
                          {m.sender_name} · {m.channel}
                          {m.is_auto_context && (
                            <span style={{ marginLeft: 6, color: t.accent }}>· auto-ctx</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 11, color: t.textPrimary,
                          whiteSpace: "pre-wrap", lineHeight: 1.4,
                        }}>{m.body}</div>
                        <div style={{ fontSize: 8, color: t.textMuted, marginTop: 2, fontFamily: "monospace" }}>
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {thread?.auto_context_template && (
                <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 4, fontStyle: "italic" }}>
                  Auto-context: {thread.auto_context_template}
                </div>
              )}
              <textarea
                data-testid="beo-composer"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Type a message…"
                style={{
                  width: "100%", minHeight: 50, padding: 8,
                  background: t.panelBg, color: t.textPrimary,
                  border: `1px solid ${t.border}`, borderRadius: 3,
                  fontFamily: "inherit", fontSize: 12, resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button
                  data-testid="beo-send-with-context"
                  onClick={() => sendMessage(true)}
                  disabled={sending || !composer.trim()}
                  style={{
                    flex: 1, padding: "7px 10px",
                    background: t.accent, color: t.panelBg, border: "none",
                    borderRadius: 3, fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    cursor: sending || !composer.trim() ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: sending || !composer.trim() ? 0.5 : 1,
                  }}>
                  {sending ? "Sending…" : "Send w/ BEO Context"}
                </button>
                <button
                  data-testid="beo-send-plain"
                  onClick={() => sendMessage(false)}
                  disabled={sending || !composer.trim()}
                  style={{
                    padding: "7px 12px",
                    background: "transparent", color: t.textPrimary,
                    border: `1px solid ${t.border}`, borderRadius: 3,
                    fontSize: 10, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: sending || !composer.trim() ? 0.5 : 1,
                  }}>
                  Plain
                </button>
              </div>
              <div style={{ fontSize: 9, color: t.textMuted, marginTop: 4 }}>
                Continues seamlessly on MyEcho mobile.
              </div>
            </Collapsible>
          </>
        )}

        {/* SETUP TEAM VIEW: Layout, Equipment, Times */}
        {view === "setup_team" && detail && (
          <>
            <Collapsible t={t} title="Buffet / Setup Layout" testid="beo-section-layout" expanded={true} onToggle={() => undefined}>
              <div style={{ fontSize: 12, color: t.textPrimary, lineHeight: 1.5 }}>
                {detail.setup.buffet_layout || (
                  <span style={{ color: t.textMuted, fontStyle: "italic" }}>
                    No layout notes uploaded. Standard buffet pattern assumed.
                  </span>
                )}
              </div>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <Stat t={t} label="Setup Time" value={`${detail.setup.setup_minutes} min`} />
                <Stat t={t} label="Teardown" value={`${detail.setup.teardown_minutes} min`} />
              </div>
            </Collapsible>

            <Collapsible t={t} title="Itemized Equipment List" testid="beo-section-equipment"
              count={detail.setup.equipment.length} expanded={true} onToggle={() => undefined}>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: t.textMuted, textAlign: "left", borderBottom: `1px solid ${t.border}` }}>
                    <th style={{ padding: "4px 6px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 9 }}>Item</th>
                    <th style={{ padding: "4px 6px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 9, textAlign: "right" }}>Qty</th>
                    <th style={{ padding: "4px 6px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 9, textAlign: "right" }}>Min/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.setup.equipment.map((e: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `1px dashed ${t.border}` }}>
                      <td style={{ padding: "4px 6px", color: t.textPrimary }}>{e.item}</td>
                      <td style={{ padding: "4px 6px", color: t.accent, fontFamily: "monospace", textAlign: "right" }}>{e.qty}</td>
                      <td style={{ padding: "4px 6px", color: t.textSecondary, fontFamily: "monospace", textAlign: "right" }}>{e.setup_min}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Collapsible>
          </>
        )}

        {detail?.schedule_team_visible && detail.schedule_team.length > 0 && (
          <Collapsible t={t} title={`Scheduled Team · ${start.toLocaleDateString()}`}
            testid="beo-section-team" count={detail.schedule_team.length}
            expanded={expanded.team} onToggle={() => open("team")}>
            {detail.schedule_team.map((s: any, i: number) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                padding: "4px 0", fontSize: 11, borderBottom: `1px dashed ${t.border}`,
              }}>
                <div>
                  <div style={{ color: t.textPrimary }}>{s.employee_name}</div>
                  <div style={{ color: t.textMuted, fontSize: 9 }}>{s.position}</div>
                </div>
                <div style={{ color: t.textSecondary, fontFamily: "monospace", fontSize: 10, textAlign: "right" }}>
                  {s.in_time} – {s.out_time}
                  {s.tier && <div style={{ fontSize: 8 }}>T{s.tier}</div>}
                </div>
              </div>
            ))}
          </Collapsible>
        )}

        <div style={{
          marginTop: 18, padding: 10, fontSize: 11, color: t.textMuted,
          fontStyle: "italic", lineHeight: 1.5,
        }}>
          Echo AI³ surfaces this BEO as <strong style={{ color: tagColor[event.color_tag] }}>
            {tagLabel[event.color_tag]}
          </strong>.
          {detail?.days_until_event != null && detail.days_until_event >= 0 &&
            ` ${detail.days_until_event.toFixed(0)} days until event.`}
          {event.is_last_minute && " Watch for last-minute prep + commissary asks."}
        </div>
      </div>
    </div>
  );
}

// iter266.16 · Detached, movable Event Timeline popup window
function openTimelinePopup(detail: any, event: BEOEvent) {
  const w = window.open(
    "", `beo-timeline-${event.id}`,
    "width=520,height=640,scrollbars=yes,resizable=yes",
  );
  if (!w) return;
  const start = new Date(event.start_at);
  const end = event.end_at ? new Date(event.end_at) : null;
  const phases = [
    { label: "Setup arrival", offset: -(detail.setup.setup_minutes || 90) },
    { label: "Guest arrival", offset: 0 },
    { label: "Service begins", offset: 30 },
    { label: "Main course", offset: 60 },
    { label: "Service ends", offset: end ? (end.getTime() - start.getTime()) / 60000 - 30 : 120 },
    { label: "Teardown complete", offset: end ? (end.getTime() - start.getTime()) / 60000 + (detail.setup.teardown_minutes || 60) : 180 },
  ];
  w.document.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>Timeline · ${event.name}</title>
    <style>body{font-family:Georgia,serif;background:#0a0e1a;color:#e2e8f0;margin:20px;padding:0}
    h1{font-size:18px;border-bottom:2px solid #c8a97e;padding-bottom:8px;margin-top:0}
    .row{display:flex;align-items:center;padding:8px 4px;border-bottom:1px dashed rgba(255,255,255,0.1)}
    .time{font-family:monospace;color:#c8a97e;width:160px;font-weight:700}
    .lbl{flex:1;color:#e2e8f0}
    .meta{color:#94a3b8;font-size:11px;margin-bottom:18px}
    </style></head><body>
    <h1>${event.name}</h1>
    <div class="meta">${event.client_name || ""} · ${event.expected_covers} covers</div>
    ${phases.map(p => {
      const t = new Date(start.getTime() + p.offset * 60000);
      return `<div class="row"><div class="time">${t.toLocaleString()}</div><div class="lbl">${p.label}</div></div>`;
    }).join("")}
    <p style="margin-top:24px;color:#64748b;font-size:11px">Drag this window anywhere on your screen — stays open until you close it.</p>
    </body></html>`);
  w.document.close();
}

function Collapsible({ t, title, count, badge, expanded, onToggle, children, testid }: {
  t: ReturnType<typeof useThemeTokens>;
  title: string; count?: number;
  badge?: { label: string; color: string };
  expanded: boolean; onToggle: () => void;
  children: React.ReactNode; testid?: string;
}) {
  return (
    <section data-testid={testid} style={{ marginTop: 16 }}>
      <button onClick={onToggle} data-testid={`${testid}-toggle`} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px",
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: expanded ? "4px 4px 0 0" : 4,
        color: t.textPrimary, cursor: "pointer", fontFamily: "inherit",
      }}>
        <span style={{ color: t.accent, fontFamily: "monospace" }}>{expanded ? "▾" : "▸"}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", flex: 1, textAlign: "left" }}>{title}</span>
        {count !== undefined && (
          <span style={{ fontSize: 9, color: t.textMuted, fontFamily: "monospace" }}>{count}</span>
        )}
        {badge && (
          <span style={{
            fontSize: 9, padding: "2px 6px",
            color: badge.color, background: `${badge.color}22`,
            border: `1px solid ${badge.color}44`,
            borderRadius: 2, fontWeight: 700, letterSpacing: "0.08em",
          }}>{badge.label}</span>
        )}
      </button>
      {expanded && (
        <div style={{
          padding: 10, background: t.panelBg,
          border: `1px solid ${t.border}`, borderTop: "none",
          borderRadius: "0 0 4px 4px",
        }}>{children}</div>
      )}
    </section>
  );
}

function ActionButton({ t, icon, label, onClick, testid }: {
  t: ReturnType<typeof useThemeTokens>;
  icon: React.ReactNode; label: string; onClick: () => void; testid?: string;
}) {
  return (
    <button data-testid={testid} onClick={onClick} style={{
      padding: "5px 8px", fontSize: 10, fontWeight: 700,
      background: "transparent", color: t.textPrimary,
      border: `1px solid ${t.border}`, borderRadius: 3,
      cursor: "pointer", fontFamily: "inherit",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      <span style={{ color: t.accent }}>{icon}</span>{label}
    </button>
  );
}
