// iter204 · Echo AI³ Pending-Action Banner (human confirmation gate).
// Polls /api/echo-ai3/actions/pending every 20s; when any pending action exists,
// surfaces a sticky top-of-screen banner with Approve / Reject buttons per action.
// NOTHING executes until the user explicitly clicks Approve — this is the
// non-negotiable gate from the Echo AI³ brief (rule #1).
import React, { useEffect, useState, useCallback } from "react";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || window.location.origin;
};

type PendingAction = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  reversible: boolean;
  risk_level: "low" | "medium" | "high";
  money_amount?: number | null;
  created_at: string;
};

export function PendingActionBanner() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API()}/api/echo-ai3/actions/pending?limit=10`);
      if (!r.ok) return;
      const j = await r.json();
      setActions(j.actions || []);
    } catch { /* quiet */ }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20_000);
    return () => clearInterval(iv);
  }, [load]);

  async function act(id: string, verb: "approve" | "reject") {
    setBusy(id);
    try {
      const r = await fetch(`${API()}/api/echo-ai3/actions/${id}/${verb}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User": (typeof window !== "undefined" && localStorage.getItem("auth_user_name")) || "unknown" },
      });
      if (r.ok) await load();
    } finally { setBusy(null); }
  }

  if (actions.length === 0) return null;

  const high = actions.filter(a => a.risk_level === "high").length;
  const money = actions.filter(a => typeof a.money_amount === "number" && (a.money_amount || 0) > 0).length;

  return (
    <div data-testid="pending-action-banner" className="sticky top-0 z-[99900] w-full border-b"
      style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.18), rgba(239,68,68,0.1))", borderColor: "rgba(245,158,11,0.35)" }}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase text-amber-300" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)" }}>
            Echo AI³ · {actions.length} pending
          </div>
          <div className="text-[11px] text-amber-100 truncate">
            {high > 0 && <span className="text-red-300">{high} high-risk · </span>}
            {money > 0 && <span>{money} money action{money === 1 ? "" : "s"} · </span>}
            awaiting your approval
          </div>
        </div>
        <button data-testid="pending-collapse" onClick={() => setCollapsed(v => !v)} className="text-[10px] text-slate-300 px-2 py-0.5 rounded border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pb-2 max-h-[280px] overflow-y-auto space-y-1.5">
          {actions.map(a => (
            <div key={a.id} data-testid={`pending-action-${a.id}`} className="flex items-start gap-2 p-2 rounded border"
              style={{ background: "rgba(0,0,0,0.25)", borderColor: a.risk_level === "high" ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.08)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-white">{a.title}</span>
                  <span className="text-[9px] px-1 rounded font-mono uppercase tracking-wider"
                    style={{
                      background: a.risk_level === "high" ? "rgba(239,68,68,0.2)" : a.risk_level === "medium" ? "rgba(245,158,11,0.2)" : "rgba(100,116,139,0.2)",
                      color: a.risk_level === "high" ? "#fca5a5" : a.risk_level === "medium" ? "#fcd34d" : "#cbd5e1",
                    }}>{a.risk_level}</span>
                  <span className="text-[9px] px-1 rounded font-mono text-slate-400" style={{ background: "rgba(255,255,255,0.05)" }}>{a.kind}</span>
                  {typeof a.money_amount === "number" && a.money_amount > 0 && (
                    <span className="text-[9px] px-1 rounded font-mono text-emerald-300" style={{ background: "rgba(16,185,129,0.15)" }}>${a.money_amount.toFixed(2)}</span>
                  )}
                  {a.reversible && <span className="text-[9px] px-1 rounded font-mono text-slate-400">reversible</span>}
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">{a.summary}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button data-testid={`pending-reject-${a.id}`} disabled={busy === a.id} onClick={() => act(a.id, "reject")}
                  className="px-2 py-1 text-[10px] rounded border disabled:opacity-40"
                  style={{ borderColor: "rgba(239,68,68,0.4)", color: "#fca5a5" }}>Reject</button>
                <button data-testid={`pending-approve-${a.id}`} disabled={busy === a.id} onClick={() => act(a.id, "approve")}
                  className="px-2 py-1 text-[10px] rounded text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#10b981,#3b82f6)" }}>
                  {busy === a.id ? "…" : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingActionBanner;
