/**
 * KDSExpoCommandScreen
 * --------------------
 * Kitchen Control Tower. Top bar · station health rail · live ticket grid
 * · all-day strip. 3 operating modes (restaurant / ird / banquet).
 */
import React, { useEffect, useState } from "react";
import {
  Flame, AlertTriangle, Crown, RefreshCw, ChefHat, Clock, Gauge,
  ArrowRight, Check, Pause, RotateCcw,
} from "lucide-react";
import { useLiveEvents } from "@/hooks/useLiveEvents";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const YELLOW = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#60a5fa";
const PURPLE = "#a855f7";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

const fmtTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const agingColor = (aging: string) => ({ green: GREEN, yellow: YELLOW, red: RED }[aging] || GREEN);
const stationColor = (c: string) => ({ green: GREEN, yellow: YELLOW, red: RED }[c] || GREEN);

type Mode = "" | "restaurant" | "ird" | "banquet";

export default function KDSExpoCommandScreen() {
  const [data, setData] = useState<any>(null);
  const [mode, setMode] = useState<Mode>("");
  const [filter, setFilter] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const url = mode ? `${API}/api/kds/expo?mode=${mode}` : `${API}/api/kds/expo`;
    const r = await fetch(url).then(r => r.json());
    setData(r);
  };

  useEffect(() => {
    fetch(`${API}/api/kds/seed`, { method: "POST" }).then(() => load());
  }, []);
  useEffect(() => { load(); /* eslint-disable-line */ }, [mode]);

  useLiveEvents(["kds."], () => load());

  const bumpItem = async (ticketId: string, idx: number) => {
    setBusy(true);
    await fetch(`${API}/api/kds/tickets/${ticketId}/bump-item`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_index: idx }),
    });
    await load();
    setBusy(false);
  };

  const fireCourse = async (ticketId: string) => {
    setBusy(true);
    await fetch(`${API}/api/kds/tickets/${ticketId}/fire-course`, { method: "POST" });
    await load();
    setBusy(false);
  };

  const holdTicket = async (ticketId: string) => {
    setBusy(true);
    await fetch(`${API}/api/kds/tickets/${ticketId}/hold`, { method: "POST" });
    await load();
    setBusy(false);
  };

  const recallTicket = async (ticketId: string) => {
    setBusy(true);
    await fetch(`${API}/api/kds/tickets/${ticketId}/recall`, { method: "POST" });
    await load();
    setBusy(false);
  };

  if (!data) return <div style={{ background: "#04060d", color: "#94a3b8", padding: 40 }}>Loading KDS…</div>;

  const filteredTickets = (data.tickets || []).filter((t: any) => {
    if (!filter) return true;
    if (filter === "vip") return t.vip;
    if (filter === "allergy") return (t.allergy_flags || []).length > 0;
    if (filter === "late") return t.aging === "red";
    if (filter === "ready") return t.ready_count === t.total_items && t.total_items > 0;
    if (filter === "holding") return t.status === "holding";
    return true;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="kds-expo">
      {/* Top Command Bar */}
      <div className="px-4 sm:px-6 py-3 border-b" style={{ borderColor: BORDER, background: "#0b1020" }} data-testid="kds-top-bar">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>KDS · Expo Command</div>
            <div className="text-[16px] font-semibold text-white">Kitchen Control Tower</div>
          </div>
          <div className="flex-1 grid grid-cols-3 sm:grid-cols-5 gap-3 text-[10px] min-w-[260px]">
            <div className="rounded px-2 py-1" style={{ background: "rgba(0,0,0,0.4)" }}>
              <div style={{ color: "#94a3b8" }}>Active</div>
              <div className="text-white text-[18px] font-semibold">{data.top_bar.active_tickets}</div>
            </div>
            <div className="rounded px-2 py-1" style={{ background: "rgba(0,0,0,0.4)" }}>
              <div style={{ color: "#94a3b8" }}>Danger</div>
              <div className="text-[18px] font-semibold" style={{ color: data.top_bar.danger > 0 ? RED : GREEN }}>{data.top_bar.danger}</div>
            </div>
            <div className="rounded px-2 py-1" style={{ background: "rgba(0,0,0,0.4)" }}>
              <div style={{ color: "#94a3b8" }}>Avg Ticket</div>
              <div className="text-white text-[18px] font-semibold">{fmtTime(data.top_bar.avg_ticket_seconds)}</div>
            </div>
            <div className="rounded px-2 py-1" style={{ background: "rgba(0,0,0,0.4)" }}>
              <div style={{ color: "#94a3b8" }}>Longest</div>
              <div className="text-[18px] font-semibold" style={{ color: YELLOW }}>{fmtTime(data.top_bar.longest?.seconds || 0)}</div>
            </div>
            <div className="rounded px-2 py-1" style={{ background: "rgba(0,0,0,0.4)" }}>
              <div style={{ color: "#94a3b8" }}>Pacing</div>
              <div className="text-[18px] font-semibold" style={{ color: data.top_bar.pacing_drift_min > 3 ? RED : data.top_bar.pacing_drift_min > 0 ? YELLOW : GREEN }}>
                {data.top_bar.pacing_drift_min > 0 ? "+" : ""}{data.top_bar.pacing_drift_min}m
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {(["", "restaurant", "ird", "banquet"] as Mode[]).map(m => (
              <button key={m || "all"} onClick={() => setMode(m)}
                className="px-2 py-1 text-[9px] uppercase rounded"
                style={{ background: mode === m ? `${ACCENT}22` : "transparent", color: mode === m ? ACCENT : "#94a3b8", border: `1px solid ${BORDER}` }}
                data-testid={`mode-${m || "all"}`}>
                {m || "all"}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded" style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }} data-testid="kds-refresh">
            <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 3-column: filters | tickets | stations (collapsed to 1-col on mobile) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[120px_1fr_280px] overflow-hidden">
        {/* Left: filter rail */}
        <div className="hidden lg:block border-r overflow-y-auto p-2 space-y-1" style={{ borderColor: BORDER }} data-testid="kds-filters">
          {["", "vip", "allergy", "late", "ready", "holding"].map(f => (
            <button key={f || "all"} onClick={() => setFilter(f)}
              className="w-full text-left px-2 py-1.5 rounded text-[10px] uppercase"
              style={{ background: filter === f ? `${ACCENT}22` : "rgba(255,255,255,0.03)", color: filter === f ? ACCENT : "#94a3b8" }}
              data-testid={`filter-${f || "all"}`}>
              {f || "all"}
            </button>
          ))}
        </div>

        {/* Center: ticket grid */}
        <div className="overflow-y-auto p-3" data-testid="kds-tickets-grid">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredTickets.map((t: any) => (
              <div key={t.id} className="rounded p-2.5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderLeft: `3px solid ${agingColor(t.aging)}`,
                  border: `1px solid ${t.vip ? PURPLE : BORDER}`,
                }}
                data-testid={`ticket-${t.id}`}>
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-white">
                    {t.mode === "banquet" ? t.function_name : t.mode === "ird" ? `Room ${t.room_no}` : t.table_no}
                  </span>
                  {t.vip && <Crown size={10} style={{ color: PURPLE }} />}
                  {(t.allergy_flags || []).length > 0 && <AlertTriangle size={10} style={{ color: YELLOW }} />}
                  <span className="text-[9px]" style={{ color: "#94a3b8" }}>{t.cover_count} cov</span>
                  <span className="text-[9px]" style={{ color: "#94a3b8" }}>· {t.outlet_slug}</span>
                  <span className="ml-auto text-[10px]" style={{ color: agingColor(t.aging) }}>{fmtTime(t.elapsed_seconds)}</span>
                </div>
                {/* Course + Next action */}
                <div className="flex items-center gap-2 text-[9px]" style={{ color: "#64748b" }}>
                  <span style={{ color: ACCENT }}>course: {t.current_course}</span>
                  {t.celebration && <span style={{ color: PURPLE }}>· {t.celebration}</span>}
                  {(t.allergy_flags || []).length > 0 && <span style={{ color: YELLOW }}>· {t.allergy_flags.join(",")}</span>}
                  <span className="ml-auto">{t.ready_count}/{t.total_items} ready</span>
                </div>
                {/* Items */}
                <div className="mt-1.5 space-y-0.5">
                  {(t.items || []).map((it: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 py-0.5">
                      <span className="text-[10px]" style={{ color: it.status === "bumped" ? GREEN : it.status === "ready" ? GREEN : it.status === "working" ? BLUE : "#94a3b8" }}>
                        {it.status === "bumped" ? "✓" : it.status === "ready" ? "●" : it.status === "working" ? "○" : "·"}
                      </span>
                      <span className="text-[10px] text-white flex-1 truncate">
                        {it.qty > 1 && `${it.qty}× `}{it.name}
                      </span>
                      <span className="text-[8px] px-1 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{it.station_slug}</span>
                      {it.status !== "bumped" && (
                        <button onClick={() => bumpItem(t.id, idx)} disabled={busy}
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: `${GREEN}22`, color: GREEN }}
                          data-testid={`bump-${t.id}-${idx}`}>
                          bump
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Actions */}
                <div className="flex gap-1 mt-2 pt-2 border-t" style={{ borderColor: BORDER }}>
                  <button onClick={() => fireCourse(t.id)} disabled={busy}
                    className="flex-1 py-1 rounded text-[9px] uppercase font-medium"
                    style={{ background: `${ACCENT}20`, color: ACCENT }}
                    data-testid={`fire-${t.id}`}>
                    fire next
                  </button>
                  <button onClick={() => holdTicket(t.id)} disabled={busy}
                    className="flex-1 py-1 rounded text-[9px] uppercase font-medium"
                    style={{ background: `${BLUE}20`, color: BLUE }}
                    data-testid={`hold-${t.id}`}>
                    hold
                  </button>
                  <button onClick={() => recallTicket(t.id)} disabled={busy}
                    className="flex-1 py-1 rounded text-[9px] uppercase font-medium"
                    style={{ background: `${YELLOW}20`, color: YELLOW }}
                    data-testid={`recall-${t.id}`}>
                    recall
                  </button>
                </div>
                {/* Next action hint */}
                <div className="text-[9px] mt-1" style={{ color: "#64748b" }}>→ {t.next_action}</div>
              </div>
            ))}
          </div>
          {filteredTickets.length === 0 && (
            <div className="text-center text-[10px] py-12" style={{ color: "#64748b" }}>No tickets match filter.</div>
          )}
        </div>

        {/* Right: station health */}
        <div className="border-l overflow-y-auto p-3" style={{ borderColor: BORDER }} data-testid="kds-stations">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: ACCENT }}>Station Health</div>
          {(data.station_health || []).map((s: any) => (
            <div key={s.slug} className="rounded p-2 mb-1.5" style={{ background: "rgba(0,0,0,0.3)", borderLeft: `3px solid ${stationColor(s.color)}` }} data-testid={`station-${s.slug}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white">{s.name}</span>
                <span className="text-[9px] uppercase" style={{ color: stationColor(s.color) }}>{s.color}</span>
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: "#94a3b8" }}>
                {s.active} active · avg {fmtTime(s.avg_age_seconds)} · longest {fmtTime(s.longest_seconds)}
              </div>
              {s.suggested_action && (
                <div className="text-[9px] mt-1" style={{ color: YELLOW }}>⚠ {s.suggested_action}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom all-day strip */}
      {data.allday && data.allday.length > 0 && (
        <div className="border-t px-4 py-2 overflow-x-auto" style={{ borderColor: BORDER, background: "#06091a" }} data-testid="kds-allday">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] shrink-0" style={{ color: ACCENT }}>All-day</span>
            <div className="flex gap-2 overflow-x-auto">
              {data.allday.slice(0, 20).map((item: any) => (
                <div key={item.name} className="rounded px-2 py-1 shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="text-[10px] text-white">{item.qty}× {item.name}</div>
                  {item.vip_qty > 0 && <div className="text-[8px]" style={{ color: PURPLE }}>{item.vip_qty} VIP</div>}
                  {item.allergy_variants > 0 && <div className="text-[8px]" style={{ color: YELLOW }}>{item.allergy_variants} allergy</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
