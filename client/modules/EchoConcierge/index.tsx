/**
 * EchoConcierge — Guest Experience Orchestration Layer (iter168, Phase 1 slice)
 *
 * 3-column command layout per user spec:
 *   LEFT   · Guest Lookup + VIP banner + Stay timeline
 *   CENTER · Experience Composer (NL → structured itinerary via Claude Sonnet 4.5)
 *   RIGHT  · Active Requests + Revenue impact + Vendor directory
 *
 * Note: the previous index.tsx at this path was a tickets/FOH module — kept as
 * tickets.backup.tsx. This new index replaces it as the orchestration entry.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePanelState, usePanelScroll } from "../../lib/usePanelState";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};
const PANEL_ID = "echo-concierge";

interface Guest { id: string; room: string; name: string; adults: number; children: number; vip_tier: string; repeat: boolean; preferences: string[]; dietary: string[]; mobility: string[]; language: string; special_dates: { label: string; date: string }[]; stay_start: string; stay_end: string; }
interface Itin { title: string; kind: string; suggested_time: string; priority: string; vendor_category?: string; revenue_estimate?: number; notes?: string; }
interface Request { id: string; guest_id: string; guest_name: string; guest_room: string; vip_tier: string; kind: string; summary: string; status: string; priority: string; scheduled_for?: string; revenue_estimate: number; actual_revenue: number; created_at: string; vendor_id?: string; notes?: string; }
interface Vendor { id: string; name: string; category: string; tier: string; avg_price: number; rating: number; commission: number; }

const VIP_PALETTE: Record<string, { fg: string; bg: string; label: string }> = {
  owner:    { fg: "#e879f9", bg: "rgba(232,121,249,0.15)", label: "OWNER" },
  platinum: { fg: "#c8a97e", bg: "rgba(200,169,126,0.18)", label: "PLATINUM" },
  gold:     { fg: "#fbbf24", bg: "rgba(251,191,36,0.15)",  label: "GOLD" },
  silver:   { fg: "#cbd5e1", bg: "rgba(203,213,225,0.12)", label: "SILVER" },
  standard: { fg: "#94a3b8", bg: "rgba(148,163,184,0.10)", label: "STANDARD" },
};

export default function EchoConcierge() {
  const [selectedGuestId, setSelectedGuestId] = usePanelState<string | null>(PANEL_ID, "sel-guest", null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [revenue, setRevenue] = useState<{ total_estimated_revenue: number; total_actual_revenue: number; total_requests: number }>({ total_estimated_revenue: 0, total_actual_revenue: 0, total_requests: 0 });
  const [refreshCounter, setRefreshCounter] = useState(0);

  const guest = useMemo(() => guests.find((g) => g.id === selectedGuestId) || null, [guests, selectedGuestId]);

  useEffect(() => {
    fetch(`${API()}/api/guest/profile`).then((r) => r.json()).then((j) => {
      const list: Guest[] = j.guests || [];
      setGuests(list);
      if (list.length && !selectedGuestId) setSelectedGuestId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API()}/api/concierge-v2/requests?limit=50`).then((r) => r.json()).then((j) => setRequests(j.requests || [])).catch(() => {});
    fetch(`${API()}/api/concierge-v2/vendor/list`).then((r) => r.json()).then((j) => setVendors(j.vendors || [])).catch(() => {});
    fetch(`${API()}/api/concierge-v2/revenue-impact?days=30`).then((r) => r.json()).then((j) => setRevenue({ total_estimated_revenue: j.total_estimated_revenue, total_actual_revenue: j.total_actual_revenue, total_requests: j.total_requests })).catch(() => {});
  }, [refreshCounter]);

  return (
    <div data-testid="echo-concierge-panel" style={S.root}>
      <div style={S.columns}>
        <LeftColumn guests={guests} selectedGuestId={selectedGuestId} setSelectedGuestId={setSelectedGuestId} />
        <CenterColumn guest={guest} onRequestCreated={() => setRefreshCounter((n) => n + 1)} />
        <RightColumn requests={requests} vendors={vendors} revenue={revenue} guestId={selectedGuestId} onChanged={() => setRefreshCounter((n) => n + 1)} />
      </div>
    </div>
  );
}

// ─── LEFT COLUMN ────────────────────────────────────────────────────────────
function LeftColumn({ guests, selectedGuestId, setSelectedGuestId }: any) {
  const guest = guests.find((g: Guest) => g.id === selectedGuestId);
  const [query, setQuery] = usePanelState<string>(PANEL_ID, "search", "");
  const scrollRef = useRef<HTMLDivElement>(null);
  usePanelScroll(PANEL_ID, scrollRef, "scroll-left");

  const filtered = query ? guests.filter((g: Guest) => g.name.toLowerCase().includes(query.toLowerCase()) || g.room.includes(query)) : guests;

  return (
    <aside style={S.colLeft}>
      <div style={S.colHeader}>
        <div style={S.eyebrow}>Guest lookup</div>
        <h2 style={S.colTitle}>Who are we helping?</h2>
      </div>
      <input
        data-testid="concierge-guest-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or room #"
        style={S.searchInput}
      />
      {/* iter266.15 · VIP Atlas live feed — VIPs added via VIP Atlas surface
          here instantly so the concierge sees them with no extra step. */}
      <VipAtlasArrivals onSelect={(g) => setSelectedGuestId(g.id)} />
      <div ref={scrollRef} style={S.guestList}>
        {filtered.map((g: Guest) => {
          const vip = VIP_PALETTE[g.vip_tier] || VIP_PALETTE.standard;
          const active = selectedGuestId === g.id;
          return (
            <button key={g.id} data-testid={`concierge-guest-${g.id}`} onClick={() => setSelectedGuestId(g.id)} style={{ ...S.guestRow, ...(active ? S.guestRowActive : {}) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#f8fafc", fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>room {g.room} · {g.adults}A {g.children > 0 ? `${g.children}C` : ""}</div>
                </div>
                <span style={{ fontSize: 9, padding: "2px 7px", background: vip.bg, color: vip.fg, borderRadius: 999, fontWeight: 700, letterSpacing: 1 }}>{vip.label}</span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <div style={S.empty}>No guests match "{query}".</div>}
      </div>

      {guest && (
        <>
          <VIPRecognitionBanner guest={guest} />
          <StayTimelinePlanner guest={guest} />
        </>
      )}
    </aside>
  );
}

function VipAtlasArrivals({ onSelect }: {
  onSelect: (g: { id: string; name: string }) => void;
}) {
  const [vips, setVips] = useState<any[]>([]);
  const [precheck, setPrecheck] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API()}/api/vip-tracker/list?status=all`,
          { headers: { "X-User-Id": "concierge-desk" } })
      .then((r) => r.json())
      .then((j) => setVips((j.rows || j.vips || []).slice(0, 6)))
      .catch(() => setVips([]))
      .finally(() => setLoading(false));
  }, []);

  // Run beverage pre-check for each VIP whose likes mention drinks
  useEffect(() => {
    for (const v of vips) {
      const prefs = (v.likes || v.preferred_beverages || []) as string[];
      if (!prefs.length) continue;
      const vid = v.id;
      fetch(`${API()}/api/beverage-network/vip-precheck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vip_id: vid,
          outlet_id: v.preferred_outlet || null,
          party_size: 2,
          reservation_date: v.checkin_date,
          preferred_beverages: prefs,
          notify: false,
        }),
      })
        .then((r) => r.json())
        .then((d) => setPrecheck((prev) => ({ ...prev, [vid]: d })))
        .catch(() => undefined);
    }
  }, [vips]);

  if (loading) return null;
  if (vips.length === 0) return null;

  return (
    <div data-testid="concierge-vip-atlas-feed" style={{
      marginTop: 10, marginBottom: 8, padding: 10,
      background: "rgba(200,169,126,0.05)",
      border: "1px solid rgba(200,169,126,0.18)", borderRadius: 6,
    }}>
      <div style={{ fontSize: 9, color: "#c8a97e", letterSpacing: 2,
        fontWeight: 700, textTransform: "uppercase", marginBottom: 6,
        display: "flex", alignItems: "center", gap: 6 }}>
        VIP Atlas · Upcoming Arrivals
        <span style={{ marginLeft: "auto", fontFamily: "monospace",
          color: "#94a3b8", fontWeight: 600 }}>{vips.length}</span>
      </div>
      {vips.map((v: any) => {
        const id = v.id;
        const name = v.display_name || v.name || "—";
        const tier = String(v.tier || v.vip_tier || "standard").toLowerCase();
        const tierColor =
          tier === "owner" ? "#e879f9"
          : tier === "platinum" ? "#c8a97e"
          : tier === "gold" ? "#fbbf24"
          : tier === "silver" ? "#cbd5e1" : "#94a3b8";
        const pc = precheck[id];
        const pcStatus = pc?.overall_status;
        return (
          <button
            key={id}
            data-testid={`concierge-vip-atlas-${id}`}
            onClick={() => onSelect({ id, name })}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "6px 8px", marginBottom: 4,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderLeft: `2px solid ${tierColor}`,
              borderRadius: 3, cursor: "pointer", color: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>
              {tier && tier !== "standard" && (
                <span style={{ fontSize: 8, padding: "1px 5px",
                  background: `${tierColor}22`, color: tierColor,
                  borderRadius: 999, fontWeight: 700, letterSpacing: 1,
                  textTransform: "uppercase" }}>{tier}</span>
              )}
              {pcStatus && pcStatus !== "ok" && (
                <span
                  data-testid={`concierge-vip-beverage-${id}-${pcStatus}`}
                  style={{
                    marginLeft: "auto", fontSize: 8, padding: "1px 5px",
                    background: pcStatus === "shortfall" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                    color: pcStatus === "shortfall" ? "#fca5a5" : "#fcd34d",
                    border: `1px solid ${pcStatus === "shortfall" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                    borderRadius: 3, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                  Bev {pcStatus}
                </span>
              )}
            </div>
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
              {v.checkin_date || v.reservation_date || "tba"}
              {v.room ? ` · room ${v.room}` : ""}
              {v.company ? ` · ${v.company}` : ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function VIPRecognitionBanner({ guest }: { guest: Guest }) {
  const vip = VIP_PALETTE[guest.vip_tier] || VIP_PALETTE.standard;
  const flags: string[] = [];
  if (guest.repeat) flags.push("REPEAT");
  guest.special_dates.forEach((s) => flags.push(s.label.toUpperCase()));
  return (
    <div data-testid="concierge-vip-banner" style={{ ...S.vipBanner, borderLeft: `3px solid ${vip.fg}` }}>
      <div style={{ fontSize: 10, color: vip.fg, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{vip.label} · automation armed</div>
      <div style={{ fontSize: 12, color: "#f8fafc", marginTop: 4, fontWeight: 600 }}>{guest.name}</div>
      {flags.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
          {flags.map((f, i) => (<span key={i} style={{ fontSize: 9, padding: "2px 7px", background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.3)", color: "#c8a97e", borderRadius: 999, fontWeight: 700, letterSpacing: 1 }}>{f}</span>))}
        </div>
      )}
      {guest.preferences.length > 0 && (<div style={{ marginTop: 8, fontSize: 10, color: "#94a3b8" }}><span style={{ textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>Prefs:</span> {guest.preferences.join(" · ")}</div>)}
      {guest.dietary.length > 0 && <div style={{ marginTop: 4, fontSize: 10, color: "#fca5a5" }}>⚠ {guest.dietary.join(" · ")}</div>}
    </div>
  );
}

function StayTimelinePlanner({ guest }: { guest: Guest }) {
  const days = useMemo(() => {
    if (!guest.stay_start || !guest.stay_end) return [];
    const out: { date: string; label: string; isToday: boolean }[] = [];
    const s = new Date(guest.stay_start + "T12:00:00Z");
    const e = new Date(guest.stay_end + "T12:00:00Z");
    const today = new Date().toISOString().slice(0, 10);
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      out.push({ date: iso, label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }), isToday: iso === today });
    }
    return out;
  }, [guest]);
  return (
    <div data-testid="concierge-stay-timeline" style={S.timeline}>
      <div style={S.eyebrow}>Stay timeline</div>
      <div style={S.timelineStrip}>
        {days.map((d) => (
          <div key={d.date} style={{ ...S.timelineDay, ...(d.isToday ? S.timelineToday : {}) }} title={d.date}>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{d.label.split(" ")[0]}</div>
            <div style={{ fontSize: 13, color: d.isToday ? "#c8a97e" : "#f8fafc", fontWeight: 700, marginTop: 2 }}>{d.label.split(" ")[1]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CENTER — Experience Composer + Phase 2 tabs ────────────────────────────
function CenterColumn({ guest, onRequestCreated }: { guest: Guest | null; onRequestCreated: () => void }) {
  const [tab, setTab] = usePanelState<"compose" | "dining" | "rooms" | "transport" | "celebration" | "recovery">(PANEL_ID, "center-tab", "compose");
  return (
    <section style={S.colCenter}>
      <nav style={{ display: "flex", gap: 2, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
        {[
          { id: "compose", label: "Compose" },
          { id: "dining", label: "Dining" },
          { id: "rooms", label: "Rooms" },
          { id: "transport", label: "Transport" },
          { id: "celebration", label: "Celebration" },
          { id: "recovery", label: "Recovery" },
        ].map((t) => (
          <button key={t.id} data-testid={`concierge-center-tab-${t.id}`} onClick={() => setTab(t.id as any)}
            style={{ padding: "10px 14px", background: "transparent", border: 0, color: tab === t.id ? "#c8a97e" : "#94a3b8",
                     fontSize: 11, fontWeight: 700, cursor: "pointer", borderBottom: `2px solid ${tab === t.id ? "#c8a97e" : "transparent"}`,
                     textTransform: "uppercase", letterSpacing: 1 }}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "compose" && <ComposeTab guest={guest} onRequestCreated={onRequestCreated} />}
      {tab === "dining" && <DiningTab guest={guest} onRequestCreated={onRequestCreated} />}
      {tab === "rooms" && <RoomsTab guest={guest} onRequestCreated={onRequestCreated} />}
      {tab === "transport" && <TransportTab guest={guest} onRequestCreated={onRequestCreated} />}
      {tab === "celebration" && <CelebrationTab guest={guest} onRequestCreated={onRequestCreated} />}
      {tab === "recovery" && <RecoveryTab guest={guest} onRequestCreated={onRequestCreated} />}
    </section>
  );
}

function ComposeTab({ guest, onRequestCreated }: { guest: Guest | null; onRequestCreated: () => void }) {
  const [prompt, setPrompt] = usePanelState<string>(PANEL_ID, "composer-draft", "");
  const [items, setItems] = useState<Itin[]>([]);
  const [clarifying, setClarifying] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState<Set<number>>(new Set());

  async function compose() {
    if (!guest || !prompt.trim()) return;
    setBusy(true); setErr(null); setItems([]); setClarifying(null);
    try {
      const r = await fetch(`${API()}/api/itinerary/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.id, natural_language: prompt.trim() }),
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 220));
      const j = await r.json();
      setItems(j.itinerary || []);
      setClarifying(j.clarifying_question || null);
    } catch (e: any) { setErr(e?.message || "Failed to compose"); }
    finally { setBusy(false); }
  }

  async function addToRequests(idx: number, item: Itin) {
    if (!guest) return;
    setAdding((prev) => new Set(prev).add(idx));
    try {
      await fetch(`${API()}/api/concierge-v2/request/create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.id, kind: item.kind, summary: item.title,
          priority: item.priority || "normal", notes: item.notes || "", revenue_estimate: item.revenue_estimate || 0 }),
      });
      onRequestCreated();
    } catch {}
    finally { setAdding((prev) => { const s = new Set(prev); s.delete(idx); return s; }); }
  }

  return (
    <div>
      <div style={S.colHeader}>
        <div style={S.eyebrow}>Experience Composer</div>
        <h2 style={S.colTitle}>What does the guest want?</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Type their request in natural language. Echo turns it into bookable actions.</p>
      </div>
      <textarea data-testid="concierge-composer-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={!guest}
        placeholder={guest ? 'e.g. "Plan something romantic tonight — no sushi"' : "Select a guest first"}
        style={{ ...S.textarea, opacity: guest ? 1 : 0.5 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button data-testid="concierge-composer-submit" onClick={compose} disabled={busy || !guest || !prompt.trim()} style={S.primaryBtn}>
          {busy ? "Composing…" : "✨ Compose experience"}
        </button>
        <button data-testid="concierge-composer-clear" onClick={() => { setPrompt(""); setItems([]); setClarifying(null); }} style={S.ghostBtn}>Clear</button>
      </div>
      {err && <div data-testid="concierge-composer-err" style={S.errBox}>{err}</div>}
      {clarifying && <div style={S.clarify}><strong style={{ color: "#c8a97e" }}>Echo needs one more thing:</strong> {clarifying}</div>}

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }} data-testid="concierge-itinerary-list">
        {items.map((it, i) => (
          <article key={i} style={S.itinCard}>
            <div style={S.itinHead}>
              <div>
                <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>{it.title}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, textTransform: "uppercase", letterSpacing: 1 }}>
                  {it.kind} · {it.suggested_time || "TBD"}{it.vendor_category ? ` · ${it.vendor_category}` : ""}
                </div>
              </div>
              <span style={{ ...S.priorityPill, ...(it.priority === "urgent" ? { background: "rgba(239,68,68,0.15)", color: "#fca5a5" } : it.priority === "high" ? { background: "rgba(245,158,11,0.15)", color: "#fbbf24" } : {}) }}>{it.priority || "normal"}</span>
            </div>
            {it.notes && <p style={{ marginTop: 8, fontSize: 11, color: "#cbd5e1", lineHeight: 1.5 }}>{it.notes}</p>}
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#c8a97e", fontWeight: 700 }}>{it.revenue_estimate ? `+$${it.revenue_estimate}` : ""}</span>
              <button data-testid={`concierge-itin-add-${i}`} onClick={() => addToRequests(i, it)} disabled={adding.has(i)} style={S.smallBtn}>
                {adding.has(i) ? "Adding…" : "+ Add to requests"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── Phase 2 Tabs (iter171) ─────────────────────────────────────────────────
function useAfterAction(onRequestCreated: () => void) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function notify(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); onRequestCreated(); }
  return { msg, busy, setBusy, notify };
}

function DiningTab({ guest, onRequestCreated }: { guest: Guest | null; onRequestCreated: () => void }) {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [outletId, setOutletId] = usePanelState<string>(PANEL_ID, "dining-outlet", "");
  const [when, setWhen] = useState("");
  const [tablePref, setTablePref] = usePanelState<string>(PANEL_ID, "dining-table-pref", "window");
  const [partySize, setPartySize] = useState(2);
  const [occasion, setOccasion] = useState("");
  const { msg, busy, setBusy, notify } = useAfterAction(onRequestCreated);
  useEffect(() => { fetch(`${API()}/api/concierge-v2/outlets`).then(r => r.json()).then(j => { setOutlets(j.outlets || []); if (j.outlets?.[0] && !outletId) setOutletId(j.outlets[0].id); }); }, []);

  async function reserve() {
    if (!guest || !outletId || !when) return;
    setBusy(true);
    try {
      const r = await fetch(`${API()}/api/concierge-v2/dining/reserve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.id, outlet_id: outletId, when, party_size: partySize, table_preference: tablePref, occasion: occasion || null }),
      });
      const j = await r.json();
      notify(`✓ Booked at ${j.reservation?.outlet_name} · Table ${j.reservation?.table_number}`);
    } finally { setBusy(false); }
  }
  return (
    <div data-testid="concierge-dining-tab">
      <div style={S.eyebrow}>Dining</div>
      <h2 style={S.colTitle}>Book a table</h2>
      <div style={tabGrid}>
        <label style={fieldCol}>Outlet
          <select value={outletId} onChange={e => setOutletId(e.target.value)} style={sel} data-testid="concierge-dining-outlet">
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name} · {o.type}</option>)}
          </select>
        </label>
        <label style={fieldCol}>When (YYYY-MM-DD HH:MM)
          <input value={when} onChange={e => setWhen(e.target.value)} placeholder="2026-02-20 20:00" style={inp} data-testid="concierge-dining-when" />
        </label>
        <label style={fieldCol}>Party size<input type="number" min={1} max={20} value={partySize} onChange={e => setPartySize(Number(e.target.value))} style={inp} /></label>
        <label style={fieldCol}>Table preference
          <select value={tablePref} onChange={e => setTablePref(e.target.value)} style={sel}><option value="window">window</option><option value="booth">booth</option><option value="patio">patio</option><option value="bar">bar</option></select>
        </label>
        <label style={{ ...fieldCol, gridColumn: "1 / -1" }}>Occasion (optional)
          <input value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="anniversary, birthday, business…" style={inp} />
        </label>
      </div>
      <button data-testid="concierge-dining-reserve" onClick={reserve} disabled={busy || !guest || !outletId || !when} style={S.primaryBtn}>{busy ? "Booking…" : "🍽 Reserve"}</button>
      {msg && <div style={S.clarify}>{msg}</div>}
      {guest?.dietary?.length > 0 && <div style={{ ...S.errBox, background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", color: "#fbbf24", marginTop: 10 }}>⚠ Dietary: {guest.dietary.join(", ")}</div>}
    </div>
  );
}

function RoomsTab({ guest, onRequestCreated }: { guest: Guest | null; onRequestCreated: () => void }) {
  const [upgrades, setUpgrades] = useState<{ current: any; upgrades: any[] } | null>(null);
  const [amens, setAmens] = useState<any[]>([]);
  const { msg, busy, setBusy, notify } = useAfterAction(onRequestCreated);
  useEffect(() => {
    if (!guest) return;
    fetch(`${API()}/api/concierge-v2/rooms/upgrades?current_room=${encodeURIComponent(guest.room)}`).then(r => r.json()).then(setUpgrades).catch(() => {});
    fetch(`${API()}/api/concierge-v2/ird/amenities`).then(r => r.json()).then(j => setAmens(j.amenities || []));
  }, [guest?.id]);
  async function requestUpgrade(room: string, tier: string) {
    if (!guest) return;
    setBusy(true);
    try {
      await fetch(`${API()}/api/concierge-v2/request/create`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.id, kind: "other", summary: `Room upgrade ${guest.room} → ${room} (${tier})`, priority: "high", revenue_estimate: 250 }) });
      notify(`✓ Upgrade request logged: ${room}`);
    } finally { setBusy(false); }
  }
  async function sendAmenity(a: any) {
    if (!guest) return;
    setBusy(true);
    try {
      await fetch(`${API()}/api/concierge-v2/request/create`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.id, kind: "other", summary: `IRD amenity: ${a.name} → room ${guest.room}`, priority: "normal", revenue_estimate: a.price }) });
      notify(`✓ Sending ${a.name}`);
    } finally { setBusy(false); }
  }
  return (
    <div data-testid="concierge-rooms-tab">
      <div style={S.eyebrow}>Rooms</div>
      <h2 style={S.colTitle}>Upgrades & IRD amenities</h2>
      {upgrades && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Current: <strong style={{ color: "#f8fafc" }}>{upgrades.current.room}</strong> · {upgrades.current.tier} · {upgrades.current.view}</div>
          <div style={tabGrid}>
            {upgrades.upgrades.map((u: any) => (
              <div key={u.room} data-testid={`concierge-room-upgrade-${u.room}`} style={S.itinCard}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{u.room} · {u.tier}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{u.view} · {u.bed} · max {u.max_pax}</div>
                {u.feat?.length > 0 && <div style={{ fontSize: 10, color: "#c8a97e", marginTop: 4 }}>{u.feat.join(" · ")}</div>}
                <button onClick={() => requestUpgrade(u.room, u.tier)} disabled={busy} style={{ ...S.smallBtn, marginTop: 8 }}>Request upgrade</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ ...S.eyebrow, marginTop: 18 }}>IRD amenities</div>
      <div style={tabGrid}>
        {amens.map(a => (
          <div key={a.id} data-testid={`concierge-amenity-${a.id}`} style={S.itinCard}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>{a.name}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{a.category} · ${a.price} · lead {a.lead_min}m</div>
            <button onClick={() => sendAmenity(a)} disabled={busy} style={{ ...S.smallBtn, marginTop: 6 }}>Send to room</button>
          </div>
        ))}
      </div>
      {msg && <div style={S.clarify}>{msg}</div>}
    </div>
  );
}

function TransportTab({ guest, onRequestCreated }: { guest: Guest | null; onRequestCreated: () => void }) {
  const [opts, setOpts] = useState<any[]>([]);
  const [pickup, setPickup] = useState("Hotel lobby");
  const [dropoff, setDropoff] = useState("");
  const [when, setWhen] = useState("");
  const { msg, busy, setBusy, notify } = useAfterAction(onRequestCreated);
  useEffect(() => { fetch(`${API()}/api/concierge-v2/transport/options`).then(r => r.json()).then(j => setOpts(j.options || [])); }, []);
  async function dispatch(service: string) {
    if (!guest || !dropoff || !when) return;
    setBusy(true);
    try {
      await fetch(`${API()}/api/concierge-v2/transport/request`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.id, pickup_location: pickup, dropoff_location: dropoff, when, service, party_size: 1 }) });
      notify(`✓ ${service} dispatched`);
    } finally { setBusy(false); }
  }
  return (
    <div data-testid="concierge-transport-tab">
      <div style={S.eyebrow}>Transport</div>
      <h2 style={S.colTitle}>Dispatch a ride</h2>
      <div style={tabGrid}>
        <label style={fieldCol}>Pickup<input value={pickup} onChange={e => setPickup(e.target.value)} style={inp} /></label>
        <label style={fieldCol}>Dropoff<input value={dropoff} onChange={e => setDropoff(e.target.value)} placeholder="airport, downtown…" style={inp} data-testid="concierge-transport-dropoff" /></label>
        <label style={{ ...fieldCol, gridColumn: "1 / -1" }}>When<input value={when} onChange={e => setWhen(e.target.value)} placeholder="2026-02-20 14:30" style={inp} /></label>
      </div>
      <div style={tabGrid}>
        {opts.map(o => (
          <button key={o.service} data-testid={`concierge-transport-opt-${o.service}`} disabled={busy || !guest || !dropoff || !when}
            onClick={() => dispatch(o.service)}
            style={{ ...S.itinCard, cursor: "pointer", textAlign: "left", border: "1px solid rgba(200,169,126,0.2)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>{o.label}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>ETA {o.eta_min}m · est ${o.est_cost} · {o.tier}</div>
          </button>
        ))}
      </div>
      {msg && <div style={S.clarify}>{msg}</div>}
    </div>
  );
}

function CelebrationTab({ guest, onRequestCreated }: { guest: Guest | null; onRequestCreated: () => void }) {
  const [celebration, setCelebration] = useState("anniversary");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [cascade, setCascade] = useState<any | null>(null);
  const { msg, busy, setBusy, notify } = useAfterAction(onRequestCreated);
  async function compose() {
    if (!guest || !date) return;
    setBusy(true); setCascade(null);
    try {
      const r = await fetch(`${API()}/api/concierge-v2/celebration/compose`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.id, celebration, date, notes }) });
      const j = await r.json();
      setCascade(j);
      notify(`✨ Celebration composed · ${Object.values(j.cascade || {}).reduce((a: number, b: any) => a + Number(b), 0)} departments notified`);
    } finally { setBusy(false); }
  }
  return (
    <div data-testid="concierge-celebration-tab">
      <div style={S.eyebrow}>Celebration composer</div>
      <h2 style={S.colTitle}>One click · four departments</h2>
      <div style={tabGrid}>
        <label style={fieldCol}>Occasion
          <select value={celebration} onChange={e => setCelebration(e.target.value)} style={sel}>
            <option value="anniversary">Anniversary</option><option value="birthday">Birthday</option><option value="honeymoon">Honeymoon</option>
            <option value="proposal">Proposal</option><option value="milestone">Milestone</option>
          </select>
        </label>
        <label style={fieldCol}>Date<input value={date} onChange={e => setDate(e.target.value)} placeholder="2026-02-20" style={inp} data-testid="concierge-celebration-date" /></label>
        <label style={{ ...fieldCol, gridColumn: "1 / -1" }}>Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inp, minHeight: 56 }} /></label>
      </div>
      <button data-testid="concierge-celebration-compose" onClick={compose} disabled={busy || !guest || !date} style={S.primaryBtn}>{busy ? "Composing…" : "✨ Compose & fan out"}</button>
      {cascade && (
        <div data-testid="concierge-celebration-cascade" style={{ marginTop: 14, padding: 14, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>✓ Cascade fired</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {Object.entries(cascade.cascade || {}).map(([dept, count]: any) => (
              <li key={dept} style={{ padding: "4px 0", fontSize: 12, color: "#f8fafc" }}>
                <span style={{ color: "#c8a97e", fontWeight: 700, textTransform: "uppercase", fontSize: 10, marginRight: 8 }}>{dept}</span>
                {count} ticket{count === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && <div style={S.clarify}>{msg}</div>}
    </div>
  );
}

function RecoveryTab({ guest, onRequestCreated }: { guest: Guest | null; onRequestCreated: () => void }) {
  const [cat, setCat] = useState("room");
  const [desc, setDesc] = useState("");
  const [sev, setSev] = useState("normal");
  const [comp, setComp] = useState("");
  const { msg, busy, setBusy, notify } = useAfterAction(onRequestCreated);
  async function open() {
    if (!guest || !desc) return;
    setBusy(true);
    try {
      await fetch(`${API()}/api/concierge-v2/recovery/open`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guest.id, category: cat, description: desc, severity: sev, compensation_proposed: comp || null }) });
      notify(`✓ Recovery case opened · ${guest.name}`);
      setDesc(""); setComp("");
    } finally { setBusy(false); }
  }
  return (
    <div data-testid="concierge-recovery-tab">
      <div style={S.eyebrow}>Service recovery</div>
      <h2 style={S.colTitle}>Open a case</h2>
      <div style={tabGrid}>
        <label style={fieldCol}>Category
          <select value={cat} onChange={e => setCat(e.target.value)} style={sel}>
            {["room", "dining", "vendor", "weather", "reservation", "other"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={fieldCol}>Severity
          <select value={sev} onChange={e => setSev(e.target.value)} style={sel}>
            {["low", "normal", "high", "critical"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ ...fieldCol, gridColumn: "1 / -1" }}>Description<textarea value={desc} onChange={e => setDesc(e.target.value)} style={{ ...inp, minHeight: 72 }} data-testid="concierge-recovery-desc" /></label>
        <label style={{ ...fieldCol, gridColumn: "1 / -1" }}>Compensation proposed (optional)<input value={comp} onChange={e => setComp(e.target.value)} placeholder="dinner for two, room upgrade…" style={inp} /></label>
      </div>
      <button data-testid="concierge-recovery-open" onClick={open} disabled={busy || !guest || !desc} style={S.primaryBtn}>{busy ? "Opening…" : "⚠ Open recovery case"}</button>
      {msg && <div style={S.clarify}>{msg}</div>}
    </div>
  );
}

const tabGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, margin: "10px 0" };
const fieldCol: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 };
const inp: React.CSSProperties = { padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f8fafc", fontSize: 13, outline: "none" };
const sel: React.CSSProperties = { ...inp };

// ─── RIGHT COLUMN ───────────────────────────────────────────────────────────
function RightColumn({ requests, vendors, revenue, guestId, onChanged }: any) {
  const [tab, setTab] = usePanelState<"requests" | "vendors">(PANEL_ID, "right-tab", "requests");
  return (
    <aside style={S.colRight}>
      <div style={S.colHeader}>
        <div style={{ ...S.eyebrow, padding: "14px 14px 0" }}>Mission control</div>
        <ConciergeRevenueImpact revenue={revenue} />
      </div>
      <nav style={S.tabs}>
        <button data-testid="concierge-tab-requests" onClick={() => setTab("requests")} style={{ ...S.tab, ...(tab === "requests" ? S.tabOn : {}) }}>Active requests</button>
        <button data-testid="concierge-tab-vendors" onClick={() => setTab("vendors")} style={{ ...S.tab, ...(tab === "vendors" ? S.tabOn : {}) }}>Vendor directory</button>
      </nav>
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "requests" && <ActiveRequestsQueue requests={requests} onChanged={onChanged} />}
        {tab === "vendors" && <VendorDirectory vendors={vendors} />}
      </div>
    </aside>
  );
}

function ConciergeRevenueImpact({ revenue }: any) {
  return (
    <div data-testid="concierge-revenue-impact" style={S.revenueStrip}>
      <div style={S.revenueCard}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", fontWeight: 700 }}>REQUESTS · 30D</div>
        <div style={{ fontSize: 20, color: "#f8fafc", fontWeight: 800, marginTop: 3 }}>{revenue?.total_requests || 0}</div>
      </div>
      <div style={S.revenueCard}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", fontWeight: 700 }}>EST</div>
        <div style={{ fontSize: 18, color: "#c8a97e", fontWeight: 800, marginTop: 3 }}>${(revenue?.total_estimated_revenue || 0).toLocaleString()}</div>
      </div>
      <div style={S.revenueCard}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#22c55e", fontWeight: 700 }}>BOOKED</div>
        <div style={{ fontSize: 18, color: "#22c55e", fontWeight: 800, marginTop: 3 }}>${(revenue?.total_actual_revenue || 0).toLocaleString()}</div>
      </div>
    </div>
  );
}

function ActiveRequestsQueue({ requests, onChanged }: { requests: Request[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function updateStatus(rid: string, status: string) {
    setBusy(rid);
    try {
      await fetch(`${API()}/api/concierge-v2/request/${rid}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onChanged();
    } finally { setBusy(null); }
  }
  return (
    <div data-testid="concierge-requests-queue" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {requests.length === 0 && <div style={S.empty}>No requests yet. Use Experience Composer.</div>}
      {requests.map((r) => {
        const vip = VIP_PALETTE[r.vip_tier] || VIP_PALETTE.standard;
        return (
          <div key={r.id} data-testid={`concierge-req-${r.id}`} style={S.reqCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#f8fafc", fontWeight: 600 }}>{r.summary}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>
                  <span style={{ color: vip.fg, fontWeight: 700 }}>{r.guest_name}</span> · room {r.guest_room} · <span style={{ textTransform: "uppercase" }}>{r.kind}</span>
                </div>
              </div>
              <span style={{ ...S.statusPill, ...statusStyle(r.status) }}>{r.status}</span>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
              {r.status === "pending" && <button data-testid={`concierge-req-start-${r.id}`} disabled={busy === r.id} onClick={() => updateStatus(r.id, "in_progress")} style={S.tinyBtn}>Start</button>}
              {r.status === "in_progress" && <button data-testid={`concierge-req-confirm-${r.id}`} disabled={busy === r.id} onClick={() => updateStatus(r.id, "confirmed")} style={S.tinyBtn}>Confirm</button>}
              {(r.status === "confirmed" || r.status === "in_progress") && <button data-testid={`concierge-req-complete-${r.id}`} disabled={busy === r.id} onClick={() => updateStatus(r.id, "completed")} style={S.tinyBtn}>Complete ✓</button>}
              {r.status !== "cancelled" && r.status !== "completed" && <button data-testid={`concierge-req-cancel-${r.id}`} disabled={busy === r.id} onClick={() => updateStatus(r.id, "cancelled")} style={{ ...S.tinyBtn, color: "#fca5a5" }}>Cancel</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "completed":   return { background: "rgba(34,197,94,0.15)", color: "#22c55e" };
    case "confirmed":   return { background: "rgba(56,189,248,0.15)", color: "#38bdf8" };
    case "in_progress": return { background: "rgba(251,191,36,0.15)", color: "#fbbf24" };
    case "cancelled":
    case "failed":      return { background: "rgba(239,68,68,0.15)", color: "#fca5a5" };
    default:            return { background: "rgba(148,163,184,0.15)", color: "#cbd5e1" };
  }
}

function VendorDirectory({ vendors }: { vendors: Vendor[] }) {
  return (
    <div data-testid="concierge-vendors" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
      {vendors.map((v) => (
        <div key={v.id} data-testid={`concierge-vendor-${v.id}`} style={S.vendorRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#f8fafc", fontWeight: 700 }}>{v.name}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{v.category} · {v.tier} · ★ {v.rating}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#c8a97e", fontWeight: 700 }}>${v.avg_price}</div>
            <div style={{ fontSize: 9, color: "#64748b" }}>{v.commission}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { height: "100%", display: "flex", flexDirection: "column", background: "#04060d", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" },
  columns: { flex: 1, display: "grid", gridTemplateColumns: "minmax(280px, 320px) minmax(0, 1fr) minmax(300px, 360px)", minHeight: 0, overflow: "hidden" },
  colLeft: { borderRight: "1px solid rgba(200,169,126,0.12)", display: "flex", flexDirection: "column", minHeight: 0, background: "rgba(255,255,255,0.015)", padding: 14, gap: 10, overflow: "hidden" },
  colCenter: { display: "flex", flexDirection: "column", minHeight: 0, padding: 18, background: "#05080f", overflow: "auto" },
  colRight: { borderLeft: "1px solid rgba(200,169,126,0.12)", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "rgba(0,0,0,0.2)" },
  colHeader: { marginBottom: 8 },
  colTitle: { fontSize: 15, fontWeight: 700, color: "#f8fafc", marginTop: 2 },
  eyebrow: { fontSize: 9, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" },
  searchInput: { padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f8fafc", fontSize: 13, outline: "none" },
  guestList: { flex: "0 1 220px", minHeight: 60, maxHeight: 220, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 },
  guestRow: { padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, cursor: "pointer", textAlign: "left" },
  guestRowActive: { background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.4)" },
  vipBanner: { padding: "12px 14px", background: "rgba(0,0,0,0.25)", borderRadius: 8, marginTop: 4 },
  timeline: { marginTop: 6 },
  timelineStrip: { display: "flex", gap: 4, marginTop: 6, overflowX: "auto", paddingBottom: 4 },
  timelineDay: { minWidth: 44, padding: "6px 4px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, textAlign: "center" },
  timelineToday: { background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.4)" },
  textarea: { width: "100%", minHeight: 110, padding: "12px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f8fafc", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" },
  primaryBtn: { padding: "10px 18px", borderRadius: 8, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 },
  ghostBtn: { padding: "10px 14px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 12, cursor: "pointer" },
  smallBtn: { padding: "6px 12px", borderRadius: 6, background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.3)", color: "#c8a97e", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 },
  tinyBtn: { padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5 },
  errBox: { marginTop: 10, padding: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#fca5a5", fontSize: 11 },
  clarify: { marginTop: 10, padding: 10, background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 6, color: "#f8fafc", fontSize: 12 },
  itinCard: { padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 },
  itinHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  priorityPill: { fontSize: 9, padding: "3px 10px", borderRadius: 999, background: "rgba(148,163,184,0.12)", color: "#cbd5e1", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 },
  tabs: { display: "flex", gap: 2, padding: "0 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginTop: 8 },
  tab: { padding: "10px 12px", background: "transparent", border: 0, color: "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer", borderBottom: "2px solid transparent", textTransform: "uppercase", letterSpacing: 1 },
  tabOn: { color: "#c8a97e", borderBottomColor: "#c8a97e" },
  revenueStrip: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, margin: "8px 12px 0" },
  revenueCard: { padding: "8px 6px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, textAlign: "center" },
  reqCard: { padding: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 },
  statusPill: { fontSize: 9, padding: "3px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, whiteSpace: "nowrap" },
  vendorRow: { padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, display: "flex", gap: 8 },
  empty: { padding: 20, textAlign: "center", color: "#64748b", fontSize: 11 },
};
