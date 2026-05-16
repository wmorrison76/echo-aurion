/**
 * iter194 · FM-Upgrade 1 · Activity Timeline
 *
 * Unified live-tail feed of every TimelineEvent in the system, plus a FSMA 204
 * mock-recall search. This is the first "lens" on the canonical TimelineEvent
 * stream — the one primitive that powers audit, traceability, and anomaly
 * detection.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type TLEvent = {
  type: string;
  timestamp: string;
  actor?: { type?: string; id?: string; name?: string };
  entity_refs?: { kind?: string; id?: string; name?: string }[];
  payload?: Record<string, any>;
  location?: any;
};

type RecallBundle = {
  anchor: { lot_id?: string; tlc?: string; pack_id?: string; batch_id?: string };
  generated_at: string;
  elapsed_ms?: number;
  summary: {
    events_total: number; lots: number; pos: number; batches: number; packs: number; orders: number;
  };
  backward: { pos: any[]; lots: any[]; receive_events: TLEvent[] };
  forward: { batches: any[]; packs: any[]; orders: any[]; deliveries: any[] };
  events: TLEvent[];
};

const CATEGORIES: { id: string; label: string; prefixes: string[]; color: string }[] = [
  { id: "all",        label: "All",         prefixes: [],          color: "text-slate-300" },
  { id: "lot",        label: "Lots",        prefixes: ["lot."],    color: "text-amber-300" },
  { id: "po",         label: "POs",         prefixes: ["po.", "case."], color: "text-cyan-300" },
  { id: "batch",      label: "Production",  prefixes: ["batch.", "ccp.", "yield.", "waste."], color: "text-emerald-300" },
  { id: "pack",       label: "Packs",       prefixes: ["pack."],   color: "text-violet-300" },
  { id: "order",      label: "Orders",      prefixes: ["order.", "customer."], color: "text-pink-300" },
  { id: "label",      label: "Labels",      prefixes: ["label.", "allergen.", "audit."], color: "text-orange-300" },
  { id: "echo",       label: "Echo/Ops",    prefixes: ["echo.", "standup.", "mobile_push.", "feature_flag.", "migration."], color: "text-fuchsia-300" },
];

export default function ActivityTimeline() {
  const [events, setEvents] = useState<TLEvent[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recallAnchor, setRecallAnchor] = useState({ mode: "tlc", value: "" });
  const [recall, setRecall] = useState<RecallBundle | null>(null);
  const [recallError, setRecallError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/timeline/recent?limit=150`);
      if (r.ok) {
        const j = await r.json();
        setEvents(j.events || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    timer.current = window.setInterval(load, 8000) as unknown as number;
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [autoRefresh, load]);

  const filtered = useMemo(() => {
    const cat = CATEGORIES.find(c => c.id === category);
    if (!cat || cat.prefixes.length === 0) return events;
    return events.filter(e => cat.prefixes.some(p => e.type.startsWith(p)));
  }, [events, category]);

  async function runRecall() {
    setRecall(null); setRecallError(null);
    const v = recallAnchor.value.trim();
    if (!v) { setRecallError("Enter a lot id, TLC, pack id, or batch id first."); return; }
    const qs = `${recallAnchor.mode}=${encodeURIComponent(v)}`;
    try {
      const r = await fetch(`${API()}/api/timeline/recall?${qs}`);
      if (!r.ok) { setRecallError(`Recall failed (${r.status}).`); return; }
      const j = await r.json();
      setRecall(j.recall);
    } catch (e: any) {
      setRecallError(`Recall error — ${e.message || e}`);
    }
  }

  return (
    <div data-testid="activity-timeline-root" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>FM-Upgrade 1</div>
          <h1 style={S.title}>Activity Timeline</h1>
          <div style={S.sub}>Every state change across Luccca, in one feed. FSMA 204 audit + recall + Echo training corpus.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button data-testid="auto-refresh-toggle" onClick={() => setAutoRefresh(a => !a)} style={{ ...S.pillBtn, borderColor: autoRefresh ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.15)", color: autoRefresh ? "#86efac" : "#94a3b8" }}>
            {autoRefresh ? "Live · 8s" : "Paused"}
          </button>
          <button data-testid="refresh-btn" onClick={load} disabled={loading} style={S.pillBtn}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </header>

      <WhatsNewPanel />

      <section style={S.recallCard} data-testid="recall-section">
        <div style={S.eyebrow2}>FSMA 204 · Mock Recall</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <select data-testid="recall-mode" value={recallAnchor.mode} onChange={e => setRecallAnchor({ ...recallAnchor, mode: e.target.value })} style={S.select}>
            <option value="tlc">TLC</option>
            <option value="lot_id">Lot ID</option>
            <option value="pack_id">Pack ID</option>
            <option value="batch_id">Batch ID</option>
          </select>
          <input
            data-testid="recall-input"
            value={recallAnchor.value}
            onChange={e => setRecallAnchor({ ...recallAnchor, value: e.target.value })}
            onKeyDown={e => e.key === "Enter" && runRecall()}
            placeholder={recallAnchor.mode === "tlc" ? "TLC-ABC12345" : `${recallAnchor.mode}…`}
            style={S.input}
          />
          <button data-testid="recall-run" onClick={runRecall} style={S.primaryBtn}>Trace</button>
        </div>
        {recallError && <div data-testid="recall-error" style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>{recallError}</div>}
        {recall && (
          <div data-testid="recall-result" style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Completed in <strong style={{ color: recall.elapsed_ms && recall.elapsed_ms < 2000 ? "#86efac" : "#fcd34d" }}>{recall.elapsed_ms ?? "?"} ms</strong>
              {" · "}anchor: {Object.entries(recall.anchor).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(" ") || "—"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginTop: 8 }}>
              <Counter label="Events"   value={recall.summary.events_total} />
              <Counter label="Lots"     value={recall.summary.lots} />
              <Counter label="POs"      value={recall.summary.pos} />
              <Counter label="Batches"  value={recall.summary.batches} />
              <Counter label="Packs"    value={recall.summary.packs} />
              <Counter label="Orders"   value={recall.summary.orders} />
            </div>
            {recall.events.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={S.eyebrow2}>Chronological trace</div>
                {recall.events.slice(0, 20).map((e, i) => (
                  <EventRow key={i} e={e} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <nav style={S.chipRow} data-testid="category-chips">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            data-testid={`chip-${c.id}`}
            onClick={() => setCategory(c.id)}
            style={{
              ...S.chip,
              borderColor: category === c.id ? "rgba(200,169,126,0.5)" : "rgba(255,255,255,0.1)",
              background: category === c.id ? "rgba(200,169,126,0.1)" : "transparent",
            }}
          >
            <span style={{ color: c.color.includes("slate") ? "#cbd5e1" : undefined }}>{c.label}</span>
          </button>
        ))}
      </nav>

      <section style={S.feed} data-testid="activity-feed">
        {filtered.length === 0 && (
          <div data-testid="empty-state" style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 12 }}>
            No events in this category yet. Trigger a PO, receive, or order to populate the feed.
          </div>
        )}
        {filtered.map((e, i) => <EventRow key={i} e={e} />)}
      </section>
    </div>
  );
}

function EventRow({ e }: { e: TLEvent }) {
  const [expanded, setExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const refs = (e.entity_refs || []).slice(0, 3);
  const typeColor = typeAccent(e.type);
  const pillBg = typeColor.replace(/\d+\)/, "0.12)");

  async function askEchoAnalyze() {
    setAiLoading(true); setAiAnalysis(null);
    try {
      const r = await fetch(`${API()}/api/echo-ai3/analyze-event`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: e }),
      });
      if (r.ok) { const j = await r.json(); setAiAnalysis(j.analysis || "No analysis available."); }
      else setAiAnalysis(`Echo unavailable (${r.status})`);
    } catch (err: any) { setAiAnalysis(`Error: ${err.message || err}`); }
    finally { setAiLoading(false); }
  }

  return (
    <div data-testid={`event-${e.type}`} style={{ ...S.eventRow, flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%" }}>
        <button data-testid="event-expand" onClick={() => setExpanded(v => !v)} title={expanded ? "Collapse" : "Expand detail"}
          style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.35)", color: "#d8b4fe", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          {expanded ? "−" : "+"}
        </button>
        <div style={{ ...S.eventType, background: pillBg, color: typeColor }}>{e.type}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "#f5efe4", fontWeight: 600 }}>
            {refs.map(r => r.name || `${r.kind}:${(r.id || "").slice(0, 10)}`).join(" · ") || "—"}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            {e.actor?.name || e.actor?.id || "system"}
            {" · "}{new Date(e.timestamp).toLocaleTimeString()}
            {e.payload?.tlc && <span style={{ marginLeft: 8, color: "#fcd34d", fontFamily: "monospace" }}>TLC {e.payload.tlc}</span>}
            {e.payload?.commodity && <span style={{ marginLeft: 8, color: "#cbd5e1" }}>· {e.payload.commodity}{e.payload.quantity ? ` ${e.payload.quantity}${e.payload.unit || ""}` : ""}</span>}
          </div>
        </div>
      </div>
      {expanded && (
        <div data-testid="event-detail" style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(10,14,26,0.65)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#cbd5e1" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
            <div style={{ color: "#94a3b8" }}>Timestamp</div>
            <div style={{ fontFamily: "monospace", color: "#f5efe4" }}>{new Date(e.timestamp).toISOString()}</div>
            <div style={{ color: "#94a3b8" }}>Actor</div>
            <div style={{ color: "#f5efe4" }}>{e.actor?.name || e.actor?.id || "system"}{e.actor?.type ? ` (${e.actor.type})` : ""}</div>
            {(e.entity_refs?.length ?? 0) > 0 && (<>
              <div style={{ color: "#94a3b8" }}>Entities</div>
              <div>{(e.entity_refs || []).map((r, i) => (
                <div key={i} style={{ fontFamily: "monospace", fontSize: 10 }}>
                  <span style={{ color: "#d8b4fe" }}>{r.kind}</span> <span style={{ color: "#94a3b8" }}>id=</span><span style={{ color: "#fcd34d" }}>{r.id}</span>
                  {r.name && <span style={{ color: "#86efac" }}> ({r.name})</span>}
                </div>
              ))}</div>
            </>)}
            {e.location && (<><div style={{ color: "#94a3b8" }}>Location</div><div style={{ fontFamily: "monospace", fontSize: 10 }}>{JSON.stringify(e.location)}</div></>)}
          </div>
          {e.payload && Object.keys(e.payload).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: "#94a3b8", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>Payload</div>
              <pre style={{ margin: 0, fontSize: 10, color: "#cbd5e1", background: "rgba(0,0,0,0.4)", padding: 8, borderRadius: 4, overflow: "auto", maxHeight: 200 }}>
                {JSON.stringify(e.payload, null, 2)}
              </pre>
            </div>
          )}
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button data-testid="event-echo-analyze" onClick={askEchoAnalyze} disabled={aiLoading}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(168,85,247,0.4)", background: aiLoading ? "rgba(168,85,247,0.1)" : "linear-gradient(90deg, rgba(168,85,247,0.2), rgba(236,72,153,0.15))", color: "#d8b4fe", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, cursor: aiLoading ? "wait" : "pointer" }}>
              {aiLoading ? "Analyzing…" : "Echo · analyze logic"}
            </button>
            <span style={{ fontSize: 10, color: "#64748b" }}>Ask Echo if this event's logic could be improved</span>
          </div>
          {aiAnalysis && (
            <div data-testid="event-analysis" style={{ marginTop: 8, padding: 10, borderRadius: 6, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", fontSize: 11, color: "#e9d5ff", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {aiAnalysis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div style={S.counter}>
      <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#f5efe4", marginTop: 2 }}>{value}</div>
    </div>
  );
}

// iter196 · Echo "What just happened?" — NL summarisation over recent events
function WhatsNewPanel() {
  const [minutes, setMinutes] = useState(30);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${API()}/api/echo/whats-new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      if (!r.ok) { setErr(`Echo failed (${r.status})`); setResult(null); return; }
      setResult(await r.json());
    } catch (e: any) { setErr(`Echo error — ${e.message || e}`); }
    finally { setLoading(false); }
  }

  return (
    <section data-testid="whats-new-panel" style={{
      padding: 14, borderRadius: 14,
      background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(200,169,126,0.06))",
      border: "1px solid rgba(168,85,247,0.25)", marginBottom: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#d8b4fe", fontWeight: 700 }}>
            Echo · What just happened?
          </div>
          <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>NL summary of the last {minutes} minutes</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <select data-testid="whats-new-window" value={minutes} onChange={e => setMinutes(parseInt(e.target.value, 10))} style={S.select}>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="180">3 hrs</option>
          </select>
          <button data-testid="whats-new-run" onClick={run} disabled={loading} style={{ ...S.primaryBtn, background: "linear-gradient(90deg,#a855f7,#d8b4fe)", color: "#0a0e1a" }}>
            {loading ? "…" : "Ask Echo"}
          </button>
        </div>
      </div>
      {err && <div data-testid="whats-new-error" style={{ color: "#fca5a5", fontSize: 12 }}>{err}</div>}
      {result && (
        <div data-testid="whats-new-result">
          {result.headline && (
            <div data-testid="whats-new-headline" style={{
              padding: 10, borderRadius: 10, background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)", marginBottom: 10,
              fontSize: 13, fontWeight: 700, color: "#f5efe4",
            }}>{result.headline}</div>
          )}
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, margin: 0, fontFamily: "inherit" }}>
            {result.summary}
          </pre>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 8 }}>
            {result.event_count} events · mode: {result.mode}
          </div>
        </div>
      )}
    </section>
  );
}

function typeAccent(t: string): string {
  if (t.startsWith("lot.")) return "rgba(252,211,77,0.85)";
  if (t.startsWith("po.") || t.startsWith("case.")) return "rgba(103,232,249,0.85)";
  if (t.startsWith("batch.") || t.startsWith("ccp.") || t.startsWith("yield.") || t.startsWith("waste.")) return "rgba(134,239,172,0.85)";
  if (t.startsWith("pack.")) return "rgba(196,181,253,0.85)";
  if (t.startsWith("order.") || t.startsWith("customer.")) return "rgba(249,168,212,0.85)";
  if (t.startsWith("label.") || t.startsWith("allergen.") || t.startsWith("audit.")) return "rgba(253,186,116,0.85)";
  if (t.startsWith("echo.") || t.startsWith("standup.") || t.startsWith("mobile_push.") || t.startsWith("feature_flag.")) return "rgba(240,171,252,0.85)";
  return "rgba(203,213,225,0.85)";
}

const S: Record<string, React.CSSProperties> = {
  root: { height: "100%", overflow: "auto", padding: 20, background: "radial-gradient(ellipse at top, #0f1523 0%, #050812 60%, #020307 100%)", color: "#f5efe4", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, flexWrap: "wrap" },
  eyebrow: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase" as const, color: "#c8a97e", fontWeight: 700 },
  eyebrow2: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase" as const, color: "#94a3b8", fontWeight: 700, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 200, letterSpacing: -0.5, margin: "4px 0 6px" },
  sub: { fontSize: 12, color: "#94a3b8", maxWidth: 520 },
  pillBtn: { padding: "6px 12px", borderRadius: 999, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  recallCard: { padding: 14, borderRadius: 14, background: "rgba(200,169,126,0.05)", border: "1px solid rgba(200,169,126,0.2)", marginBottom: 14 },
  select: { padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5efe4", fontSize: 12, outline: "none" },
  input: { flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5efe4", fontSize: 12, outline: "none" },
  primaryBtn: { padding: "8px 16px", borderRadius: 8, background: "linear-gradient(90deg,#c8a97e,#e9d5a5)", color: "#0a0e1a", fontWeight: 700, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" as const, border: 0, cursor: "pointer" },
  counter: { padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" as const },
  chipRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  chip: { padding: "5px 12px", borderRadius: 999, border: "1px solid", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  feed: { display: "flex", flexDirection: "column" as const, gap: 6 },
  eventRow: { display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" },
  eventType: { fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 6, fontFamily: "monospace", letterSpacing: 0.5, whiteSpace: "nowrap" as const },
};
