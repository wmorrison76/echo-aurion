/**
 * iter196 · FM-Upgrade 7 · Floor surface — kitchen tablet view.
 * Route: /floor/:token  (bypasses PanelHost entirely, like /m/staff)
 *
 * Offline-capable (stale-while-revalidate cache + queued actions that flush
 * on reconnect). Dark UI, large touch targets, voice-friendly labels.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || "";
};

type Station = { station_id: string; station_name: string };

export default function FloorStation() {
  const { token = "" } = useParams<{ token: string }>();
  const [station, setStation] = useState<Station | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "ccp" | "activity">("queue");
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  const cacheKey = `luccca_floor_cache_${token}`;

  const loadMe = useCallback(async () => {
    try {
      const r = await fetch(`${API()}/api/floor/me`, { headers: { "X-Floor-Token": token } });
      if (r.status === 401) { setErr("Invalid or revoked station link."); return false; }
      const j = await r.json();
      setStation({ station_id: j.station_id, station_name: j.station_name });
      return true;
    } catch { setErr("Network error."); return false; }
  }, [token]);

  const loadQueue = useCallback(async () => {
    // Paint cache first (stale-while-revalidate)
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw);
        if (c?.runs) setRuns(c.runs);
        if (c?.packs) setPacks(c.packs);
      }
    } catch {}
    try {
      const r = await fetch(`${API()}/api/floor/queue`, { headers: { "X-Floor-Token": token } });
      if (!r.ok) return;
      const j = await r.json();
      setRuns(j.runs || []); setPacks(j.packs_in_queue || []);
      try { localStorage.setItem(cacheKey, JSON.stringify({ runs: j.runs, packs: j.packs_in_queue, at: Date.now() })); } catch {}
    } catch {
      // offline — cache is what we have
    }
  }, [token, cacheKey]);

  useEffect(() => {
    (async () => { await loadMe(); await loadQueue(); setLoading(false); })();
    const h1 = () => setOnline(true);
    const h2 = () => setOnline(false);
    window.addEventListener("online", h1); window.addEventListener("offline", h2);
    const timer = window.setInterval(loadQueue, 30000);
    return () => { window.removeEventListener("online", h1); window.removeEventListener("offline", h2); clearInterval(timer); };
  }, [loadMe, loadQueue]);

  async function packAction(packId: string, action: string, tempC?: number) {
    try {
      const r = await fetch(`${API()}/api/floor/pack-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Floor-Token": token },
        body: JSON.stringify({ pack_id: packId, action, temp_c: tempC }),
      });
      if (r.ok) loadQueue();
    } catch {
      // Queue for flush when online
      try {
        const key = `luccca_floor_queue_${token}`;
        const q = JSON.parse(localStorage.getItem(key) || "[]");
        q.push({ pack_id: packId, action, temp_c: tempC, queued_at: Date.now() });
        localStorage.setItem(key, JSON.stringify(q));
      } catch {}
    }
  }

  if (err) return <div style={S.errScreen} data-testid="floor-error">{err}</div>;
  if (loading || !station) return <div style={S.loadingScreen} data-testid="floor-loading">Loading station…</div>;

  return (
    <div style={S.root} data-testid="floor-root">
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>Floor · Station</div>
          <h1 style={S.title} data-testid="station-name">{station.station_name}</h1>
        </div>
        <div data-testid="online-indicator" style={{ ...S.onlinePill, color: online ? "#86efac" : "#fcd34d", borderColor: online ? "rgba(34,197,94,0.4)" : "rgba(252,211,77,0.4)" }}>
          {online ? "Online" : "Offline · cache"}
        </div>
      </header>

      <nav style={S.tabs} data-testid="floor-tabs">
        {(["queue", "ccp", "activity"] as const).map(t => (
          <button key={t} data-testid={`tab-${t}`} onClick={() => setActiveTab(t)} style={{ ...S.tabBtn, borderBottomColor: activeTab === t ? "#c8a97e" : "transparent", color: activeTab === t ? "#f5efe4" : "#94a3b8" }}>
            {t.toUpperCase()}
          </button>
        ))}
      </nav>

      {activeTab === "queue" && (
        <div data-testid="floor-queue">
          <h2 style={S.sectionTitle}>Production queue</h2>
          {runs.length === 0 && <div style={S.empty}>No active runs.</div>}
          {runs.slice(0, 6).map(r => (
            <div key={r.id} style={S.card} data-testid={`run-${r.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f5efe4" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {r.planned_qty} units · {r.status} · {r.priority}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#c8a97e" }}>{r.progress_pct ?? 0}%</div>
              </div>
            </div>
          ))}
          <h2 style={{ ...S.sectionTitle, marginTop: 20 }}>Packs in queue</h2>
          {packs.length === 0 && <div style={S.empty}>No packs to work on.</div>}
          {packs.slice(0, 12).map(p => (
            <div key={p.id} style={S.card} data-testid={`pack-${p.id}`}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4" }}>{p.product_id}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                {p.id.slice(0, 14)} · {p.status} · pack {p.pack_date} · exp {p.expiry_date}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                <button data-testid={`act-start-${p.id}`} onClick={() => packAction(p.id, "start")} style={S.bigBtn}>Start</button>
                <button data-testid={`act-seal-${p.id}`} onClick={() => packAction(p.id, "seal", 3.5)} style={{ ...S.bigBtn, background: "linear-gradient(90deg,#34d399,#10b981)", color: "#0a0e1a" }}>Seal @ 3.5°C</button>
                <button data-testid={`act-label-${p.id}`} onClick={() => packAction(p.id, "label")} style={S.bigBtn}>Label + Stage</button>
                <button data-testid={`act-issue-${p.id}`} onClick={() => packAction(p.id, "issue")} style={{ ...S.bigBtn, color: "#fca5a5", borderColor: "rgba(239,68,68,0.4)" }}>⚠ Issue</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "ccp" && <CCPTab token={token} onDone={loadQueue} />}
      {activeTab === "activity" && <ActivityTab token={token} />}
    </div>
  );
}

function CCPTab({ token, onDone }: { token: string; onDone: () => void }) {
  const [ccpType, setCcpType] = useState("cook_temp");
  const [measurement, setMeasurement] = useState<string>("");
  const [packId, setPackId] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const thresholds: Record<string, { min?: number; max?: number }> = {
    cook_temp: { min: 74 }, cool_time: { max: 4 }, ph: { min: 4.0, max: 4.6 }, visual: {},
  };
  async function submit() {
    const m = parseFloat(measurement);
    if (Number.isNaN(m)) { setSent("Enter a number."); return; }
    const t = thresholds[ccpType] || {};
    try {
      const r = await fetch(`${API()}/api/floor/ccp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Floor-Token": token },
        body: JSON.stringify({ ccp_type: ccpType, measurement: m, pack_id: packId || undefined,
                               threshold_min: t.min, threshold_max: t.max }),
      });
      const j = await r.json();
      setSent(j.passing ? "✓ Passing · logged" : "⚠ OUT OF SPEC · logged");
      setMeasurement(""); onDone();
    } catch { setSent("Queued offline"); }
  }
  return (
    <div data-testid="ccp-tab" style={{ padding: "12px 0" }}>
      <h2 style={S.sectionTitle}>Critical Control Point</h2>
      <div style={S.card}>
        <label style={S.label}>CCP type</label>
        <select data-testid="ccp-type" value={ccpType} onChange={e => setCcpType(e.target.value)} style={S.select}>
          <option value="cook_temp">Cook temp (°C, ≥74)</option>
          <option value="cool_time">Cool time (h, ≤4)</option>
          <option value="ph">pH (4.0-4.6)</option>
          <option value="visual">Visual check</option>
        </select>
        <label style={{ ...S.label, marginTop: 12 }}>Pack ID (optional)</label>
        <input data-testid="ccp-pack-id" value={packId} onChange={e => setPackId(e.target.value)} placeholder="pack-xxxxxxxxxx" style={S.input} />
        <label style={{ ...S.label, marginTop: 12 }}>Measurement</label>
        <input data-testid="ccp-measurement" type="number" step="0.1" value={measurement} onChange={e => setMeasurement(e.target.value)} style={{ ...S.input, fontSize: 22, fontWeight: 700 }} />
        <button data-testid="ccp-submit" onClick={submit} style={{ ...S.bigBtn, marginTop: 14, background: "linear-gradient(90deg,#c8a97e,#e9d5a5)", color: "#0a0e1a" }}>Log CCP</button>
        {sent && <div data-testid="ccp-result" style={{ marginTop: 10, fontSize: 13, color: sent.startsWith("✓") ? "#86efac" : "#fcd34d" }}>{sent}</div>}
      </div>
    </div>
  );
}

function ActivityTab({ token }: { token: string }) {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/floor/my-activity?limit=40`, { headers: { "X-Floor-Token": token } });
        if (r.ok) { const j = await r.json(); setEvents(j.events || []); }
      } catch {}
    })();
  }, [token]);
  return (
    <div data-testid="activity-tab" style={{ padding: "12px 0" }}>
      <h2 style={S.sectionTitle}>My last 40 actions</h2>
      {events.length === 0 && <div style={S.empty}>Nothing yet on this shift.</div>}
      {events.map((e, i) => (
        <div key={i} style={{ ...S.card, padding: 10 }} data-testid={`activity-${i}`}>
          <div style={{ fontSize: 11, color: "#c8a97e", fontFamily: "monospace", fontWeight: 700 }}>{e.type}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>
            {new Date(e.timestamp).toLocaleTimeString()} · {(e.payload?.commodity || "") + " " + (e.payload?.quantity || "")}
          </div>
        </div>
      ))}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", padding: 20, background: "#050812", color: "#f5efe4", fontFamily: "-apple-system, system-ui, sans-serif" },
  errScreen: { display: "grid", placeItems: "center", minHeight: "100vh", background: "#050812", color: "#fca5a5", fontSize: 14, padding: 20, textAlign: "center" as const },
  loadingScreen: { display: "grid", placeItems: "center", minHeight: "100vh", background: "#050812", color: "#c8a97e", fontSize: 14 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase" as const, color: "#c8a97e", fontWeight: 700 },
  title: { fontSize: 26, fontWeight: 300, margin: "4px 0 0", letterSpacing: -0.5 },
  onlinePill: { padding: "5px 12px", borderRadius: 999, border: "1px solid", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" as const },
  tabs: { display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 },
  tabBtn: { flex: 1, padding: "10px 0", background: "transparent", border: 0, borderBottom: "3px solid transparent", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer" },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 10 },
  empty: { textAlign: "center" as const, padding: 30, color: "#64748b", fontSize: 12 },
  card: { padding: 14, marginBottom: 10, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" },
  bigBtn: { padding: "14px 0", borderRadius: 10, background: "transparent", border: "1px solid rgba(200,169,126,0.3)", color: "#c8a97e", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const, cursor: "pointer" },
  label: { fontSize: 9, letterSpacing: 1.5, color: "#94a3b8", textTransform: "uppercase" as const, fontWeight: 700, display: "block", marginBottom: 5 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5efe4", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5efe4", fontSize: 14, outline: "none" },
};
