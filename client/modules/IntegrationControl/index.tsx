import React, { useState, useEffect } from "react";

const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#3b82f6", accentDim: "rgba(59,130,246,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", purple: "#8b5cf6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>;
}

interface Integration {
  name: string; type: string; status: string; description: string; environment?: string; configured_at?: string; last_sync?: string;
}

function IntegrationCard({ int, onConfigure, onTest }: { int: Integration; onConfigure: () => void; onTest: () => void }) {
  const typeColors: Record<string, string> = { pos: C.amber, gl: C.green, email: C.purple };
  const statusColors: Record<string, string> = { configured: C.green, not_configured: C.dim, partial: C.amber };
  const typeIcons: Record<string, string> = {
    pos: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z",
    gl: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    email: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  };
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderLeft: `4px solid ${typeColors[int.type] || C.accent}`, transition: "all 0.2s" }} data-testid={`integration-card-${int.name.toLowerCase().replace(/\s/g, "-")}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${typeColors[int.type] || C.accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={typeColors[int.type] || C.accent}><path d={typeIcons[int.type] || typeIcons.pos} /></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{int.name}</div>
            <Badge text={int.type} color={typeColors[int.type] || C.accent} />
          </div>
        </div>
        <Badge text={int.status.replace("_", " ")} color={statusColors[int.status] || C.dim} />
      </div>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, marginBottom: 14 }}>{int.description}</div>
      {int.configured_at && <div style={{ fontSize: 9, color: C.muted, marginBottom: 8 }}>Configured: {int.configured_at?.slice(0, 10)} | Env: {int.environment || "sandbox"}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onConfigure} data-testid={`configure-${int.name.toLowerCase().replace(/\s/g, "-")}`} style={{ padding: "7px 18px", borderRadius: 6, border: `1px solid ${C.accent}`, background: int.status === "configured" ? "transparent" : C.accent, color: int.status === "configured" ? C.accent : "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{int.status === "configured" ? "Update Keys" : "Configure"}</button>
        {int.status === "configured" && <button onClick={onTest} style={{ padding: "7px 18px", borderRadius: 6, border: `1px solid ${C.green}`, background: "transparent", color: C.green, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Test Connection</button>}
      </div>
    </div>
  );
}

function ConfigModal({ provider, onClose }: { provider: string; onClose: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [env, setEnv] = useState("sandbox");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/integrations/configure`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: provider.toLowerCase().replace(/\s/g, ""), api_key: apiKey, client_id: clientId, client_secret: clientSecret, environment: env }) });
      const d = await r.json();
      setResult(d.status === "configured" ? "Configured successfully!" : "Error configuring");
    } catch { setResult("Error saving configuration"); }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, width: 440, maxWidth: "90vw" }} data-testid="integration-config-modal">
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Configure {provider}</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>API Key</label>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter API key..." type="password" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} data-testid="config-api-key" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Client ID</label>
            <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Client ID" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Client Secret</label>
            <input value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Client Secret" type="password" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, display: "block" }}>Environment</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["sandbox", "production"].map(e => (
              <button key={e} onClick={() => setEnv(e)} style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${env === e ? C.accent : C.border}`, background: env === e ? C.accentDim : "transparent", color: env === e ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{e}</button>
            ))}
          </div>
        </div>
        {result && <div style={{ fontSize: 11, color: result.includes("success") ? C.green : C.red, marginBottom: 12 }}>{result}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 12, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={saving} data-testid="config-save-btn" style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving..." : "Save Configuration"}</button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationControl() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [opsIntegrations, setOpsIntegrations] = useState<any[]>([]);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [emailQueue, setEmailQueue] = useState<any[]>([]);

  const load = () => {
    fetch(`${API}/api/integrations/status`).then(r => r.json()).then(d => setIntegrations(d.integrations || []));
    fetch(`${API}/api/engineering-ops/integrations`).then(r => r.json()).then(d => setOpsIntegrations(d.integrations || [])).catch(() => {});
    fetch(`${API}/api/integrations/email/queue`).then(r => r.json()).then(d => setEmailQueue(d.emails || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const testConnection = async (provider: string) => {
    try {
      const r = await fetch(`${API}/api/integrations/test/${provider.toLowerCase().replace(/\s/g, "")}`, { method: "POST" });
      const d = await r.json();
      setTestResult(`${provider}: ${d.message}`);
      setTimeout(() => setTestResult(null), 5000);
    } catch { setTestResult(`${provider}: Connection test failed`); }
  };

  const configured = integrations.filter(i => i.status === "configured").length;

  return (
    <div data-testid="integration-control-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(59,130,246,0.04)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Integration Hub</div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{configured}/{integrations.length} integrations configured | {opsIntegrations.length} ops connectors available</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {testResult && <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, background: testResult.includes("failed") ? `${C.red}15` : `${C.green}15`, color: testResult.includes("failed") ? C.red : C.green, fontSize: 12 }} data-testid="test-result">{testResult}</div>}

        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 3, height: 16, background: C.accent, borderRadius: 2 }} />POS & Financial Integrations</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {integrations.filter(i => i.type === "pos" || i.type === "gl").map(int => (
            <IntegrationCard key={int.name} int={int} onConfigure={() => setConfiguring(int.name)} onTest={() => testConnection(int.name)} />
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 3, height: 16, background: C.purple, borderRadius: 2 }} />Email & Communication</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {integrations.filter(i => i.type === "email").map(int => (
            <IntegrationCard key={int.name} int={int} onConfigure={() => setConfiguring(int.name)} onTest={() => testConnection(int.name)} />
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 3, height: 16, background: C.amber, borderRadius: 2 }} />Operations Platforms</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {opsIntegrations.map((int: any) => (
            <div key={int.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderLeft: `4px solid ${C.amber}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{int.name}</div>
                <Badge text={int.connected ? "Connected" : "Available"} color={int.connected ? C.green : C.amber} />
              </div>
              <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, marginBottom: 12 }}>{int.description}</div>
              <button style={{ padding: "7px 18px", borderRadius: 6, border: `1px solid ${C.amber}`, background: "transparent", color: C.amber, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{int.connected ? "Settings" : "Configure API Key"}</button>
            </div>
          ))}
        </div>

        {emailQueue.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 3, height: 16, background: C.green, borderRadius: 2 }} />Email Queue</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: "rgba(59,130,246,0.06)" }}>{["To", "Subject", "Status", "Date"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                <tbody>
                  {emailQueue.map((e: any) => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}40` }}>
                      <td style={{ padding: "8px 12px", color: C.text }}>{e.to}</td>
                      <td style={{ padding: "8px 12px", color: C.text }}>{e.subject}</td>
                      <td style={{ padding: "8px 12px" }}><Badge text={e.status} color={e.status === "sent" ? C.green : C.amber} /></td>
                      <td style={{ padding: "8px 12px", color: C.dim }}>{e.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {configuring && <ConfigModal provider={configuring} onClose={() => { setConfiguring(null); load(); }} />}
    </div>
  );
}
