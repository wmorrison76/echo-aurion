/**
 * iter185 · Group Event Attendee — read-only itinerary page.
 * Route: /g/event/:code?attendee=CODE   (or ?planner=TOKEN for planner view)
 *
 * Public attendee link for conferences/corporate off-sites. Shows day-by-day
 * schedule with locations, menu links, and kind-specific icons.
 */
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type Session = { id: string; date: string; time: string; duration_min?: number; title: string; location: string; kind?: string; menu_url?: string; notes?: string; owner?: string };
type Event = {
  code: string; company_name: string; event_name: string;
  date_start: string; date_end: string;
  attendee_count?: number;
  welcome_note?: string;
  itinerary?: Session[];
  primary_planner_email?: string;
  resort_planner_email?: string;
};

export default function GroupEventAttendee() {
  const { code } = useParams<{ code: string }>();
  const [sp] = useSearchParams();
  const attendeeCode = sp.get("attendee") || "";
  const plannerToken = sp.get("planner") || "";
  const [event, setEvent] = useState<Event | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false); // iter192 · flags when served from cache
  const cacheKey = `luccca_event_cache_${code || ""}_${attendeeCode || plannerToken || "anon"}`;

  async function load() {
    // iter192 · stale-while-revalidate: paint cache immediately, then revalidate
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.event) {
          setEvent(cached.event); setCanEdit(!!cached.can_edit); setLoading(false);
          setOffline(true);
        }
      }
    } catch {}

    try {
      const headers: Record<string, string> = {};
      if (plannerToken) headers["X-Planner-Token"] = plannerToken;
      const qs = attendeeCode ? `?attendee_code=${encodeURIComponent(attendeeCode)}` : "";
      const r = await fetch(`${API()}/api/group-events/events/${encodeURIComponent(code || "")}${qs}`, { headers });
      if (r.status === 404) { if (!event) setErr("Event not found. Check the link or ask your planner."); return; }
      if (r.status === 401) { if (!event) setErr("This link needs an access code. Ask your planner to share the attendee or planner link."); return; }
      const j = await r.json();
      setEvent(j.event); setCanEdit(!!j.can_edit); setOffline(false);
      try { localStorage.setItem(cacheKey, JSON.stringify({ event: j.event, can_edit: !!j.can_edit, cached_at: Date.now() })); } catch {}
    } catch (e: any) {
      // Network failed — if we already have cached data, stay offline; otherwise bubble error
      if (!event) setErr(`Couldn't load event — ${e.message || e}`);
    }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [code, attendeeCode, plannerToken]);

  if (loading) return <div style={S.loading}>Loading itinerary…</div>;
  if (err) return <div style={S.errorRoot}><div style={S.errorCard}>{err}</div></div>;
  if (!event) return <div style={S.errorRoot}><div style={S.errorCard}>No event data.</div></div>;

  // Group sessions by date
  const byDate: Record<string, Session[]> = {};
  (event.itinerary || []).forEach(s => { (byDate[s.date] ||= []).push(s); });
  const dates = Object.keys(byDate).sort();
  dates.forEach(d => byDate[d].sort((a, b) => a.time.localeCompare(b.time)));

  return (
    <div data-testid="event-root" style={S.root}>
      <header style={S.header}>
        <div style={S.eyebrow}>{event.company_name}</div>
        <h1 style={S.title}>{event.event_name}</h1>
        <div style={S.subtitle}>
          {formatRange(event.date_start, event.date_end)}
          {event.attendee_count && <> · {event.attendee_count} attendees</>}
        </div>
        {canEdit && <div style={S.pillEdit} data-testid="event-can-edit">Planner mode · edits allowed</div>}
        {offline && <div style={S.pillOffline} data-testid="event-offline-pill">Offline · showing cached itinerary</div>}
      </header>

      {event.welcome_note && (
        <div style={S.welcome} data-testid="event-welcome">
          {event.welcome_note}
        </div>
      )}

      {dates.length === 0 && (
        <div data-testid="event-empty" style={S.emptyCard}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Itinerary coming soon</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Check back — your planner is finalising the schedule.</div>
        </div>
      )}

      {dates.map(d => (
        <section key={d} data-testid={`event-day-${d}`} style={{ marginBottom: 20 }}>
          <div style={S.dayHeader}>{formatDay(d)}</div>
          {byDate[d].map(s => (
            <div key={s.id} data-testid={`event-session-${s.id}`} style={S.sessionCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...S.kindIcon, background: kindBg(s.kind) }}>{kindIcon(s.kind)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.sessionTitle}>{s.title}</div>
                  <div style={S.sessionMeta}>
                    {formatTime(s.time)}{s.duration_min ? ` · ${s.duration_min} min` : ""} · 📍 {s.location}
                  </div>
                </div>
              </div>
              {s.notes && <p style={S.sessionNotes}>{s.notes}</p>}
              {s.menu_url && (
                <a href={s.menu_url} target="_blank" rel="noreferrer" style={S.menuLink} data-testid={`event-menu-${s.id}`}>View menu ↗</a>
              )}
            </div>
          ))}
        </section>
      ))}

      <div style={S.foot}>
        For changes contact your planner{event.resort_planner_email ? ` · ${event.resort_planner_email}` : ""}.
      </div>
    </div>
  );
}

