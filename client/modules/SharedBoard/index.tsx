/**
 * iter182 · Public read-only dashboard viewer for shared boards.
 * Route: /board/:share_id
 */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

export default function SharedBoard() {
  const { share_id } = useParams<{ share_id: string }>();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/dashboard/board/${share_id}`);
        if (!r.ok) {
          setErr(r.status === 410 ? "This board link has expired." : "Board not found.");
          return;
        }
        const j = await r.json(); setData(j.board);
      } catch (e: any) { setErr(e?.message || "Network error"); }
    })();
  }, [share_id]);

  if (err) return (
    <div style={S.root}>
      <div style={{ padding: 80, textAlign: "center", color: "#fca5a5", fontSize: 16 }}>{err}</div>
    </div>
  );
  if (!data) return <div style={S.root}><div style={{ padding: 80, textAlign: "center", color: "#c8a97e" }}>Loading…</div></div>;

  const ov = data.overview || {};
  const hidden = new Set((data.layout?.hidden) || []);
  const kpis = ((ov.kpi || []) as any[]).filter(k => !hidden.has(k.label));

  return (
    <div data-testid="shared-board-root" style={S.root}>
      <header style={S.header}>
        <div style={S.eyebrow}>Luccca · Shared Board</div>
        <h1 style={S.title}>Executive Overview</h1>
        {data.note && <p style={S.note}>{data.note}</p>}
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
          Shared {new Date(data.created_at).toLocaleString()} · expires {new Date(data.expires_at).toLocaleString()} · views: {data.views || 0}
        </div>
      </header>
      <main style={S.main}>
        <div style={S.grid}>
          {kpis.map((k: any) => (
            <div key={k.label} style={S.kpi}>
              <div style={{ fontSize: 22 }}>{k.icon || "◆"}</div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>{typeof k.value === "number" ? k.value.toLocaleString() : k.value}</div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", marginTop: 4, textTransform: "uppercase", fontWeight: 700 }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, fontSize: 10, color: "#64748b", textAlign: "center", letterSpacing: 2, textTransform: "uppercase" }}>
          EchoAi³ · read-only · no login required
        </div>
      </main>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#04060d", color: "#f5efe4", fontFamily: "system-ui, -apple-system, sans-serif" },
  header: { padding: "40px 24px 20px", maxWidth: 1200, margin: "0 auto" },
  eyebrow: { fontSize: 9, letterSpacing: 4, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 },
  title: { fontSize: 36, fontWeight: 300, letterSpacing: -1, margin: "8px 0 4px" },
  note: { fontSize: 14, color: "#cbd5e1", marginTop: 6 },
  main: { padding: "0 24px 48px", maxWidth: 1200, margin: "0 auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 },
  kpi: { padding: 22, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" },
};
