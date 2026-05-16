/** iter240 · Live reservations banner + hour-by-hour drawer.
 *
 * William's spec:
 *   - When reservations are made/changed, a banner floats from the right
 *     ("RESV 67"). Click → hour-by-hour sheet with color-coded covers
 *     (heat-map by pct capacity).
 *   - Rows show VIP / returning / had-glitch / resort-guest chips.
 *   - When the outlet is fully committed, render a red "FULLY COMMITTED"
 *     stripe and the property-wide concierge alert banner at top.
 *
 * Why this design:
 *   - A right-edge pill stays out of the way of the tab bar and the Echo
 *     mini button. It pulses on new count and auto-settles after 3s.
 *   - The drawer uses a vertical hour list so thumb-scroll feels natural
 *     on a phone held in one hand.
 */
import React from "react";
import { API } from "@/lib/api-url";

type Resv = {
  id: string; venue_slug: string; date: string; time: string;
  party_size: number; guest_name?: string; room?: string;
  flags?: string[]; tier?: string | null; status?: string;
};

type Hour = {
  hour: string; covers: number; reservations_count: number;
  color: string; reservation_ids: string[];
};

type LiveData = {
  outlet_id?: string; outlet_name?: string; date: string;
  total_covers: number; total_reservations: number;
  capacity: number; pct_committed: number; is_full: boolean;
  hours: Hour[]; reservations: Resv[]; new_count?: number; fetched_at: string;
};

