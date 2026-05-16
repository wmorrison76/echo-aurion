/**
 * iter185 · Shared primitives for GuestConcierge sub-views.
 * API helper, session-scoped token, shared styles, domain types.
 */
import React from "react";

export const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

const SS_TOKEN = "echoai3_guest_token";
export const getGuestToken = () => { try { return sessionStorage.getItem(SS_TOKEN); } catch { return null; } };
export const setGuestToken = (t: string | null) => {
  try { if (t) sessionStorage.setItem(SS_TOKEN, t); else sessionStorage.removeItem(SS_TOKEN); } catch {}
};

export async function guestFetch(path: string, init: RequestInit = {}) {
  const tok = getGuestToken();
  const headers: Record<string, string> = { ...((init.headers as any) || {}) };
  if (tok) headers["X-Guest-Token"] = tok;
  return fetch(`${API()}${path}`, { ...init, headers });
}

// ─── Domain types ─────────────────────────────────────────────────────────
export type Guest = {
  id: string; name: string; room: string;
  vip_tier?: string; check_in?: string; check_out?: string; celebration?: string;
};
export type Venue = {
  id: string; slug: string; name: string; category: string;
  summary?: string; hours?: string; photo_url?: string;
  floor?: string; building?: string; phone_extension?: string;
  reservation_required?: boolean;
  external_reservation_url?: string; menu_qr_url?: string;
};
export type Nearby = {
  id: string; name: string; category: string;
  summary?: string; distance_km?: number; rating?: number;
};
export type Flash = (type: "ok" | "err", msg: string) => void;

// ─── Shared helpers ───────────────────────────────────────────────────────
export function firstName(n?: string) {
  if (!n) return "there";
  return n.split(/\s+/)[0].replace(/[&,]$/, "");
}
export function formatDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d + (d.length === 10 ? "T12:00:00Z" : "")).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return d; }
}
export function timeAgo(iso?: string): string {
  if (!iso) return "just now";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60); return h < 24 ? `${h}h ago` : `${Math.round(h/24)}d ago`;
}

