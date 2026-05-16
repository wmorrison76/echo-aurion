/**
 * iter180 · Concierge Mobile Admin
 *
 * Panel for concierge staff to:
 *   - See all current/arriving guests
 *   - Mint a mobile-companion link for any guest
 *   - View the QR code + copy link + send by SMS/email (browser share API)
 *   - Revoke old tokens
 */
import React, { useEffect, useState } from "react";
import { usePanelState } from "@/lib/usePanelState";
import { adminFetch } from "@/lib/admin-auth";
import { ensureAdminToken } from "@/lib/admin-auth";

const PANEL_ID = "concierge-mobile-admin";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type Guest = {
  id: string; display_name?: string; name?: string; room?: string;
  check_in?: string; check_out?: string;
  vip_tier?: string; repeat?: boolean;
  preferences?: Record<string, any>;
  active_token_count?: number;
  latest_token?: string;
  latest_token_expires_at?: string;
};

export default function ConciergeMobileAdmin() {
  const [hasToken, setHasToken] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filter, setFilter] = usePanelState<string>(PANEL_ID, "filter", "");
  const [sel, setSel] = useState<Guest | null>(null);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [ttl, setTtl] = usePanelState<number>(PANEL_ID, "ttl", 7);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setHasToken(ensureAdminToken()); }, []);
  useEffect(() => { if (hasToken) load(); }, [hasToken]);

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API()}/api/concierge-mobile/guests`);
      if (r.ok) { const j = await r.json(); setGuests(j.guests || []); }
    } finally { setLoading(false); }
  }

  async function mint(g: Guest) {
    const r = await adminFetch(`${API()}/api/concierge-mobile/mint`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_id: g.id, ttl_days: ttl }),
    });
    if (!r.ok) { alert("Mint failed: " + await r.text()); return; }
    const j = await r.json();
    await load();
    const fresh: Guest = { ...g, latest_token: j.token, active_token_count: (g.active_token_count || 0) + 1 };
    setSel(fresh);
    await loadQr(j.token);
  }

  async function loadQr(token: string) {
    setQrSvg("");
    try {
      const r = await adminFetch(`${API()}/api/concierge-mobile/qr/${token}`);
      if (r.ok) setQrSvg(await r.text());
    } catch {}
  }

  async function revoke(token: string) {
    if (!confirm("Revoke this mobile link?")) return;
    const r = await adminFetch(`${API()}/api/concierge-mobile/revoke/${token}`, { method: "POST" });
    if (r.ok) { setQrSvg(""); await load(); if (sel) setSel({ ...sel, latest_token: undefined }); }
  }

  function companionUrl(token: string) {
    return `${window.location.origin}/m/concierge/${token}`;
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); alertFlash("Copied to clipboard"); }
    catch { alert(text); }
  }

  function alertFlash(msg: string) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 18px;background:#0f766e;color:#fff;border-radius:999px;z-index:99999;font-weight:600;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,0.3)";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  async function share(g: Guest, token: string) {
    const url = companionUrl(token);
    const text = `Welcome, ${firstName(g.display_name || g.name || "guest")} — your Echo Concierge companion is ready: ${url}`;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Echo Concierge", text, url }); }
      catch {}
    } else {
      copy(text);
    }
  }

  if (!hasToken) {
    return (
      <div style={S.lock}>
        <div style={S.eyebrow}>Concierge · Mobile Admin</div>
        <h2 style={{ marginTop: 10, fontSize: 20 }}>Admin token required</h2>
        <button data-testid="cm-admin-auth" onClick={() => setHasToken(ensureAdminToken())} style={S.primary}>Enter token</button>
      </div>
    );
  }

  const f = filter.trim().toLowerCase();
  const filtered = guests.filter(g =>
    !f ||
    (g.display_name || g.name || "").toLowerCase().includes(f) ||
    (g.room || "").toLowerCase().includes(f) ||
    (g.id || "").toLowerCase().includes(f)
  );

  return (
    <div data-testid="cm-admin-panel" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>Concierge · Mobile Links</div>
          <h1 style={S.title}>Guest Companion Admin</h1>
          <p style={S.sub}>Mint magic-link tokens for guests, share via QR or SMS.</p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, height: "calc(100% - 120px)" }}>
        {/* Guest list */}
        <div style={{ overflow: "auto" }}>
          <div style={S.toolbar}>
            <input data-testid="cm-search" placeholder="Search name, room, id…" value={filter} onChange={e => setFilter(e.target.value)} style={S.input} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
              TTL (days)
              <input type="number" min={1} max={30} value={ttl} onChange={e => setTtl(parseInt(e.target.value) || 7)} style={{ ...S.input, width: 60 }} />
            </label>
            <button onClick={load} style={S.ghost} data-testid="cm-refresh">{loading ? "…" : "Refresh"}</button>
          </div>
          <div style={S.grid}>
            {filtered.map((g) => (
              <div key={g.id} data-testid={`cm-row-${g.id}`} style={{ ...S.card, borderLeft: `3px solid ${tierColor(g.vip_tier)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>{g.display_name || g.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Room {g.room || "—"} · {g.check_in || "?"} → {g.check_out || "?"}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ ...S.pill, color: tierColor(g.vip_tier), borderColor: tierColor(g.vip_tier) }}>{(g.vip_tier || "standard").toUpperCase()}</span>
                      {g.repeat && <span style={S.pill}>RETURNING</span>}
                      {g.preferences?.celebration && <span style={{ ...S.pill, color: "#fbcfe8", borderColor: "rgba(236,72,153,0.5)" }}>✦ {g.preferences.celebration}</span>}
                      {(g.active_token_count || 0) > 0 && <span style={{ ...S.pill, color: "#86efac", borderColor: "rgba(34,197,94,0.5)" }}>🔗 {g.active_token_count} active</span>}
                    </div>
                  </div>
                  <button data-testid={`cm-mint-${g.id}`} onClick={() => mint(g)} style={S.primary}>
                    {g.latest_token ? "Re-mint" : "Mint link"}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={S.empty}>{loading ? "Loading…" : "No guests match. Seed demo guests with POST /api/concierge-mobile/mint once a reservation exists."}</div>}
          </div>
        </div>

        {/* Right pane — QR + actions */}
        <aside style={S.aside}>
          {sel ? (
            <>
              <div style={S.eyebrow}>Selected guest</div>
              <h2 style={{ margin: "6px 0 12px", fontSize: 18, color: "#f8fafc" }}>{sel.display_name || sel.name}</h2>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Room {sel.room || "—"} · {sel.id}</div>
              {sel.latest_token ? (
                <>
                  <div data-testid="cm-qr-box" style={S.qrBox}>
                    {qrSvg ? (
                      <div
                        style={{ width: 260, height: 260 }}
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    ) : (
                      <div style={{ fontSize: 11, color: "#64748b" }}>Loading QR…</div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>Expires {sel.latest_token_expires_at ? new Date(sel.latest_token_expires_at).toLocaleDateString() : "—"}</div>
                  <div data-testid="cm-link-row" style={S.linkRow}>
                    <input readOnly value={companionUrl(sel.latest_token)} style={{ ...S.input, flex: 1, fontSize: 11 }} />
                    <button data-testid="cm-copy-link" onClick={() => copy(companionUrl(sel.latest_token!))} style={S.ghost}>Copy</button>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button data-testid="cm-share" onClick={() => share(sel, sel.latest_token!)} style={{ ...S.primary, flex: 1 }}>📤 Share</button>
                    <button data-testid="cm-revoke" onClick={() => revoke(sel.latest_token!)} style={{ ...S.danger, flex: 1 }}>Revoke</button>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>No active link yet.</div>
                  <button data-testid="cm-aside-mint" onClick={() => mint(sel)} style={{ ...S.primary, marginTop: 8, width: "100%" }}>Mint link for {firstName(sel.display_name || sel.name || "guest")}</button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
              <div style={{ fontSize: 38, marginBottom: 12 }}>📱</div>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>Pick a guest to mint a mobile companion link.</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function firstName(n: string) { return (n || "").trim().split(/\s+/)[0].replace(/[,&]$/, "") || "guest"; }
function tierColor(t?: string): string {
  const k = (t || "").toLowerCase();
  if (k === "diamond") return "#b7c9d8";
  if (k === "platinum") return "#e6e6e6";
  if (k === "gold") return "#d4af37";
  if (k === "silver") return "#c0c0c0";
  return "#94a3b8";
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: 20, color: "#e2e8f0", height: "100%", display: "flex", flexDirection: "column" },
  header: { marginBottom: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 4, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 },
  title: { fontSize: 22, margin: "6px 0 4px", color: "#f8fafc", fontWeight: 300 },
  sub: { fontSize: 12, color: "#94a3b8", margin: 0 },
  toolbar: { display: "flex", gap: 8, marginBottom: 12, alignItems: "center" },
  input: { padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#f8fafc", fontSize: 12 },
  primary: { padding: "6px 12px", borderRadius: 6, border: "1px solid #c8a97e", background: "linear-gradient(90deg, rgba(200,169,126,0.2), rgba(200,169,126,0.05))", color: "#c8a97e", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" },
  ghost: { padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontSize: 11, cursor: "pointer" },
  danger: { padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#fca5a5", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 8, paddingRight: 8 },
  card: { padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" },
  pill: { fontSize: 9, padding: "2px 7px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", letterSpacing: 1, fontWeight: 700 },
  empty: { padding: 40, textAlign: "center", color: "#64748b", fontSize: 12 },
  aside: { padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "auto" },
  qrBox: { marginTop: 14, padding: 16, background: "#fff", borderRadius: 10, display: "flex", justifyContent: "center", alignItems: "center" },
  linkRow: { display: "flex", gap: 6, marginTop: 10, alignItems: "stretch" },
  lock: { padding: 60, textAlign: "center", color: "#e2e8f0" },
};