function kindIcon(k?: string): string {
  switch (k) {
    case "meal": return "🍽";
    case "coffee-break": return "☕";
    case "keynote": return "🎤";
    case "off-site": return "🚌";
    case "team-building": return "🤝";
    default: return "🪑";
  }
}
function kindBg(k?: string): string {
  switch (k) {
    case "meal": return "rgba(245,158,11,0.15)";
    case "coffee-break": return "rgba(180,83,9,0.15)";
    case "keynote": return "rgba(139,92,246,0.15)";
    case "off-site": return "rgba(6,182,212,0.15)";
    case "team-building": return "rgba(236,72,153,0.15)";
    default: return "rgba(200,169,126,0.12)";
  }
}
function formatTime(t: string): string {
  // "08:30" → "8:30 AM"
  const [h, m] = t.split(":").map(n => parseInt(n, 10));
  if (isNaN(h)) return t;
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ap = h < 12 ? "AM" : "PM";
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ap}`;
}
function formatDay(d: string): string {
  try { return new Date(d + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); }
  catch { return d; }
}
function formatRange(a: string, b: string): string {
  try {
    const aD = new Date(a + "T12:00:00Z"), bD = new Date(b + "T12:00:00Z");
    const s = aD.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const e = bD.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${s} → ${e}`;
  } catch { return `${a} → ${b}`; }
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "radial-gradient(ellipse at top, #0f1523 0%, #050812 60%, #020307 100%)", color: "#f5efe4", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif", padding: "24px 18px 80px", maxWidth: 560, margin: "0 auto" },
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050812", color: "#c8a97e", fontFamily: "system-ui" },
  errorRoot: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050812", padding: 24 },
  errorCard: { maxWidth: 380, padding: 20, borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 14, textAlign: "center", fontFamily: "system-ui" },
  header: { marginBottom: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700 },
  title: { fontSize: 32, margin: "8px 0 6px", fontWeight: 200, letterSpacing: -0.5, color: "#f5efe4", lineHeight: 1.1 },
  subtitle: { fontSize: 12, color: "#94a3b8" },
  pillEdit: { display: "inline-block", marginTop: 10, fontSize: 10, letterSpacing: 1.5, padding: "3px 10px", borderRadius: 999, background: "rgba(34,197,94,0.1)", color: "#86efac", textTransform: "uppercase", fontWeight: 700 },
  pillOffline: { display: "inline-block", marginTop: 10, marginLeft: 8, fontSize: 10, letterSpacing: 1.5, padding: "3px 10px", borderRadius: 999, background: "rgba(245,158,11,0.12)", color: "#fcd34d", textTransform: "uppercase", fontWeight: 700 },

  welcome: { padding: 14, borderRadius: 14, background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.18)", fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 18 },
  emptyCard: { padding: 28, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", textAlign: "center" as const },

  dayHeader: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700, marginBottom: 10 },
  sessionCard: { padding: 12, marginBottom: 8, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" },
  sessionTitle: { fontSize: 14, fontWeight: 700, color: "#f5efe4" },
  sessionMeta: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  sessionNotes: { fontSize: 12, color: "#cbd5e1", marginTop: 8, lineHeight: 1.5 },
  menuLink: { display: "inline-block", marginTop: 8, fontSize: 11, letterSpacing: 1, color: "#c8a97e", textDecoration: "none", textTransform: "uppercase", fontWeight: 700 },
  kindIcon: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },

  foot: { marginTop: 24, fontSize: 10, color: "#64748b", textAlign: "center" as const, letterSpacing: 0.5 },
};