export function ReservationsBanner({ outletId, variant = "floating" }:
                                            { outletId: string; variant?: "floating" | "docked" }) {
  const [data, setData] = React.useState<LiveData | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [pulse, setPulse] = React.useState(false);
  const [toast, setToast] = React.useState<{ delta: number; ts: number } | null>(null);
  const lastCount = React.useRef<number>(-1);
  const lastFetchedAt = React.useRef<string | null>(null);

  const fetchLive = React.useCallback(() => {
    const qs = new URLSearchParams({ outlet_id: outletId });
    if (lastFetchedAt.current) qs.set("since_ts", lastFetchedAt.current);
    fetch(`${API()}/api/ecw-ops/reservations/live?${qs}`)
      .then((r) => r.json())
      .then((d: LiveData) => {
        if (!d?.ok && !d?.hours) return;
        const prev = lastCount.current;
        if (prev !== -1 && d.total_covers !== prev) {
          const delta = d.total_covers - prev;
          setPulse(true);
          window.setTimeout(() => setPulse(false), 2800);
          // Toast only for positive changes (new bookings) or cancellations
          setToast({ delta, ts: Date.now() });
          window.setTimeout(() => setToast((t) => (t && Date.now() - t.ts >= 5000 ? null : t)), 5200);
        }
        lastCount.current = d.total_covers;
        lastFetchedAt.current = d.fetched_at;
        setData(d);
      })
      .catch(() => undefined);
  }, [outletId]);

  React.useEffect(() => {
    lastCount.current = -1;
    lastFetchedAt.current = null;
    fetchLive();
    const int = window.setInterval(() => {
      if (!document.hidden) fetchLive();
    }, 20_000);                                  // 20s heartbeat
    return () => window.clearInterval(int);
  }, [fetchLive]);

  if (!data) return null;

  const count = data.total_covers;
  const isFull = data.is_full;

  // ── DOCKED variant (Claude/William feedback) ─────────────────────────
  // Lives in the header flow under "Culinary" — shows 85/120 denominator,
  // gold progress rail, no clipping over KPIs/VIP cards/inventory rows.
  if (variant === "docked") {
    const pct = Math.round(data.pct_committed * 100);
    return (
      <>
        <button data-testid="resv-docked-card"
          onClick={() => setDrawerOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            width: "100%", padding: "10px 12px", borderRadius: 8,
            background: isFull ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isFull ? "#ef4444aa" : "rgba(212,175,55,0.32)"}`,
            color: "#f5efe4", fontFamily: "inherit", cursor: "pointer",
            transform: pulse ? "scale(1.01)" : "scale(1)",
            transition: "transform 250ms, background 250ms",
            margin: "0 0 10px",
          }}>
          <div style={{
            fontSize: 9, letterSpacing: 2, fontWeight: 700,
            color: isFull ? "#fca5a5" : "#d4af37",
            paddingRight: 10, borderRight: "1px solid rgba(255,255,255,0.1)",
          }}>📅 RESV</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span data-testid="resv-docked-count" style={{
              fontSize: 22, fontWeight: 700,
              color: isFull ? "#fff" : "#f5efe4",
            }}>{count}</span>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>/&nbsp;{data.capacity}</span>
          </div>
          <div style={{ flex: 1, marginLeft: 6 }}>
            <div data-testid="resv-docked-rail" style={{
              height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden", position: "relative",
            }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${Math.min(pct, 100)}%`,
                background: isFull ? "#ef4444"
                              : pct > 80 ? "linear-gradient(90deg, #d4af37 0%, #f59e0b 100%)"
                              : "linear-gradient(90deg, #d4af37 0%, #fbbf24 100%)",
                transition: "width 400ms ease-out",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between",
                            marginTop: 4, fontSize: 9, color: "#94a3b8" }}>
              <span>{pct}% committed</span>
              <span>{data.total_reservations} bookings</span>
              {isFull && <span data-testid="resv-docked-full" style={{
                color: "#ef4444", fontWeight: 700, letterSpacing: 1,
              }}>FULL</span>}
            </div>
          </div>
          <div style={{ fontSize: 16, color: "#94a3b8" }}>›</div>
        </button>
        {drawerOpen && <HourByHourDrawer data={data} onClose={() => setDrawerOpen(false)} />}
      </>
    );
  }

  return (
    <>
      {/* Right-edge floating banner */}
      <button data-testid="resv-banner"
        onClick={() => setDrawerOpen(true)}
        style={{
          position: "fixed",
          top: 180, right: 0,
          zIndex: 99999980,
          background: isFull ? "rgba(239,68,68,0.95)" : "rgba(12,18,32,0.95)",
          border: `1px solid ${isFull ? "#fecaca" : "rgba(212,175,55,0.55)"}`,
          borderRight: "none",
          borderRadius: "12px 0 0 12px",
          padding: "10px 10px 10px 14px",
          color: isFull ? "#fff" : "#d4af37",
          fontFamily: "inherit",
          cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          boxShadow: "-4px 4px 14px rgba(0,0,0,0.4)",
          transition: "transform 250ms, background 250ms",
          transform: pulse ? "translateX(-4px) scale(1.05)" : "translateX(0) scale(1)",
          animation: pulse ? "resvPulse 600ms ease-in-out 2" : undefined,
        }}>
        <style>{`
          @keyframes resvPulse {
            0%,100% { box-shadow: -4px 4px 14px rgba(0,0,0,0.4); }
            50%     { box-shadow: -4px 4px 22px rgba(212,175,55,0.8), 0 0 24px rgba(212,175,55,0.5); }
          }
        `}</style>
        <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.85, fontWeight: 700 }}>
          RESV
        </div>
        <div data-testid="resv-banner-count" style={{
          fontSize: 20, fontWeight: 700, lineHeight: 1,
          color: isFull ? "#fff" : "#f5efe4",
        }}>
          {count}
        </div>
        <div style={{ fontSize: 8, letterSpacing: 1, opacity: 0.7 }}>
          {Math.round(data.pct_committed * 100)}%
        </div>
        {isFull && (
          <div data-testid="resv-banner-full" style={{
            fontSize: 7, letterSpacing: 1.5, marginTop: 2,
            background: "rgba(255,255,255,0.18)", padding: "1px 4px",
            borderRadius: 2, fontWeight: 700,
          }}>
            FULL
          </div>
        )}
      </button>

      {drawerOpen && (
        <HourByHourDrawer data={data} onClose={() => setDrawerOpen(false)} />
      )}

      {toast && (
        <button data-testid="resv-toast"
          onClick={() => { setToast(null); setDrawerOpen(true); }}
          style={{
            position: "fixed",
            top: 120, right: 8,
            zIndex: 99999984,
            background: toast.delta > 0
              ? "linear-gradient(135deg, rgba(16,185,129,0.96) 0%, rgba(5,150,105,0.96) 100%)"
              : "linear-gradient(135deg, rgba(239,68,68,0.96) 0%, rgba(185,28,28,0.96) 100%)",
            border: `1px solid ${toast.delta > 0 ? "rgba(110,231,183,0.7)" : "rgba(254,202,202,0.7)"}`,
            borderRadius: 10,
            padding: "10px 14px",
            color: "#fff",
            fontFamily: "inherit",
            cursor: "pointer",
            boxShadow: "-2px 4px 20px rgba(0,0,0,0.5)",
            display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
            animation: "resvToastIn 320ms cubic-bezier(0.25,1,0.5,1) both",
            maxWidth: 220,
          }}>
          <style>{`
            @keyframes resvToastIn {
              0%   { opacity:0; transform: translateX(110%); }
              100% { opacity:1; transform: translateX(0); }
            }
          `}</style>
          <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.92, fontWeight: 700 }}>
            {toast.delta > 0 ? "📣 NEW BOOKING" : "✕ CANCELLATION"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.15 }}>
            {toast.delta > 0 ? `+${toast.delta}` : toast.delta} cover{Math.abs(toast.delta) === 1 ? "" : "s"}
          </div>
          <div style={{ fontSize: 9, opacity: 0.85, letterSpacing: 0.5 }}>
            Tap to see hour-by-hour
          </div>
        </button>
      )}
    </>
  );
}


