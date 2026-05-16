import React, { useState, useEffect, useCallback } from "react";
import { RightClickMenu } from "@/lib/context-menu";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#c8a97e", accentDim: "rgba(200,169,126,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", cyan: "#06b6d4", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }

type Tab = "dashboard" | "profile" | "amenities" | "spend";

function DashboardTab({ onSelectGuest }: { onSelectGuest: (id: string) => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/guest-intel/dashboard`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  const k = data.kpis;
  return (
    <div data-testid="intel-dashboard">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ l: "Guest Profiles", v: k.total_profiles, c: C.accent }, { l: "VIP Guests", v: k.vip_guests, c: C.amber }, { l: "Allergy Alerts", v: k.allergy_alerts, c: C.red }, { l: "Repeat Guests", v: k.repeat_guests, c: C.green }, { l: "Amenities Given", v: k.amenities_delivered, c: C.purple }, { l: "Pending Requests", v: k.pending_requests, c: C.cyan }].map(kpi => (
          <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 130px" }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.c, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Top Guests by Lifetime Spend</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(200,169,126,0.06)" }}>
            {["Guest", "Room", "Visits", "Lifetime Spend", "Avg/Visit", "Allergens", "Tags"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(data.top_guests || []).map((g: any) => (
              <RightClickMenu key={g.guest_id} items={[
                { label: "View Full Profile", icon: "👤", action: () => onSelectGuest(g.guest_id), color: C.accent },
                { label: "View Amenity History", icon: "🎁", action: () => onSelectGuest(g.guest_id), color: C.purple },
                { label: "View Spend Details", icon: "💰", action: () => onSelectGuest(g.guest_id), color: C.green },
                { label: "divider", divider: true, action: () => {} },
                ...(g.allergens?.length > 0 ? [{ label: `ALLERGIES: ${g.allergens.join(", ")}`, icon: "⚠", action: () => {}, color: C.red }] : []),
              ]}>
              <tr style={{ borderBottom: `1px solid ${C.border}40`, cursor: "pointer" }} onClick={() => onSelectGuest(g.guest_id)}>
                <td style={{ padding: "8px 10px", color: C.text, fontWeight: 600 }}>{g.first_name} {g.last_name} {g.vip && <Badge text="VIP" color={C.amber} />}</td>
                <td style={{ padding: "8px 10px", color: C.text }}>{g.room_number}</td>
                <td style={{ padding: "8px 10px", color: C.dim }}>{g.visit_count}</td>
                <td style={{ padding: "8px 10px", color: C.accent, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{fmt(g.lifetime_spend)}</td>
                <td style={{ padding: "8px 10px", color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(g.avg_spend_per_visit)}</td>
                <td style={{ padding: "8px 10px" }}>{(g.allergens || []).length > 0 ? <Badge text={`${g.allergens.length} allergens`} color={C.red} /> : <span style={{ color: C.dim, fontSize: 10 }}>None</span>}</td>
                <td style={{ padding: "8px 10px" }}>{(g.tags || []).slice(0, 3).map((t: string) => <Badge key={t} text={t.replace("_", " ")} color={t.includes("allergy") ? C.red : t.includes("vip") || t.includes("plat") ? C.amber : C.blue} />)}</td>
              </tr>
              </RightClickMenu>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileView({ guestId, onBack }: { guestId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const load = useCallback(() => {
    fetch(`${API}/api/guest-intel/profile/${guestId}`).then(r => r.json()).then(setData);
    fetch(`${API}/api/guest-intel/amenities/${guestId}/suggestions`).then(r => r.json()).then(setSuggestions);
  }, [guestId]);
  useEffect(() => { load(); }, [load]);

  const logAmenity = (name: string, cat: string) => {
    if (!data?.profile) return;
    fetch(`${API}/api/guest-intel/amenities/deliver`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_number: data.profile.room_number, guest_id: guestId, amenity_name: name, amenity_category: cat, visit_number: data.profile.visit_count || 1 }),
    }).then(() => load());
  };

  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  if (!data.found) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Guest not found</div>;
  const p = data.profile;
  const spend = data.spend || {};
  const allergenColors: Record<string, string> = { shellfish: "#ef4444", "tree nuts": "#f59e0b", dairy: "#8b5cf6", eggs: "#f97316", peanuts: "#dc2626", soy: "#06b6d4", wheat: "#d946ef", gluten: "#ec4899" };

  return (
    <div data-testid="intel-profile">
      <button onClick={onBack} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer", marginBottom: 14 }}>← Back</button>

      {/* Header */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: C.accent, fontWeight: 700, flexShrink: 0 }}>{p.first_name?.[0]}{p.last_name?.[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{p.first_name} {p.last_name} {p.vip && <Badge text="VIP" color={C.amber} />} {p.loyalty_number && <Badge text={p.loyalty_number} color={C.purple} />}</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Room {p.room_number} | {p.email} | {p.phone}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Visits: {p.visit_count} | First: {p.first_visit} | Last: {p.last_visit}</div>
          {p.notes && <div style={{ fontSize: 11, color: C.accent, marginTop: 4, fontStyle: "italic" }}>{p.notes}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase" }}>Lifetime Spend</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(p.lifetime_spend)}</div>
        </div>
      </div>

      {/* Allergen & Dietary Alerts */}
      {((p.allergens || []).length > 0 || (p.dietary_restrictions || []).length > 0) && (
        <div data-testid="allergen-alert" style={{ background: `${C.red}10`, border: `1px solid ${C.red}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 6, textTransform: "uppercase" }}>Allergen & Dietary Alert</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(p.allergens || []).map((a: string) => <Badge key={a} text={a} color={allergenColors[a] || C.red} />)}
            {(p.dietary_restrictions || []).map((d: string) => <Badge key={d} text={d} color={C.purple} />)}
          </div>
          {p.special_requests?.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: C.text }}>
              {(p.special_requests || []).map((r: string, i: number) => <div key={i} style={{ padding: "2px 0" }}>• {r}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Current Stay Spend */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {[{ l: "IRD", v: fmt(spend.ird), c: C.amber }, { l: "Minibar", v: fmt(spend.minibar), c: C.blue }, { l: "Spa", v: fmt(spend.spa), c: "#d946ef" }, { l: "Retail", v: fmt(spend.retail), c: C.green }, { l: "This Stay Total", v: fmt(spend.total), c: C.accent }].map(s => (
          <div key={s.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", flex: "1 1 110px" }}>
            <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.c, fontFamily: "'IBM Plex Mono', monospace" }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Amenity Suggestions */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8, textTransform: "uppercase" }}>Suggested Amenities (Fresh)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(suggestions?.suggested || []).map((s: any) => (
              <button key={s.name} data-testid={`suggest-${s.name}`} onClick={() => logAmenity(s.name, s.category)}
                style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.green}30`, background: "transparent", color: C.green, fontSize: 10, cursor: "pointer" }}>
                + {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Avoid Repeats */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 8, textTransform: "uppercase" }}>Avoid Repeating (Recent Visits)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(data.avoid_amenities || []).map((a: string) => <Badge key={a} text={a} color={C.amber} />)}
            {(data.avoid_amenities || []).length === 0 && <span style={{ fontSize: 10, color: C.dim }}>No recent amenities on file</span>}
          </div>
        </div>

        {/* Amenity History by Visit */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 8, textTransform: "uppercase" }}>Amenity History by Visit</div>
          {Object.entries(data.amenities_by_visit || {}).slice(0, 5).map(([visit, items]: [string, any]) => (
            <div key={visit} style={{ marginBottom: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.text, marginBottom: 4 }}>Visit #{visit}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(items as any[]).map((a: any, i: number) => <Badge key={i} text={a.amenity_name} color={C.purple} />)}
              </div>
            </div>
          ))}
          {Object.keys(data.amenities_by_visit || {}).length === 0 && <span style={{ fontSize: 10, color: C.dim }}>No amenity history</span>}
        </div>
      </div>

      {/* Payment Methods */}
      {(p.payment_methods || []).length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Payment Methods & Access Keys</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(p.payment_methods || []).map((pm: any, i: number) => (
              <div key={i} style={{ background: C.bg, borderRadius: 6, padding: "8px 12px", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{pm.brand || pm.type}</div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>{pm.last_four ? `••••${pm.last_four}` : pm.key_id || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestIntelligence() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const doSearch = (q: string) => {
    if (q.length >= 2) fetch(`${API}/api/guest-intel/search?q=${q}`).then(r => r.json()).then(d => setSearchResults(d.results || []));
    else setSearchResults([]);
  };

  const selectGuest = (id: string) => { setSelectedGuest(id); setTab("profile"); setSearchResults([]); setSearch(""); };

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "profile", label: "Guest Profile" },
  ];

  return (
    <div data-testid="guest-intelligence-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(200,169,126,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tabs.map(t => (<button key={t.id} onClick={() => { setTab(t.id); if (t.id === "dashboard") setSelectedGuest(null); }} data-testid={`intel-tab-${t.id}`}
            style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? C.accentDim : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>))}
          <div style={{ flex: 1 }} />
          <input data-testid="intel-search" value={search} onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }} placeholder="Search guest by name, room, email, key ID..."
            style={{ width: 280, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
        </div>
        {searchResults.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {searchResults.map(r => (
              <button key={r.guest_id} onClick={() => selectGuest(r.guest_id)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 11, cursor: "pointer" }}>
                {r.first_name} {r.last_name} <span style={{ color: C.dim }}>Rm {r.room_number}</span> {r.vip && <Badge text="VIP" color={C.amber} />} {(r.allergens || []).length > 0 && <Badge text="ALLERGY" color={C.red} />}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "dashboard" && <DashboardTab onSelectGuest={selectGuest} />}
        {tab === "profile" && selectedGuest && <ProfileView guestId={selectedGuest} onBack={() => { setTab("dashboard"); setSelectedGuest(null); }} />}
        {tab === "profile" && !selectedGuest && <div style={{ textAlign: "center", color: C.dim, padding: 60 }}>Search for a guest or click a profile from the dashboard</div>}
      </div>
    </div>
  );
}
