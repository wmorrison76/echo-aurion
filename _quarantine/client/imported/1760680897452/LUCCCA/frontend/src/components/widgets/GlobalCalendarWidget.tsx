import React, { useEffect, useMemo, useState } from "react";

/**
 * GlobalCalendarWidget
 * - Shows next N events (BEO/REO) with status color chips.
 * - Click → dispatch event to open the BEO/REO detail panel.
 * - Data source: for now reads from localStorage "lu:events" (array).
 *   Later, wire a loader that listens to EchoEventStudio changes or your API.
 *
 * Event shape expected (lightweight):
 * { id, type: "BEO"|"REO", status: "PROPOSAL"|"CONTRACT"|"UPDATE"|"POPUP"|"CHANGE",
 *   outlet?: string, covers: number, startISO: string, endISO?: string, title?: string, number?: string }
 */

const STATUS_COLORS = {
  PROPOSAL:  "bg-cyan-500/30 text-cyan-200 ring-cyan-400/40",
  CONTRACT:  "bg-emerald-500/30 text-emerald-200 ring-emerald-400/40",
  UPDATE:    "bg-amber-500/30 text-amber-100 ring-amber-400/40",
  POPUP:     "bg-fuchsia-500/30 text-fuchsia-100 ring-fuchsia-400/40",
  CHANGE:    "bg-rose-500/30 text-rose-100 ring-rose-400/40",
};

export default function GlobalCalendarWidget({ max = 6 }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // seed demo if empty
    const raw = localStorage.getItem("lu:events");
    if (!raw) {
      const demo = [
        { id:"e1", type:"BEO", number:"BEO-2025-104", status:"CONTRACT", covers:120, startISO: new Date(Date.now()+3600e3).toISOString(), title:"Corporate Mixer" },
        { id:"e2", type:"REO", number:"REO-7781", status:"UPDATE", covers:42, startISO: new Date(Date.now()+86400e3*2).toISOString(), title:"Chef’s Table" },
      ];
      localStorage.setItem("lu:events", JSON.stringify(demo));
      setEvents(demo);
    } else {
      try { setEvents(JSON.parse(raw)); } catch {}
    }

    // listen for EchoEventStudio broadcasts
    const onPush = (e) => {
      if (!e?.detail) return;
      setEvents((curr) => {
        const next = upsert(curr, e.detail);
        localStorage.setItem("lu:events", JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener("echo-events-upsert", onPush);
    return () => window.removeEventListener("echo-events-upsert", onPush);
  }, []);

  const upcoming = useMemo(() => {
    return [...events]
      .sort((a,b)=> new Date(a.startISO) - new Date(b.startISO))
      .slice(0, max);
  }, [events, max]);

  return (
    <div className="rounded-2xl p-3 border border-white/12 bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,.35),inset_0_0_0_1px_rgba(255,255,255,.04)]">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Global Calendar</div>
        <button
          className="text-xs px-2 h-7 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
          onClick={()=>window.dispatchEvent(new CustomEvent("open-panel",{detail:{id:"calendar",title:"Global Calendar"}}))}
        >Open</button>
      </div>

      <ul className="space-y-2">
        {upcoming.map(ev => (
          <li key={ev.id}
              className="group p-2 rounded-xl border border-white/10 hover:bg-white/7 flex items-center gap-3 cursor-pointer"
              onClick={()=>window.dispatchEvent(new CustomEvent("open-panel",{detail:{id:"beo", number: ev.number, title: ev.title}}))}
          >
            <span className={`text-[11px] px-2 py-0.5 rounded-full ring-1 ${STATUS_COLORS[ev.status] || "bg-white/10 text-white/80 ring-white/20"}`}>
              {ev.status}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{ev.title || `${ev.type} ${ev.number}`}</div>
              <div className="text-[11px] opacity-75">
                {fmtTime(ev.startISO)} • {ev.type} {ev.number} • {ev.covers} covers
              </div>
            </div>
            <span className="text-[11px] opacity-70">{shortDate(ev.startISO)}</span>
          </li>
        ))}
        {upcoming.length === 0 && <li className="text-sm opacity-70">No upcoming events.</li>}
      </ul>
    </div>
  );
}

function upsert(list, item){
  const i = list.findIndex(x=>x.id===item.id);
  if (i>=0){ const next=[...list]; next[i]={...next[i],...item}; return next; }
  return [...list, item];
}
function fmtTime(iso){ try{ const d=new Date(iso); return d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}); }catch{return ""} }
function shortDate(iso){ try{ const d=new Date(iso); return d.toLocaleDateString([], {month:"short", day:"numeric"}); }catch{return ""} }
