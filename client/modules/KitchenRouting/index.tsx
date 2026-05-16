import React, { useState, useEffect, useCallback } from "react";
import { RightClickMenu } from "@/lib/context-menu";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#8b5cf6", accentDim: "rgba(139,92,246,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", cyan: "#06b6d4", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }
type Tab = "dashboard" | "stations" | "printers" | "outlets";

function DashboardTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/kitchen-routing/dashboard`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  const k = data.kpis;
  return (
    <div data-testid="routing-dashboard">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ l: "Stations", v: k.total_stations, c: C.accent }, { l: "Printers", v: k.total_printers, c: C.blue }, { l: "Outlets", v: k.total_outlets, c: C.green }, { l: "Online", v: k.online_printers, c: C.cyan }].map(kpi => (
          <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 140px" }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.c, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Kitchen Stations</div>
          {(data.stations || []).map((s: any) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color || C.dim }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.name}</div>
                <div style={{ fontSize: 10, color: C.dim }}>{s.description}</div>
              </div>
              <Badge text={s.outlet_id} color={C.blue} />
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Printers & KDS</div>
          {(data.printers || []).map((p: any) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 10, color: C.dim }}>{p.location} — {p.ip_address}</div>
              </div>
              <Badge text={p.technology} color={p.technology === "thermal" ? C.cyan : p.technology === "impact" ? C.amber : C.dim} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StationsTab() {
  const [stations, setStations] = useState<any[]>([]);
  const load = () => { fetch(`${API}/api/kitchen-routing/stations`).then(r => r.json()).then(d => setStations(d.stations || [])); };
  useEffect(() => { load(); }, []);
  const deleteStation = (id: string) => { fetch(`${API}/api/kitchen-routing/stations/${id}`, { method: "DELETE" }).then(() => load()); };
  return (
    <div data-testid="routing-stations">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {stations.map(s => (
          <RightClickMenu key={s.id} items={[
            { label: "Edit Station", icon: "✏", action: () => {} },
            { label: "Remove Station", icon: "✕", action: () => deleteStation(s.id), color: C.red },
          ]}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderLeft: `4px solid ${s.color || C.dim}`, cursor: "context-menu" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</div>
              <Badge text={s.outlet_id} color={C.blue} />
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>{s.description}</div>
            <div style={{ fontSize: 10, color: C.muted }}>Linked printers: {(s.default_printers || []).length}</div>
          </div>
          </RightClickMenu>
        ))}
      </div>
    </div>
  );
}

function PrintersTab() {
  const [printers, setPrinters] = useState<any[]>([]);
  const load = () => { fetch(`${API}/api/kitchen-routing/printers`).then(r => r.json()).then(d => setPrinters(d.printers || [])); };
  useEffect(() => { load(); }, []);
  const techColors: Record<string, string> = { thermal: C.cyan, impact: C.amber, laser: C.accent };
  return (
    <div data-testid="routing-printers">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {printers.map(p => (
          <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderLeft: `4px solid ${techColors[p.technology] || C.dim}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p.name}</div>
              <Badge text={p.technology} color={techColors[p.technology] || C.dim} />
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{p.description}</div>
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.muted }}>
              <span>Location: {p.location}</span>
              <span>IP: <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: C.text }}>{p.ip_address}</span></span>
            </div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{p.recommended_use}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutletsTab() {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [allStations, setAllStations] = useState<any[]>([]);
  const [allPrinters, setAllPrinters] = useState<any[]>([]);
  const load = () => {
    fetch(`${API}/api/kitchen-routing/outlets`).then(r => r.json()).then(d => setOutlets(d.outlets || []));
    fetch(`${API}/api/kitchen-routing/stations`).then(r => r.json()).then(d => setAllStations(d.stations || []));
    fetch(`${API}/api/kitchen-routing/printers`).then(r => r.json()).then(d => setAllPrinters(d.printers || []));
  };
  useEffect(() => { load(); }, []);
  return (
    <div data-testid="routing-outlets">
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 14 }}>Each outlet has its own routing configuration. Stations and printers are shared property-wide but mapped per outlet.</div>
      {outlets.map(o => {
        const stns = allStations.filter(s => (o.stations || []).includes(s.id));
        const ptrs = allPrinters.filter(p => (o.printers || []).includes(p.id));
        return (
          <div key={o.outlet_id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 10 }}>{o.outlet_name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Stations ({stns.length})</div>
                {stns.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color || C.dim }} />
                    <span style={{ fontSize: 11, color: C.text }}>{s.name}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Printers ({ptrs.length})</div>
                {ptrs.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ fontSize: 11, color: C.text }}>{p.name}</span>
                    <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: C.dim }}>{p.ip_address}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function KitchenRouting() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Overview" },
    { id: "stations", label: "Stations" },
    { id: "printers", label: "Printers & KDS" },
    { id: "outlets", label: "Outlet Routing" },
  ];
  return (
    <div data-testid="kitchen-routing-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(139,92,246,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} data-testid={`routing-tab-${t.id}`}
            style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? C.accentDim : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, color: C.dim, background: `${C.accent}10`, padding: "4px 10px", borderRadius: 6 }}>Moved from Culinary — now property-wide</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "stations" && <StationsTab />}
        {tab === "printers" && <PrintersTab />}
        {tab === "outlets" && <OutletsTab />}
      </div>
    </div>
  );
}
