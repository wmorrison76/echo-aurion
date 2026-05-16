/** iter239 · Daily Standup modal (first-load) + tab version.
 *
 * William's spec: enforce the daily standup on first load with a 4-second
 * dwell + scroll-to-bottom before dismiss. Admin can toggle it on/off.
 * Also appears as a quick-launch tile + its own bottom tab.
 *
 * Why 4s: <2s is bypassable; >6s feels punitive. 4s + scroll-gate lands
 * the message without frustrating staff on re-opens.
 */
import React from "react";
import { API } from "@/lib/api-url";
import { StandupAdminEditor } from "./StandupAdminEditor";

function useLiveReservations() {
  const [data, setData] = React.useState<any>(null);
  React.useEffect(() => {
    const outletId = localStorage.getItem("ecw_outlet_id") || "outlet-rooftop";
    const load = () => fetch(`${API()}/api/ecw-ops/reservations/live?outlet_id=${outletId}`)
      .then((r) => r.json()).then(setData).catch(() => undefined);
    void load();
    const int = window.setInterval(() => { if (!document.hidden) void load(); }, 20_000);
    return () => window.clearInterval(int);
  }, []);
  return data;
}

export function StandupModal({ onDismiss }: { onDismiss: () => void }) {
  const [standup, setStandup] = React.useState<any>(null);
  const [secondsLeft, setSecondsLeft] = React.useState(4);
  const [scrolledToBottom, setScrolledToBottom] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/standup/today`)
      .then((r) => r.json()).then(setStandup)
      .catch(() => setStandup({ date: new Date().toISOString().slice(0, 10),
                                  headline: "No standup posted", items: [] }));
  }, []);

  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setScrolledToBottom(true);
    }
  };

  const canDismiss = secondsLeft <= 0 && scrolledToBottom;
  const gateLabel = !scrolledToBottom
    ? "Scroll to bottom to continue"
    : secondsLeft > 0 ? `Reading… ${secondsLeft}s` : "Tap to dismiss";

  return (
    <div data-testid="standup-modal" style={{
      position: "fixed", inset: 0, zIndex: 99999990,
      background: "rgba(5,8,18,0.95)", backdropFilter: "blur(6px)",
      display: "flex", flexDirection: "column",
      padding: "env(safe-area-inset-top, 12px) 10px 10px",
    }}>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
        border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10,
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 16px 10px",
                        borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>
            📣 DAILY STANDUP
          </div>
          <h1 data-testid="standup-headline" style={{ fontSize: 22, fontWeight: 300,
                                                          color: "#f5efe4", margin: "6px 0 2px" }}>
            {standup?.headline || "Today's Brief"}
          </h1>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            {standup?.date || new Date().toLocaleDateString()}
            {standup?.author && ` · ${standup.author}`}
          </div>
        </div>

        <div ref={scrollRef} onScroll={onScroll}
          data-testid="standup-scroll"
          style={{ flex: 1, overflowY: "auto", padding: "14px 16px 20px" }}>
          <StandupBody standup={standup} />
          {/* Scroll-gate bottom anchor */}
          <div style={{ height: 20 }} />
          <div data-testid="standup-bottom-anchor" style={{
            textAlign: "center", color: "#64748b", fontSize: 10, letterSpacing: 2,
          }}>— END —</div>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid rgba(212,175,55,0.15)",
                        background: "rgba(10,14,26,0.95)" }}>
          <button data-testid="standup-dismiss-btn"
            disabled={!canDismiss}
            onClick={onDismiss}
            style={{
              width: "100%", padding: 14, borderRadius: 8,
              background: canDismiss ? "rgba(16,185,129,0.25)" : "rgba(148,163,184,0.1)",
              border: `1px solid ${canDismiss ? "rgba(16,185,129,0.55)" : "rgba(148,163,184,0.2)"}`,
              color: canDismiss ? "#34d399" : "#64748b",
              fontSize: 13, fontWeight: 700, letterSpacing: 1,
              cursor: canDismiss ? "pointer" : "not-allowed",
              transition: "all 200ms",
            }}>
            {canDismiss ? "✓ Got it — let's go" : gateLabel}
          </button>
          {secondsLeft > 0 && (
            <div data-testid="standup-countdown" style={{
              height: 3, marginTop: 8, borderRadius: 3,
              background: "rgba(212,175,55,0.15)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${((4 - secondsLeft) / 4) * 100}%`,
                background: "#d4af37", transition: "width 1000ms linear",
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Inline standup (for tab view — no gate, always dismissable). */
export function StandupTab({ inline }: { inline?: boolean }) {
  const [standup, setStandup] = React.useState<any>(null);
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/standup/today`)
      .then((r) => r.json()).then(setStandup).catch(() => undefined);
  }, [editing]);
  return (
    <div data-testid="standup-tab-root" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>
          📣 DAILY STANDUP
        </div>
        <button data-testid="standup-edit-btn" onClick={() => setEditing(true)}
          style={{
            background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)",
            color: "#d4af37", padding: "5px 10px", borderRadius: 5,
            fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: "inherit",
          }}>✏️ EDIT</button>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 300, color: "#f5efe4", margin: "4px 0 10px" }}>
        {standup?.headline || "Today's Brief"}
      </h1>
      <AIBriefingCard />
      <StandupBody standup={standup} />
      {editing && <StandupAdminEditor onClose={() => setEditing(false)} />}
    </div>
  );
}

function StandupBody({ standup }: { standup: any }) {
  const live = useLiveReservations();
  if (!standup) return <div style={{ color: "#64748b", padding: 16 }}>Loading…</div>;
  const sections = standup.sections || [];
  const items = standup.items || [];
  return (
    <div>
      {standup.summary && (
        <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5, marginTop: 0, marginBottom: 16 }}>
          {standup.summary}
        </p>
      )}

      {live && (
        <div data-testid="standup-live-reservations"
          style={{
            marginBottom: 18, padding: 12, borderRadius: 6,
            background: live.is_full ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.08)",
            border: `1px solid ${live.is_full ? "rgba(239,68,68,0.35)" : "rgba(59,130,246,0.25)"}`,
          }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: live.is_full ? "#ef4444" : "#60a5fa",
                          textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>
            📅 LIVE — {live.outlet_name || "Today"} {live.is_full && "· FULLY COMMITTED"}
          </div>
          <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 600 }}>
            {live.total_covers} covers · {live.total_reservations} bookings
            <span style={{ color: "#94a3b8", fontWeight: 400 }}>
              {" "}· {Math.round(live.pct_committed * 100)}% of {live.capacity}-seat capacity
            </span>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {live.hours.filter((h: any) => h.covers > 0).map((h: any) => (
              <span key={h.hour} style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 3,
                background: h.color, color: "#0a0e1a", fontWeight: 600,
              }}>
                {h.hour.slice(0, 5)} · {h.covers}
              </span>
            ))}
          </div>
        </div>
      )}

      {sections.map((s: any, i: number) => (
        <div key={i} data-testid={`standup-section-${i}`}
          style={{ marginBottom: 18, paddingBottom: 14,
                    borderBottom: i < sections.length - 1 ? "1px solid rgba(212,175,55,0.12)" : "none" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#d4af37",
                          textTransform: "uppercase", marginBottom: 6 }}>
            {s.title}
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {s.body}
          </div>
        </div>
      ))}

      {items.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#d4af37",
                          textTransform: "uppercase", marginBottom: 6 }}>
            Activities & changes
          </div>
          <ul style={{ paddingLeft: 20, marginTop: 4, color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>
            {items.map((it: any, i: number) => (
              <li key={i} data-testid={`standup-item-${i}`} style={{ marginBottom: 6 }}>
                {it.text || it}
                {it.owner && <span style={{ color: "#94a3b8", marginLeft: 6 }}>· {it.owner}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {standup.shoutouts?.length > 0 && (
        <div style={{ marginTop: 18, padding: 12, borderRadius: 6,
                        background: "rgba(212,175,55,0.08)",
                        border: "1px solid rgba(212,175,55,0.25)" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#d4af37",
                          textTransform: "uppercase", marginBottom: 4 }}>
            🙌 Shoutouts
          </div>
          <ul style={{ paddingLeft: 20, margin: 0, color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>
            {standup.shoutouts.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/** iter252 · Claude-generated AI Briefing card — sits at top of mobile standup,
 *  shows 3-bullet condensed feed; tap to expand full narrative. */
function AIBriefingCard() {
  const [data, setData] = React.useState<any>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    fetch(`${API()}/api/briefing/standup-feed`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return null;
  return (
    <div data-testid="standup-ai-briefing" style={{
      marginBottom: 18, padding: 14, borderRadius: 10,
      background: "linear-gradient(180deg, rgba(99,102,241,0.10), rgba(99,102,241,0.04))",
      border: "1px solid rgba(99,102,241,0.35)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#a5b4fc",
                        fontWeight: 700, textTransform: "uppercase" }}>
          ✨ AI BRIEFING · {data?.role ? data.role.replace(/-/g, " ").toUpperCase() : "TODAY"}
        </div>
        <button data-testid="standup-briefing-toggle"
          onClick={() => setExpanded((v) => !v)} style={{
            background: "rgba(99,102,241,0.18)", border: 0,
            color: "#a5b4fc", padding: "3px 8px", borderRadius: 4,
            fontSize: 9, fontWeight: 700, cursor: "pointer",
            letterSpacing: 1, fontFamily: "inherit",
          }}>{expanded ? "COLLAPSE" : "FULL"}</button>
      </div>
      {!data && <div style={{ fontSize: 12, color: "#94a3b8" }}>Generating…</div>}
      {data && !expanded && (
        <ul style={{ paddingLeft: 18, margin: 0, color: "#cbd5e1",
                       fontSize: 12, lineHeight: 1.6 }}>
          {(data.bullets || []).map((b: string, i: number) => (
            <li data-testid={`standup-briefing-bullet-${i}`} key={i}
              style={{ marginBottom: 4 }}>{b}</li>
          ))}
          {(!data.bullets || data.bullets.length === 0) && (
            <li style={{ color: "#94a3b8" }}>No flagged items today.</li>
          )}
        </ul>
      )}
      {data && expanded && (
        <div data-testid="standup-briefing-full" style={{
          fontSize: 12, color: "#cbd5e1", lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}>{data.narrative}</div>
      )}
    </div>
  );
}