// ─── Shared styles (tree-shaken from the legacy monolith) ─────────────────
export const S: Record<string, React.CSSProperties> = {
  landingRoot: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #0f1523 0%, #050812 60%, #020307 100%)",
    color: "#f5efe4",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24,
  },
  landingCard: {
    maxWidth: 420, width: "100%", padding: 32,
    borderRadius: 24,
    background: "rgba(200,169,126,0.04)",
    border: "1px solid rgba(200,169,126,0.18)",
    backdropFilter: "blur(20px)",
  },
  landingHello: { fontSize: 38, margin: "10px 0 8px", fontWeight: 200, letterSpacing: -1, color: "#f5efe4" },
  landingSub: { fontSize: 13, color: "#94a3b8", lineHeight: 1.6 },
  landingFoot: { fontSize: 10, color: "#64748b", textAlign: "center", marginTop: 24, letterSpacing: 0.5 },

  root: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #0f1523 0%, #050812 60%, #020307 100%)",
    color: "#f5efe4",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    padding: "24px 18px 120px",
    maxWidth: 520, margin: "0 auto",
  },
  loadingRoot: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050812", color: "#c8a97e", fontFamily: "system-ui" },
  header: { display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 24 },
  eyebrow: { fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700 },
  hello: { fontSize: 28, margin: "8px 0 4px", fontWeight: 200, letterSpacing: -0.5, color: "#f5efe4" },
  stay: { fontSize: 11, color: "#94a3b8" },
  celebration: { marginTop: 8, padding: "5px 10px", borderRadius: 999, background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.3)", fontSize: 11, color: "#fbcfe8", display: "inline-block" },

  section: { marginTop: 20 },
  h2: { fontSize: 10, letterSpacing: 4, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 },
  viewHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 16 },
  quickGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  quickCard: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "20px 10px", minHeight: 110,
    borderRadius: 16,
    background: "rgba(200,169,126,0.06)",
    border: "1px solid rgba(200,169,126,0.25)",
    color: "#f5efe4",
    cursor: "pointer", transition: "transform 0.15s ease, background 0.15s ease",
  },
  label: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700, display: "block", marginBottom: 6 },
  input: { width: "100%", padding: "14px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,169,126,0.25)", color: "#f5efe4", fontSize: 15, outline: "none", boxSizing: "border-box" as any },
  primaryBtn: {
    width: "100%", padding: 14, borderRadius: 12, border: "none",
    background: "linear-gradient(90deg, #c8a97e, #e9d5a5)",
    color: "#0a0e1a", fontWeight: 700, fontSize: 13, letterSpacing: 1.5,
    textTransform: "uppercase", cursor: "pointer",
  },
  linkBtn: { background: "transparent", border: 0, color: "#c8a97e", fontSize: 12, cursor: "pointer", padding: "4px 8px" },
  errMsg: { marginTop: 14, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: "#fca5a5" },
  venueCard: { padding: 14, marginBottom: 10, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" },
  reqCard: { padding: 12, marginBottom: 8, borderRadius: 12, background: "rgba(200,169,126,0.04)", borderLeft: "2px solid #c8a97e" },
  reqStatus: { fontSize: 8, padding: "2px 7px", background: "rgba(200,169,126,0.2)", color: "#c8a97e", borderRadius: 4, letterSpacing: 1.5, fontWeight: 700, whiteSpace: "nowrap" },
  toast: { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "10px 18px", borderRadius: 999, color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 6px 24px rgba(0,0,0,0.5)", zIndex: 9999, maxWidth: "90%", textAlign: "center" },
  ghostBtn: { flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(200,169,126,0.35)", background: "transparent", color: "#c8a97e", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" },
  goldBtn: { flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", background: "linear-gradient(90deg, #c8a97e, #e9d5a5)", color: "#0a0e1a", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" },
  qtyBtn: { width: 30, height: 30, borderRadius: 999, border: "1px solid rgba(200,169,126,0.35)", background: "transparent", color: "#c8a97e", fontSize: 18, fontWeight: 700, cursor: "pointer", lineHeight: 1 },
  qtyBtnGold: { width: 32, height: 32, borderRadius: 999, border: "none", background: "linear-gradient(135deg, #c8a97e, #e9d5a5)", color: "#0a0e1a", fontSize: 18, fontWeight: 700, cursor: "pointer", lineHeight: 1 },
  chipGold: { fontSize: 9, letterSpacing: 1, padding: "2px 7px", borderRadius: 999, background: "rgba(200,169,126,0.12)", color: "#c8a97e", border: "1px solid rgba(200,169,126,0.25)", textTransform: "uppercase", fontWeight: 700 },
  chipWarn: { fontSize: 9, letterSpacing: 0.5, padding: "2px 7px", borderRadius: 999, background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", fontWeight: 600 },
};

// ─── Small shared primitives ──────────────────────────────────────────────
export function QuickCard({ testid, emoji, label, subtitle, onClick, busy }: {
  testid?: string; emoji: string; label: string; subtitle?: string;
  onClick: () => void; busy?: boolean;
}) {
  return (
    <button data-testid={testid} onClick={onClick} disabled={busy} style={{ ...S.quickCard, opacity: busy ? 0.6 : 1 }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4", letterSpacing: 0.3 }}>{busy ? "…" : label}</div>
      {subtitle && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, textAlign: "center" }}>{subtitle}</div>}
    </button>
  );
}

export function RequestCard({ r }: { r: any }) {
  const iconFor = (k: string) => k === "valet" ? "🚘" : k === "luggage" ? "🧳" : k === "transport" ? "🛺" : "🛎";
  return (
    <div data-testid={`req-${r.id}`} style={S.reqCard}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 600, textTransform: "capitalize" }}>{iconFor(r.kind)} {r.kind}</div>
        <span style={S.reqStatus}>{(r.status || "pending").toUpperCase()}</span>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
        {r.payload?.message || (r.payload?.eta && `ETA ${new Date(r.payload.eta).toLocaleTimeString()}`)}
        {r.payload?.from_location && `${r.payload.from_location} → ${r.payload.to_location}`}
      </div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>{timeAgo(r.created_at)}</div>
    </div>
  );
}
