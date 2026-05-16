/**
 * PosAdapterPanel
 * ---------------
 * Configure the POS connector, drain the queue manually, watch delivery log.
 */
import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Send, Wifi, CheckCircle2, XCircle, Server } from "lucide-react";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const RED = "#ef4444";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

export default function PosAdapterPanel() {
  const [providers, setProviders] = useState<any[]>([]);
  const [provider, setProvider] = useState("mock");
  const [endpoint, setEndpoint] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [extra, setExtra] = useState("{}");
  const [active, setActive] = useState(true);
  const [masked, setMasked] = useState<string>("");
  const [summary, setSummary] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, c, s, l] = await Promise.all([
      fetch(`${API}/api/pos-adapter/providers`).then(r => r.json()),
      fetch(`${API}/api/pos-adapter/config`).then(r => r.json()),
      fetch(`${API}/api/pos-adapter/summary`).then(r => r.json()),
      fetch(`${API}/api/pos-adapter/delivery-log?limit=20`).then(r => r.json()),
    ]);
    setProviders(p.providers || []);
    if (c && c.configured) {
      setProvider(c.provider || "mock");
      setEndpoint(c.endpoint || "");
      setMasked(c.auth_token_masked || "");
      setExtra(JSON.stringify(c.extra || {}, null, 2));
      setActive(c.active !== false);
    }
    setSummary(s);
    setLog(l.items || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    let extraObj: any = {};
    try { extraObj = JSON.parse(extra); } catch { /* ignore */ }
    await fetch(`${API}/api/pos-adapter/config`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, endpoint: endpoint || null, auth_token: authToken || null, extra: extraObj, active }),
    });
    setAuthToken("");
    await load();
    setBusy(false);
  };

  const drain = async () => {
    setBusy(true);
    await fetch(`${API}/api/pos-adapter/drain?limit=100`, { method: "POST" });
    await load();
    setBusy(false);
  };

  const testConn = async () => {
    setBusy(true);
    const r = await fetch(`${API}/api/pos-adapter/test-connection`, { method: "POST" });
    const d = await r.json();
    alert(`Test result: ${d.status}\nHTTP ${d.http_status ?? "—"}\n${d.error || d.response_snippet || ""}`);
    await load();
    setBusy(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="pos-adapter-panel">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>Integrations</div>
          <div className="text-[18px] font-semibold text-white mt-0.5">POS Connector</div>
          <div className="text-[10px] text-white/40 mt-0.5">Drains the LUCCCA outbound queue to your POS · Micros / Toast / webhook / mock</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded hover:bg-white/[0.05]" data-testid="pos-refresh">
            <RefreshCw className="w-3.5 h-3.5 text-white/60" />
          </button>
          <button onClick={testConn} disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium"
            style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="pos-test-connection">
            <Wifi className="w-3 h-3" /> Test
          </button>
          <button onClick={drain} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-[10px] font-semibold"
            style={{ background: ACCENT, color: "#0b1020" }} data-testid="pos-drain-btn">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Drain Queue
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 grid grid-cols-12 gap-4 auto-rows-min">
        {/* Queue summary */}
        <div className="col-span-12 grid grid-cols-4 gap-3">
          <StatTile label="Provider" value={summary?.provider || "—"} icon={<Server className="w-3.5 h-3.5" />} />
          <StatTile label="Active" value={summary?.active ? "ON" : "OFF"} tone={summary?.active ? "good" : "bad"} icon={<Wifi className="w-3.5 h-3.5" />} />
          <StatTile label="Pending" value={summary?.queue?.pending ?? 0} tone={summary?.queue?.pending > 0 ? "warn" : "good"} />
          <StatTile label="Delivered" value={summary?.queue?.delivered ?? 0} tone="good" />
        </div>

        {/* Configuration */}
        <div className="col-span-12 lg:col-span-5 rounded-xl p-5" style={{ background: "#0b1020", border: `1px solid ${BORDER}` }} data-testid="pos-config-card">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white mb-3">Configuration</div>

          <label className="block mb-3">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Provider</div>
            <select value={provider} onChange={e => setProvider(e.target.value)}
              className="w-full px-3 py-2 rounded text-[12px] text-white outline-none"
              style={{ background: "#080b14", border: `1px solid ${BORDER}` }} data-testid="pos-provider-select">
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="text-[9px] text-white/40 mt-1">
              {providers.find(p => p.id === provider)?.description}
            </div>
          </label>

          {provider !== "mock" && (
            <>
              <label className="block mb-3">
                <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Endpoint URL</div>
                <input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://api.provider.com/webhook"
                  className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none font-mono"
                  style={{ border: `1px solid ${BORDER}` }} data-testid="pos-endpoint" />
              </label>
              <label className="block mb-3">
                <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">
                  Auth Token (Bearer)
                  {masked && <span className="text-white/30 normal-case ml-1 font-sans">· current {masked}</span>}
                </div>
                <input value={authToken} onChange={e => setAuthToken(e.target.value)} type="password" placeholder="Leave empty to keep existing"
                  className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none font-mono"
                  style={{ border: `1px solid ${BORDER}` }} data-testid="pos-token" />
              </label>
              <label className="block mb-3">
                <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Extra (JSON)</div>
                <textarea value={extra} onChange={e => setExtra(e.target.value)} rows={4}
                  className="w-full px-3 py-2 rounded text-[11px] text-white bg-transparent outline-none font-mono resize-none"
                  style={{ border: `1px solid ${BORDER}` }} placeholder='{"managementGroupGUID":"..."}' />
              </label>
            </>
          )}

          <label className="flex items-center gap-2 text-[11px] text-white/80 cursor-pointer mt-2">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-[#c8a97e]" />
            Adapter is active (drain queue on demand or schedule)
          </label>

          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={save} disabled={busy}
              className="flex items-center gap-1.5 px-5 py-2 rounded-md text-[11px] font-semibold"
              style={{ background: ACCENT, color: "#0b1020" }} data-testid="pos-config-save">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Configuration
            </button>
          </div>
        </div>

        {/* Delivery log */}
        <div className="col-span-12 lg:col-span-7 rounded-xl p-5" style={{ background: "#0b1020", border: `1px solid ${BORDER}` }} data-testid="pos-delivery-log">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white mb-3">Delivery Log · latest 20</div>
          {log.length === 0 && <div className="text-[11px] text-white/40 text-center py-6">No delivery attempts yet. Click Drain Queue to attempt delivery.</div>}
          <div className="space-y-1.5 text-[11px]">
            {log.map((l: any) => (
              <div key={l.id} className="flex items-center gap-2 p-2 rounded" style={{ background: SURFACE, border: `1px solid ${l.status === "delivered" ? `${GREEN}30` : `${RED}30`}` }}>
                <span className="shrink-0">
                  {l.status === "delivered"
                    ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: GREEN }} />
                    : <XCircle className="w-3.5 h-3.5" style={{ color: RED }} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{l.kind}</span>
                    {l.action && <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase"
                      style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}25` }}>{l.action}</span>}
                    <span className="text-[9px] font-mono text-white/40">{l.provider}</span>
                    <span className="ml-auto text-[9px] font-mono text-white/40">{l.duration_ms}ms · HTTP {l.http_status ?? "—"}</span>
                  </div>
                  {l.error && <div className="text-[9px] text-red-400/80 truncate">{l.error}</div>}
                  {!l.error && l.response_snippet && <div className="text-[9px] text-white/40 truncate">{l.response_snippet}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, icon, tone }: any) {
  const color = tone === "good" ? GREEN : tone === "warn" ? "#f59e0b" : tone === "bad" ? RED : ACCENT;
  return (
    <div className="rounded-xl p-3" style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-white/40">
        {icon && <span style={{ color }}>{icon}</span>}
        {label}
      </div>
      <div className="text-[20px] font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}
