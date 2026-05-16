/**
 * Day drill-down modal (iter167) — right-click on a calendar day to see ALL
 * property events (BEOs, spa, reservations, engineering, housekeeping,
 * concierge) broken down by department.
 */
import React, { useEffect, useState } from "react";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

interface DayDetail {
  date: string;
  totals: Record<string, number>;
  grand_total: number;
  by_department: Record<string, any[]>;
}

const DEPT_LABELS: Record<string, string> = {
  events: "Events / BEOs",
  reservations: "Dining reservations",
  spa: "Spa bookings",
  kitchen: "Kitchen / Pastry",
  engineering: "Engineering",
  housekeeping: "Housekeeping",
  concierge: "Concierge requests",
};

const DEPT_COLORS: Record<string, string> = {
  events: "#c8a97e", reservations: "#38bdf8", spa: "#d8b4fe",
  kitchen: "#f59e0b", engineering: "#f97316", housekeeping: "#22c55e", concierge: "#ec4899",
};

export default function DayDrillDownModal({ dateStr, onClose }: { dateStr: string; onClose: () => void }) {
  const [data, setData] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`${API()}/api/global-calendar/day-detail?date=${dateStr}`)
      .then(r => r.json())
      .then(j => { if (mounted) { setData(j); setLoading(false); } })
      .catch((e) => { if (mounted) { setErr(String(e)); setLoading(false); } });
    return () => { mounted = false; };
  }, [dateStr]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div data-testid="day-drill-modal" style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>Property day brief</div>
            <h2 style={S.title}>{new Date(dateStr + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>
            {data && <div style={S.sub}>{data.grand_total} total items across {Object.values(data.totals || {}).filter(n => n > 0).length} departments</div>}
          </div>
          <button data-testid="day-drill-close" onClick={onClose} style={S.closeBtn}>✕</button>
        </header>

        <div style={S.body}>
          {loading && <div style={S.empty}>Loading day detail…</div>}
          {err && <div style={{ ...S.empty, color: "#fca5a5" }}>{err}</div>}
          {data && (
            <div style={S.grid}>
              {Object.keys(DEPT_LABELS).map(dept => {
                const items = data.by_department[dept] || [];
                const color = DEPT_COLORS[dept];
                return (
                  <section key={dept} data-testid={`day-drill-dept-${dept}`} style={{ ...S.deptCard, borderTop: `3px solid ${color}` }}>
                    <header style={S.deptHeader}>
                      <span style={{ fontSize: 11, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>{DEPT_LABELS[dept]}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{items.length}</span>
                    </header>
                    {items.length === 0 ? (
                      <div style={S.deptEmpty}>None scheduled</div>
                    ) : (
                      <ul style={S.deptList}>
                        {items.slice(0, 8).map((it, i) => (
                          <li key={i} style={S.deptItem}>
                            <div style={{ fontSize: 13, color: "#f8fafc", fontWeight: 500 }}>{it.title}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                              {it.time ? `${it.time}` : ""}
                              {it.outlet ? ` · ${it.outlet}` : ""}
                              {it.room ? ` · room ${it.room}` : ""}
                              {it.guest ? ` · ${it.guest}` : ""}
                              {it.guests ? ` · ${it.guests} guests` : ""}
                              {it.party_size ? ` · pax ${it.party_size}` : ""}
                            </div>
                          </li>
                        ))}
                        {items.length > 8 && <li style={{ ...S.deptItem, color: "#64748b", fontStyle: "italic", fontSize: 11 }}>+ {items.length - 8} more</li>}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2147483200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)" },
  modal: { width: "min(1100px, 100%)", maxHeight: "90vh", background: "#0b0f1a", border: "1px solid rgba(200,169,126,0.25)", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" },
  header: { padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { fontSize: 10, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" },
  title: { fontSize: 20, fontWeight: 700, color: "#f8fafc", marginTop: 4 },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  closeBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", width: 32, height: 32, borderRadius: 8, cursor: "pointer" },
  body: { flex: 1, overflow: "auto", padding: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 },
  deptCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" },
  deptHeader: { padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" },
  deptList: { listStyle: "none", padding: 8, margin: 0, display: "flex", flexDirection: "column", gap: 4 },
  deptItem: { padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6 },
  deptEmpty: { padding: 16, fontSize: 12, color: "#64748b", textAlign: "center" },
  empty: { padding: 40, textAlign: "center", color: "#94a3b8" },
};