function HourByHourDrawer({ data, onClose }: { data: LiveData; onClose: () => void }) {
  const [activeHour, setActiveHour] = React.useState<string | null>(null);
  const rowsByHour = React.useMemo(() => {
    const map: Record<string, Resv[]> = {};
    for (const h of data.hours) map[h.hour] = [];
    for (const r of data.reservations) {
      const hh = (r.time || "").slice(0, 2) + ":00";
      if (map[hh]) map[hh].push(r);
    }
    return map;
  }, [data]);

  return (
    <div data-testid="resv-drawer"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99999985,
        background: "rgba(0,0,0,0.6)", display: "flex",
        justifyContent: "flex-end", backdropFilter: "blur(4px)",
      }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(440px, 92%)", height: "100%",
        background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
        borderLeft: "1px solid rgba(212,175,55,0.3)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: 14, borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>
                📅 LIVE RESERVATIONS
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 400, color: "#f5efe4", margin: "2px 0" }}>
                {data.outlet_name || data.outlet_id || "Outlet"} · {data.date}
              </h2>
            </div>
            <button data-testid="resv-drawer-close" onClick={onClose} style={{
              background: "transparent", border: "1px solid rgba(148,163,184,0.3)",
              color: "#94a3b8", borderRadius: 6, width: 30, height: 30,
              cursor: "pointer", fontSize: 16,
            }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
            <span data-testid="resv-drawer-total"><b style={{ color: "#f5efe4" }}>{data.total_covers}</b> covers</span>
            <span><b style={{ color: "#f5efe4" }}>{data.total_reservations}</b> bookings</span>
            <span>cap <b style={{ color: "#f5efe4" }}>{data.capacity}</b></span>
            <span style={{ color: data.is_full ? "#ef4444" : "#10b981" }}>
              {Math.round(data.pct_committed * 100)}% {data.is_full ? "· FULL" : ""}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {data.hours.map((h) => {
            const rows = rowsByHour[h.hour] || [];
            const open = activeHour === h.hour;
            return (
              <div key={h.hour} data-testid={`resv-hour-${h.hour.replace(":", "")}`}>
                <button
                  onClick={() => setActiveHour(open ? null : h.hour)}
                  style={{
                    width: "100%", padding: "10px 14px",
                    background: open ? "rgba(212,175,55,0.06)" : "transparent",
                    border: "none", borderLeft: `4px solid ${h.color}`,
                    borderBottom: "1px solid rgba(148,163,184,0.08)",
                    color: "#f5efe4", cursor: rows.length > 0 ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontFamily: "inherit",
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f5efe4" }}>{h.hour}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span data-testid={`resv-hour-covers-${h.hour.replace(":", "")}`}
                      style={{
                        background: h.color, color: "#0a0e1a",
                        borderRadius: 4, padding: "1px 8px",
                        fontSize: 11, fontWeight: 700, minWidth: 34, textAlign: "center",
                      }}>
                      {h.covers}
                    </span>
                    <span style={{ fontSize: 10, color: "#64748b" }}>
                      {h.reservations_count} {h.reservations_count === 1 ? "resv" : "resvs"}
                    </span>
                  </span>
                </button>
                {open && rows.length > 0 && (
                  <div style={{ padding: "2px 14px 8px 22px", background: "rgba(8,12,22,0.6)" }}>
                    {rows.map((r) => <ResvRow key={r.id} r={r} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function ResvRow({ r }: { r: Resv }) {
  const flags = r.flags || [];
  const isVip = flags.includes("vip");
  const isReturning = flags.includes("returning");
  const hadGlitch = flags.includes("had-glitch");
  const resortGuest = flags.includes("resort-guest");
  const celebrationFlag = flags.find((f) => f.startsWith("celebration:"));
  const celebration = celebrationFlag?.split(":")[1];

  return (
    <div data-testid={`resv-row-${r.id}`} style={{
      padding: "8px 10px", margin: "6px 0", borderRadius: 6,
      background: hadGlitch ? "rgba(239,68,68,0.06)"
                                : isVip ? "rgba(212,175,55,0.06)"
                                : "rgba(148,163,184,0.04)",
      border: `1px solid ${hadGlitch ? "rgba(239,68,68,0.25)"
                                            : isVip ? "rgba(212,175,55,0.25)"
                                            : "rgba(148,163,184,0.12)"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#f5efe4", fontWeight: 600 }}>
          {r.time?.slice(0, 5)} · {r.guest_name || "Walk-in"} · party {r.party_size}
          {r.room && <span style={{ color: "#94a3b8", fontWeight: 400 }}> · rm {r.room}</span>}
        </div>
      </div>
      {(isVip || isReturning || hadGlitch || resortGuest || celebration) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {isVip         && <Chip color="#d4af37" bg="rgba(212,175,55,0.15)" label="★ VIP" testid={`chip-vip-${r.id}`} />}
          {isReturning   && <Chip color="#60a5fa" bg="rgba(96,165,250,0.12)" label="↻ Returning" testid={`chip-returning-${r.id}`} />}
          {hadGlitch     && <Chip color="#ef4444" bg="rgba(239,68,68,0.12)" label="⚠ Prior glitch" testid={`chip-glitch-${r.id}`} />}
          {resortGuest   && <Chip color="#10b981" bg="rgba(16,185,129,0.12)" label="🏨 Resort guest" testid={`chip-resort-${r.id}`} />}
          {celebration   && <Chip color="#ec4899" bg="rgba(236,72,153,0.12)" label={`🎉 ${celebration}`} testid={`chip-celeb-${r.id}`} />}
        </div>
      )}
    </div>
  );
}


function Chip({ color, bg, label, testid }: {
  color: string; bg: string; label: string; testid: string;
}) {
  return (
    <span data-testid={testid} style={{
      fontSize: 9, letterSpacing: 0.5, padding: "2px 6px", borderRadius: 3,
      background: bg, color, border: `1px solid ${color}55`, fontWeight: 600,
    }}>{label}</span>
  );
}


/** Top-of-shell concierge alert strip — wires when outlet fully committed. */
export function ConciergeAlertStrip() {
  const [rows, setRows] = React.useState<any[]>([]);

  const load = React.useCallback(() => {
    fetch(`${API()}/api/ecw-ops/concierge/alerts?active_only=true`)
      .then((r) => r.json())
      .then((d) => setRows(d?.rows || []))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    load();
    const int = window.setInterval(() => { if (!document.hidden) load(); }, 25_000);
    return () => window.clearInterval(int);
  }, [load]);

  if (rows.length === 0) return null;
  const top = rows[0];

  function ack(id: string) {
    fetch(`${API()}/api/ecw-ops/concierge/alerts/${id}/ack`,
           { method: "POST", headers: { "X-User-Id": "chef-william" } })
      .then(() => load());
  }

  return (
    <div data-testid="concierge-alert-strip" style={{
      padding: "8px 12px",
      background: top.kind === "fully-committed"
        ? "linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.08) 100%)"
        : "linear-gradient(90deg, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0.06) 100%)",
      borderBottom: `1px solid ${top.kind === "fully-committed"
                                    ? "rgba(239,68,68,0.45)" : "rgba(236,72,153,0.35)"}`,
      color: "#fee2e2", display: "flex", alignItems: "center", gap: 8,
      fontSize: 12, fontWeight: 500,
    }}>
      <span style={{ fontSize: 15 }}>
        {top.kind === "fully-committed" ? "🚫" : "📣"}
      </span>
      <span data-testid="concierge-alert-headline" style={{ flex: 1, minWidth: 0 }}>
        <b style={{ color: "#fff" }}>{top.headline}</b>
        {top.detail && <span style={{ display: "block", fontSize: 10,
                                         color: "#fecaca", marginTop: 1,
                                         whiteSpace: "nowrap", overflow: "hidden",
                                         textOverflow: "ellipsis" }}>{top.detail}</span>}
      </span>
      {rows.length > 1 && (
        <span style={{
          fontSize: 9, background: "rgba(255,255,255,0.15)",
          padding: "2px 6px", borderRadius: 3, letterSpacing: 1,
        }}>+{rows.length - 1}</span>
      )}
      <button data-testid={`concierge-alert-ack-${top.id}`}
        onClick={() => ack(top.id)}
        style={{
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
          color: "#fff", borderRadius: 4, padding: "3px 8px",
          fontSize: 10, letterSpacing: 1, cursor: "pointer", fontWeight: 600,
        }}>ACK</button>
    </div>
  );
}
