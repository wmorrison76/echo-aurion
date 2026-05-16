// iter202a · Unified Global Calendar — single view of EVERY department's events.
// Reads from /api/calendar/feed which unions calendar_events + pto_requests +
// group_events + events. Dept checkboxes at top, day-click drill-down side rail,
// basic right-click context menu on days and events.
import React, { useState, useEffect, useMemo, useCallback } from "react";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || window.location.origin;
};

type Department = { id: string; label: string; color: string };
type CalendarEntry = {
  id: string;
  source_id: string;
  source_module: string;
  title: string;
  dept: string;
  start: string;
  end: string;
  all_day: boolean;
  room: string;
  location: string;
  guest_count: number | null;
  requires_av: boolean;
  requires_setup: boolean;
  severity: string;
  status: string;
  color?: string;
  linked_event_id?: string;
  stage?: string;
  reason?: string;
};

const LS_KEY = "unified_calendar_depts_v1";

function loadSelectedDepts(): Set<string> | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (!raw) return null;
    return new Set(JSON.parse(raw));
  } catch { return null; }
}

function saveSelectedDepts(s: Set<string>) {
  try { if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(Array.from(s))); } catch {}
}

function monthWindow(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
  // Extend window by 1 week each side so grid corner days show events
  const winFrom = new Date(start); winFrom.setDate(winFrom.getDate() - 7);
  const winTo = new Date(end); winTo.setDate(winTo.getDate() + 7);
  return { winFrom, winTo, monthStart: start, monthEnd: end };
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthGridDays(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = first.getDay(); // 0 = Sun
  const gridStart = new Date(first); gridStart.setDate(gridStart.getDate() - lead);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function UnifiedCalendarPanel() {
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: "day" | "entry"; payload: any } | null>(null);

  // Load feed whenever cursor or department filter changes
  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const { winFrom, winTo } = monthWindow(cursor);
      const qs = new URLSearchParams();
      qs.set("from", winFrom.toISOString());
      qs.set("to", winTo.toISOString());
      if (selected && selected.size > 0 && departments.length > 0 && selected.size < departments.length) {
        qs.set("depts", Array.from(selected).join(","));
      }
      const r = await fetch(`${API()}/api/calendar/feed?${qs.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setEntries(j.entries || []);
      if (j.departments && departments.length === 0) {
        setDepartments(j.departments);
        const restored = loadSelectedDepts();
        setSelected(restored || new Set(j.departments.map((d: Department) => d.id)));
      }
    } catch (e: any) { setErr(e.message || "failed"); }
    finally { setLoading(false); }
  }, [cursor, selected, departments.length]);

  useEffect(() => { load(); }, [load]);

  // Close context menu on any outside click
  useEffect(() => {
    const off = () => setCtxMenu(null);
    window.addEventListener("click", off);
    window.addEventListener("scroll", off, true);
    return () => { window.removeEventListener("click", off); window.removeEventListener("scroll", off, true); };
  }, []);

  const toggleDept = (id: string) => {
    if (!selected) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    saveSelectedDepts(next);
  };

  const allOn = selected && selected.size === departments.length;
  const setAll = (on: boolean) => {
    const next = on ? new Set(departments.map(d => d.id)) : new Set<string>();
    setSelected(next); saveSelectedDepts(next);
  };

  const days = useMemo(() => monthGridDays(cursor), [cursor]);
  const entriesByDay = useMemo(() => {
    const m = new Map<string, CalendarEntry[]>();
    for (const e of entries) {
      const d = (e.start || "").slice(0, 10);
      if (!d) continue;
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(e);
    }
    return m;
  }, [entries]);

  const deptColor = useCallback((id: string) => departments.find(d => d.id === id)?.color || "#94a3b8", [departments]);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div data-testid="unified-calendar-panel" className="flex flex-col h-full" style={{ background: "#0a0e17", color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(168,85,247,0.12))", border: "1px solid rgba(59,130,246,0.25)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide">Global Calendar</div>
            <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Unified feed · {entries.length} entries · {monthLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="cal-prev" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="px-2 py-1 rounded text-[11px] text-slate-300 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>‹</button>
          <button data-testid="cal-today" onClick={() => setCursor(new Date())} className="px-3 py-1 rounded text-[11px] text-slate-300 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Today</button>
          <button data-testid="cal-next" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="px-2 py-1 rounded text-[11px] text-slate-300 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>›</button>
          <button data-testid="cal-refresh" onClick={load} className="ml-2 px-3 py-1 rounded text-[11px] text-slate-300 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Refresh</button>
        </div>
      </div>

      {/* Department filter bar */}
      <div className="flex items-center gap-2 px-5 py-2 border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)", background: "#070b12" }} data-testid="dept-filter-bar">
        <button data-testid="dept-all" onClick={() => setAll(!allOn)} className="px-2 py-1 rounded text-[10px] font-mono tracking-wider border whitespace-nowrap"
          style={{ background: allOn ? "rgba(59,130,246,0.15)" : "transparent", color: allOn ? "#3b82f6" : "#64748b", borderColor: allOn ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.1)" }}>
          {allOn ? "All depts" : "Show all"}
        </button>
        {departments.map(d => {
          const on = selected?.has(d.id);
          return (
            <label key={d.id} data-testid={`dept-${d.id}`} className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono tracking-wider border cursor-pointer whitespace-nowrap"
              style={{ background: on ? `${d.color}22` : "transparent", color: on ? d.color : "#64748b", borderColor: on ? `${d.color}55` : "rgba(255,255,255,0.08)" }}>
              <input type="checkbox" checked={!!on} onChange={() => toggleDept(d.id)} className="w-3 h-3" />
              <span style={{ color: on ? d.color : "#94a3b8" }}>{d.label}</span>
            </label>
          );
        })}
      </div>

      {err && <div className="px-5 py-2 text-[11px] text-red-300 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(239,68,68,0.08)" }}>Failed: {err}</div>}

      {/* Grid */}
      <div className="flex-1 overflow-auto p-3" data-testid="calendar-grid">
        <div className="grid grid-cols-7 gap-px" style={{ background: "rgba(255,255,255,0.05)" }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="py-1.5 text-center text-[9px] font-mono tracking-wider text-slate-500 uppercase" style={{ background: "#0a0e17" }}>{d}</div>
          ))}
          {days.map((day, i) => {
            const iso = isoDay(day);
            const dayEntries = entriesByDay.get(iso) || [];
            const isCurMonth = day.getMonth() === cursor.getMonth();
            const isToday = iso === isoDay(new Date());
            return (
              <div key={i} data-testid={`day-${iso}`}
                onClick={() => setDrillDate(iso)}
                onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, target: "day", payload: iso }); }}
                className="min-h-[90px] p-1.5 cursor-pointer hover:bg-white/[0.02] transition"
                style={{ background: isCurMonth ? "#0e1320" : "#080b12", opacity: isCurMonth ? 1 : 0.4 }}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-mono ${isToday ? "text-white font-bold" : "text-slate-400"}`}
                    style={isToday ? { background: "rgba(59,130,246,0.2)", padding: "1px 5px", borderRadius: 3 } : {}}>
                    {day.getDate()}
                  </span>
                  {dayEntries.length > 0 && <span className="text-[8px] font-mono text-slate-500">{dayEntries.length}</span>}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEntries.slice(0, 3).map((e, ei) => (
                    <div key={ei} data-testid={`day-${iso}-event-${ei}`}
                      onClick={(ev) => { ev.stopPropagation(); setDrillDate(iso); }}
                      onContextMenu={(ev) => { ev.preventDefault(); ev.stopPropagation(); setCtxMenu({ x: ev.clientX, y: ev.clientY, target: "entry", payload: e }); }}
                      className="text-[9px] truncate px-1 py-0.5 rounded cursor-pointer hover:brightness-125"
                      style={{ background: `${deptColor(e.dept)}1a`, color: deptColor(e.dept), borderLeft: `2px solid ${deptColor(e.dept)}` }}
                      title={`${e.title} — ${e.dept}`}>
                      {e.title}
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-[9px] text-slate-500 font-mono px-1">+{dayEntries.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {loading && <div className="text-center text-xs text-slate-600 py-4">Loading…</div>}
      </div>

      {/* Day drill-down side rail */}
      {drillDate && <DayDrillDown date={drillDate} onClose={() => setDrillDate(null)} departments={departments} />}

      {/* Right-click context menu */}
      {ctxMenu && (
        <div data-testid="ctx-menu" className="fixed z-[99950] rounded-md border py-1 text-[11px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y, background: "#0f1420", borderColor: "rgba(255,255,255,0.15)", minWidth: 180 }}
          onClick={(e) => e.stopPropagation()}>
          {ctxMenu.target === "day" && (
            <>
              <div className="px-3 py-1 text-[9px] text-slate-500 font-mono tracking-wider uppercase border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>{ctxMenu.payload}</div>
              <button data-testid="ctx-view-day" onClick={() => { setDrillDate(ctxMenu.payload); setCtxMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-slate-200">View all activities</button>
              <button onClick={() => { window.open("/", "_self"); setCtxMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-slate-400" disabled>
                + New booking (iter202b)
              </button>
              <button onClick={() => { window.open("/", "_self"); setCtxMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-slate-400" disabled>
                + PTO request (iter202b)
              </button>
            </>
          )}
          {ctxMenu.target === "entry" && (
            <>
              <div className="px-3 py-1 text-[9px] text-slate-500 font-mono tracking-wider uppercase border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>{ctxMenu.payload.dept} · {ctxMenu.payload.title?.slice(0, 22)}</div>
              <button data-testid="ctx-open-source" onClick={() => {
                const e: CalendarEntry = ctxMenu.payload;
                // Deep-link to the owning module where possible
                const map: Record<string, string> = {
                  "conventions": "#panel=echo-events&tab=conventions",
                  "pto": "#panel=schedule",
                  "events": "#panel=echo-events",
                  "groups": "#panel=group-resume",
                };
                const hash = map[e.source_module] || "";
                if (hash) window.location.hash = hash;
                setCtxMenu(null);
              }} className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-slate-200">Open source module</button>
              <button data-testid="ctx-copy-id" onClick={() => { navigator.clipboard?.writeText(ctxMenu.payload.source_id || ""); setCtxMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-slate-200">Copy source ID</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DayDrillDown({ date, onClose, departments }: { date: string; onClose: () => void; departments: Department[] }) {
  const [data, setData] = useState<{ total: number; by_dept: Record<string, CalendarEntry[]> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/calendar/day?date=${date}`);
        if (r.ok) setData(await r.json());
      } finally { setLoading(false); }
    })();
  }, [date]);

  const deptColor = (id: string) => departments.find(d => d.id === id)?.color || "#94a3b8";
  const deptLabel = (id: string) => departments.find(d => d.id === id)?.label || id;

  return (
    <div className="fixed inset-0 z-[99940] flex justify-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div data-testid="day-drill-down" className="w-[440px] h-full overflow-y-auto border-l" style={{ background: "#0a0e17", borderColor: "rgba(255,255,255,0.08)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#0a0e17" }}>
          <div>
            <div className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">Day Drill-down</div>
            <div className="text-sm font-semibold text-white">{new Date(date + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          </div>
          <button data-testid="day-drill-close" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {loading && <div className="text-center text-xs text-slate-600 py-8">Loading…</div>}
        {data && data.total === 0 && <div className="text-center text-xs text-slate-600 py-8">Nothing on this day.</div>}
        {data && Object.entries(data.by_dept).map(([deptId, evs]) => (
          <div key={deptId} className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }} data-testid={`drill-dept-${deptId}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: deptColor(deptId) }} />
              <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: deptColor(deptId) }}>{deptLabel(deptId)} · {evs.length}</span>
            </div>
            <div className="space-y-1.5">
              {evs.map((e, i) => {
                const t = (e.start || "").slice(11, 16);
                const tEnd = (e.end || "").slice(11, 16);
                return (
                  <div key={i} className="p-2 rounded border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-mono text-slate-400 flex-shrink-0">{e.all_day ? "All-day" : `${t}${tEnd ? "–" + tEnd : ""}`}</div>
                      <div className="flex gap-1 flex-shrink-0">
                        {e.requires_av && <span className="text-[8px] px-1 rounded font-mono bg-emerald-500/15 text-emerald-300">AV</span>}
                        {e.requires_setup && <span className="text-[8px] px-1 rounded font-mono bg-amber-500/15 text-amber-300">SETUP</span>}
                      </div>
                    </div>
                    <div className="text-[12px] text-white mt-0.5">{e.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {e.room && <span>{e.room}</span>}
                      {e.location && <span>{e.room ? " · " : ""}{e.location}</span>}
                      {e.guest_count ? <span> · {e.guest_count} guests</span> : null}
                      {e.stage && <span> · {e.stage}</span>}
                      {e.reason && <span> · {e.reason}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
