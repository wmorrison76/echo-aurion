/**
 * FOH Concierge Hub (iter167)
 *
 * One-stop console for a concierge sitting at a desk with a guest:
 *   Tab 1 · Local places  — curated restaurants, cafés, attractions, shopping (walk-time visible)
 *   Tab 2 · Area events   — 7-day outlook of art walks, markets, music, wellness, etc.
 *   Tab 3 · In-house      — next 7 days of property events, BEOs, dining reservations, spa bookings
 *
 * Uses usePanelState to remember active tab + filter across refresh.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePanelState, usePanelScroll } from "../../lib/usePanelState";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};
const PANEL_ID = "foh-concierge-hub";

interface LocalPlace { id: string; name: string; category: string; walk_min: number; rating?: number; note?: string; cuisine?: string; }
interface AreaEvent { id: string; title: string; time: string; where: string; category: string; walk_min: number; date: string; day_offset: number; }
interface InHouseItem { kind: string; title: string; time?: string; guests?: number; guest?: string; outlet?: string; party_size?: number; }

export default function FOHConciergeHub() {
  const [tab, setTab] = usePanelState<"local" | "area" | "inhouse">(PANEL_ID, "active-tab", "local");
  const [placeCat, setPlaceCat] = usePanelState<string>(PANEL_ID, "place-cat", "all");
  const scrollRef = useRef<HTMLDivElement>(null);
  usePanelScroll(PANEL_ID, scrollRef, "scroll-tab-" + tab);

  return (
    <div data-testid="foh-concierge-hub" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>FOH · Concierge Hub</div>
          <h1 style={S.title}>Everything a concierge needs at arm's length</h1>
          <p style={S.sub}>Local intel · 7-day area outlook · live in-house schedule</p>
        </div>
      </header>

      <nav style={S.tabs} role="tablist">
        <Tab id="local" active={tab} set={setTab} label="Local places" count="curated" />
        <Tab id="area" active={tab} set={setTab} label="Area events" count="next 7 days" />
        <Tab id="inhouse" active={tab} set={setTab} label="In-house" count="next 7 days" />
      </nav>

      <div ref={scrollRef} style={S.body}>
        {tab === "local" && <LocalTab category={placeCat} setCategory={setPlaceCat} />}
        {tab === "area" && <AreaTab />}
        {tab === "inhouse" && <InHouseTab />}
      </div>
    </div>
  );
}

function Tab({ id, active, set, label, count }: any) {
  const on = active === id;
  return (
    <button
      data-testid={`foh-concierge-tab-${id}`}
      onClick={() => set(id)}
      role="tab"
      aria-selected={on}
      style={{ ...S.tab, ...(on ? S.tabOn : {}) }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 8 }}>{count}</span>
    </button>
  );
}

// ─── Local places ───────────────────────────────────────────────────────────
const CATEGORIES = ["all", "restaurant", "bar", "cafe", "bakery", "attraction", "nightlife", "shopping"];

function LocalTab({ category, setCategory }: { category: string; setCategory: (v: string) => void }) {
  const [places, setPlaces] = useState<LocalPlace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = category && category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
    fetch(`${API()}/api/foh-concierge/local-places${q}`)
      .then(r => r.json())
      .then(j => setPlaces(j.places || []))
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div>
      <div style={S.filterRow}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            data-testid={`foh-local-cat-${c}`}
            onClick={() => setCategory(c)}
            style={{ ...S.chip, ...(category === c ? S.chipOn : {}) }}
          >
            {c}
          </button>
        ))}
      </div>
      {loading && <div style={S.empty}>Loading…</div>}
      {!loading && places.length === 0 && <div style={S.empty}>No places in this category.</div>}
      <div style={S.grid}>
        {places.map(p => (
          <article key={p.id} style={S.card} data-testid={`foh-place-${p.id}`}>
            <header style={S.cardHead}>
              <div>
                <h3 style={S.cardTitle}>{p.name}</h3>
                <div style={S.cardMeta}>{p.category}{p.cuisine ? ` · ${p.cuisine}` : ""} · {p.walk_min} min walk{p.rating ? ` · ★ ${p.rating}` : ""}</div>
              </div>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}`} target="_blank" rel="noreferrer" style={S.mapLink}>Map ↗</a>
            </header>
            {p.note && <p style={S.cardNote}>{p.note}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── Area events ────────────────────────────────────────────────────────────
function AreaTab() {
  const [events, setEvents] = useState<AreaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch(`${API()}/api/foh-concierge/area-events?days=7`).then(r => r.json()).then(j => setEvents(j.events || [])).catch(() => setEvents([])).finally(() => setLoading(false));
  }, []);
  const byDay = useMemo(() => {
    const m: Record<string, AreaEvent[]> = {};
    events.forEach(e => { (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }, [events]);

  if (loading) return <div style={S.empty}>Loading area events…</div>;
  if (events.length === 0) return <div style={S.empty}>No area events in the next 7 days.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.keys(byDay).sort().map(day => (
        <section key={day} data-testid={`foh-area-day-${day}`}>
          <h3 style={S.dayHeading}>{new Date(day + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h3>
          <div style={S.grid}>
            {byDay[day].map(e => (
              <article key={e.id} style={S.card} data-testid={`foh-area-${e.id}`}>
                <div style={S.cardHead}>
                  <div>
                    <h4 style={S.cardTitle}>{e.title}</h4>
                    <div style={S.cardMeta}>{e.time} · {e.where} · {e.category} · {e.walk_min} min walk</div>
                  </div>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.where)}`} target="_blank" rel="noreferrer" style={S.mapLink}>Map ↗</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── In-house schedule ──────────────────────────────────────────────────────
function InHouseTab() {
  const [data, setData] = useState<{ schedule: Record<string, InHouseItem[]>; totals: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch(`${API()}/api/foh-concierge/in-house-schedule?days=7`).then(r => r.json()).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.empty}>Loading in-house schedule…</div>;
  if (!data) return <div style={S.empty}>Schedule unavailable.</div>;

  const days = Object.keys(data.schedule).sort();
  const kindColor: Record<string, string> = { event: "#c8a97e", dining: "#38bdf8", spa: "#d8b4fe" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {days.map(day => {
        const items = data.schedule[day] || [];
        return (
          <section key={day} data-testid={`foh-inhouse-day-${day}`}>
            <h3 style={S.dayHeading}>
              {new Date(day + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              <span style={{ marginLeft: 10, fontSize: 11, color: "#64748b" }}>· {items.length} scheduled</span>
            </h3>
            {items.length === 0 ? (
              <div style={{ ...S.empty, padding: 14 }}>Nothing scheduled.</div>
            ) : (
              <ul style={S.list}>
                {items.map((it, i) => (
                  <li key={i} style={S.listItem}>
                    <span style={{ ...S.kindPill, color: kindColor[it.kind] || "#c8a97e", borderColor: (kindColor[it.kind] || "#c8a97e") + "40" }}>{it.kind}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "#f8fafc" }}>{it.title}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{it.time || "TBD"}{it.outlet ? ` · ${it.outlet}` : ""}{it.party_size ? ` · pax ${it.party_size}` : ""}{it.guests ? ` · ${it.guests} guests` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ─── styles ────
const S: Record<string, React.CSSProperties> = {
  root: { height: "100%", display: "flex", flexDirection: "column", background: "#04060d", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" },
  header: { padding: "14px 20px", borderBottom: "1px solid rgba(200,169,126,0.15)" },
  eyebrow: { fontSize: 10, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" },
  title: { fontSize: 18, fontWeight: 700, color: "#f8fafc", marginTop: 4 },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  tabs: { display: "flex", gap: 4, padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" },
  tab: { padding: "12px 18px", background: "transparent", border: 0, color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", borderBottom: "2px solid transparent" },
  tabOn: { color: "#c8a97e", borderBottomColor: "#c8a97e" },
  body: { flex: 1, overflow: "auto", padding: "18px 20px", minHeight: 0 },
  filterRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
  chip: { padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 12, cursor: "pointer", textTransform: "capitalize" },
  chipOn: { background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 },
  card: { padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 },
  cardHead: { display: "flex", gap: 8, justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 14, color: "#f8fafc", fontWeight: 700, margin: 0 },
  cardMeta: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  cardNote: { marginTop: 8, fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 },
  mapLink: { fontSize: 11, color: "#c8a97e", textDecoration: "none", padding: "4px 8px", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6, whiteSpace: "nowrap" },
  empty: { padding: 30, textAlign: "center", color: "#64748b", fontSize: 13 },
  dayHeading: { fontSize: 13, fontWeight: 700, color: "#c8a97e", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 },
  listItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6 },
  kindPill: { fontSize: 9, padding: "2px 8px", border: "1px solid", borderRadius: 999, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, minWidth: 44, textAlign: "center" },
};
