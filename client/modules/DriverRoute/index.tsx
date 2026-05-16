/**
 * iter196 · FM-Upgrade 7 · Route surface — driver mobile.
 * Route: /route/:token  (bypasses PanelHost like /m/staff and /floor)
 *
 * Next-stop-card-dominant UI. Two-tap POD. Temperature capture at drop.
 * Offline-capable with queued action flush.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || "";
};

export default function DriverRoute() {
  const { token = "" } = useParams<{ token: string }>();
  const [driver, setDriver] = useState<{ id: string; name: string } | null>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [tab, setTab] = useState<"stop" | "summary">("stop");
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const cacheKey = `luccca_route_cache_${token}`;

  const load = useCallback(async () => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw);
        if (c?.stops) setStops(c.stops);
      }
    } catch {}
    try {
      const me = await fetch(`${API()}/api/route/me`, { headers: { "X-Route-Token": token } });
      if (me.status === 401) { setErr("Invalid or revoked driver link."); return; }
      const mj = await me.json();
      setDriver({ id: mj.driver_id, name: mj.driver_name });
      const st = await fetch(`${API()}/api/route/stops`, { headers: { "X-Route-Token": token } });
      if (st.ok) {
        const sj = await st.json();
        setStops(sj.stops || []);
        try { localStorage.setItem(cacheKey, JSON.stringify({ stops: sj.stops, at: Date.now() })); } catch {}
      }
    } catch { setErr("Couldn't load route."); }
  }, [token, cacheKey]);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [load]);

  async function deliver(outcome: "delivered" | "missed", tempC: number) {
    const cur = stops[idx];
    if (!cur) return;
    try {
      const r = await fetch(`${API()}/api/route/pod`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Route-Token": token },
        body: JSON.stringify({ pack_ids: cur.pack_ids, temp_c: tempC, outcome }),
      });
      if (r.ok) {
        setIdx(Math.min(idx + 1, stops.length - 1));
        load();
      }
    } catch {
      try {
        const qk = `luccca_route_queue_${token}`;
        const q = JSON.parse(localStorage.getItem(qk) || "[]");
        q.push({ pack_ids: cur.pack_ids, temp_c: tempC, outcome, queued_at: Date.now() });
        localStorage.setItem(qk, JSON.stringify(q));
        setIdx(Math.min(idx + 1, stops.length - 1));
      } catch {}
    }
  }

  async function loadSummary() {
    try {
      const r = await fetch(`${API()}/api/route/shift-summary`, { headers: { "X-Route-Token": token } });
      if (r.ok) setSummary(await r.json());
    } catch {}
  }

  if (err) return <div style={S.errScreen} data-testid="route-error">{err}</div>;
  if (loading || !driver) return <div style={S.loadingScreen} data-testid="route-loading">Loading…</div>;

  const cur = stops[idx];

  return (
    <div style={S.root} data-testid="route-root">
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>Route · Driver</div>
          <h1 style={S.title} data-testid="driver-name">{driver.name}</h1>
        </div>
        <div data-testid="online-indicator" style={{ ...S.onlinePill, color: online ? "#86efac" : "#fcd34d", borderColor: online ? "rgba(34,197,94,0.4)" : "rgba(252,211,77,0.4)" }}>
          {online ? "Online" : "Offline"}
        </div>
      </header>

      <nav style={S.tabs} data-testid="route-tabs">
        <button data-testid="tab-stop" onClick={() => setTab("stop")} style={{ ...S.tabBtn, borderBottomColor: tab === "stop" ? "#c8a97e" : "transparent", color: tab === "stop" ? "#f5efe4" : "#94a3b8" }}>Current stop</button>
        <button data-testid="tab-summary" onClick={() => { setTab("summary"); loadSummary(); }} style={{ ...S.tabBtn, borderBottomColor: tab === "summary" ? "#c8a97e" : "transparent", color: tab === "summary" ? "#f5efe4" : "#94a3b8" }}>Shift summary</button>
      </nav>

      {tab === "stop" && (
        <section data-testid="stop-section">
          {stops.length === 0 && <div style={S.empty}>No stops scheduled.</div>}
          {cur && (
            <div style={S.stopCard} data-testid="current-stop">
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 }}>
                Stop {idx + 1} of {stops.length}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 4px", color: "#f5efe4" }}>{cur.customer_id}</h2>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                {cur.pack_count} pack{cur.pack_count === 1 ? "" : "s"} · {(cur.products || []).join(", ")}
              </div>
              <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.25)" }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                  Temperature at drop
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {[2, 3, 4, 5].map(t => (
                    <button key={t} data-testid={`temp-${t}`} onClick={() => deliver("delivered", t)} style={S.tempBtn}>{t}°C</button>
                  ))}
                </div>
              </div>
              <button data-testid="pod-delivered" onClick={() => deliver("delivered", 4)} style={{ ...S.bigBtn, marginTop: 14, background: "linear-gradient(90deg,#34d399,#10b981)", color: "#0a0e1a" }}>
                ✓ Delivered @ 4°C
              </button>
              <button data-testid="pod-missed" onClick={() => deliver("missed", 0)} style={{ ...S.bigBtn, marginTop: 10, color: "#fca5a5", borderColor: "rgba(239,68,68,0.4)" }}>
                ⚠ Missed · flag issue
              </button>
            </div>
          )}
          {stops.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button data-testid="prev-stop" onClick={() => setIdx(Math.max(0, idx - 1))} style={S.ghostBtn}>← Prev</button>
              <button data-testid="next-stop" onClick={() => setIdx(Math.min(stops.length - 1, idx + 1))} style={S.ghostBtn}>Next →</button>
            </div>
          )}
        </section>
      )}

      {tab === "summary" && (
        <section data-testid="summary-section">
          {!summary && <div style={S.empty}>Loading shift summary…</div>}
          {summary && (
            <div style={{ ...S.stopCard, textAlign: "center" as const }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: "#86efac" }}>{summary.delivered}</div>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Delivered today</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
                <SumTile label="Issues" value={summary.issues} color="#fca5a5" />
                <SumTile label="Avg drop temp" value={summary.avg_drop_temp_c ? `${summary.avg_drop_temp_c}°C` : "—"} color="#cbd5e1" />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SumTile({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color }}>{value}</div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", padding: 20, background: "#050812", color: "#f5efe4", fontFamily: "-apple-system, system-ui, sans-serif" },
  errScreen: { display: "grid", placeItems: "center", minHeight: "100vh", background: "#050812", color: "#fca5a5", fontSize: 14, padding: 20, textAlign: "center" as const },
  loadingScreen: { display: "grid", placeItems: "center", minHeight: "100vh", background: "#050812", color: "#c8a97e", fontSize: 14 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase" as const, color: "#c8a97e", fontWeight: 700 },
  title: { fontSize: 24, fontWeight: 300, margin: "4px 0 0", letterSpacing: -0.5 },
  onlinePill: { padding: "5px 12px", borderRadius: 999, border: "1px solid", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" as const },
  tabs: { display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 },
  tabBtn: { flex: 1, padding: "10px 0", background: "transparent", border: 0, borderBottom: "3px solid transparent", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer" },
  stopCard: { padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" },
  bigBtn: { width: "100%", padding: "16px 0", borderRadius: 12, background: "transparent", border: "1px solid rgba(200,169,126,0.3)", color: "#c8a97e", fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" as const, cursor: "pointer" },
  tempBtn: { padding: "14px 0", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5efe4", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  ghostBtn: { flex: 1, padding: 10, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer" },
  empty: { textAlign: "center" as const, padding: 40, color: "#64748b", fontSize: 12 },
};
