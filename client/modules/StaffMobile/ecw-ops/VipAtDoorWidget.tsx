/** iter243 · VIP at-the-door home widget.
 *
 * Floating cluster of in-house VIP avatars on the mobile shell. Glows
 * when a VIP just made a move. Tap → opens their chat directly.
 * Compact: 6 avatars max, 32px each, top of viewport.
 */
import React from "react";
import { API } from "@/lib/api-url";

type Vip = {
  id: string; display_name: string; photo_url?: string;
  tier?: string; chat_room_id?: string;
  last_activity?: { kind: string; detail: string; created_at: string } | null;
  activity_age_seconds?: number | null;
};

export function VipAtDoorWidget() {
  const [rows, setRows] = React.useState<Vip[]>([]);
  const [hover, setHover] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetch(`${API()}/api/vip-tracker/in-house-now`,
             { headers: { "X-User-Id": "chef-william" } })
      .then((r) => r.ok ? r.json() : { rows: [] })
      .then((d) => setRows(d?.rows || []))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    load();
    const i = window.setInterval(() => { if (!document.hidden) load(); }, 25_000);
    return () => clearInterval(i);
  }, [load]);

  if (rows.length === 0) return null;

  function tap(v: Vip) {
    if (v.chat_room_id) {
      window.dispatchEvent(new CustomEvent("echo:open-quick",
        { detail: { view: "group-chat", room_id: v.chat_room_id } }));
    } else {
      // Fallback: switch to VIP tab + scroll into view
      try { localStorage.setItem("ecw_last_tab", "vip"); } catch {}
      window.dispatchEvent(new CustomEvent("echo:switch-tab", { detail: { tab: "vip" } }));
    }
  }

  return (
    <div data-testid="vip-at-door-widget" style={{
      position: "fixed", top: 60, left: 12, zIndex: 99999979,
      display: "flex", alignItems: "center", gap: 4,
      padding: "5px 8px", borderRadius: 999,
      background: "rgba(10,14,26,0.85)",
      border: "1px solid rgba(212,175,55,0.35)",
      backdropFilter: "blur(8px)",
      boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
    }}>
      <span style={{ fontSize: 8, letterSpacing: 1.5, color: "#d4af37",
                       fontWeight: 700, marginRight: 2, padding: "0 4px" }}>
        ★ IN-HOUSE
      </span>
      {rows.slice(0, 6).map((v) => {
        const recent = (v.activity_age_seconds ?? 999_999) < 600;   // glow if < 10 min
        const tierColor = v.tier === "diamond" ? "#60a5fa"
                            : v.tier === "platinum" ? "#e2e8f0"
                            : v.tier === "ambassador" ? "#f59e0b" : "#d4af37";
        return (
          <button key={v.id} data-testid={`vip-door-${v.id}`}
            onClick={() => tap(v)}
            onMouseEnter={() => setHover(v.id)} onMouseLeave={() => setHover(null)}
            style={{
              position: "relative",
              width: 30, height: 30, borderRadius: 15,
              overflow: "hidden", padding: 0, cursor: "pointer",
              background: tierColor + "33",
              border: `2px solid ${recent ? tierColor : "rgba(148,163,184,0.3)"}`,
              boxShadow: recent ? `0 0 12px ${tierColor}, 0 0 4px ${tierColor}` : "none",
              animation: recent ? "vipPulse 2s ease-in-out infinite" : undefined,
              transition: "transform 200ms",
              transform: hover === v.id ? "scale(1.15)" : "scale(1)",
            }}>
            <style>{`
              @keyframes vipPulse {
                0%,100% { box-shadow: 0 0 12px ${tierColor}; }
                50%     { box-shadow: 0 0 20px ${tierColor}, 0 0 6px ${tierColor}; }
              }
            `}</style>
            {v.photo_url ? (
              <img src={v.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: tierColor, fontSize: 14, fontWeight: 700,
                                display: "block", lineHeight: "26px" }}>
                {v.display_name?.[0] || "?"}
              </span>
            )}
            {hover === v.id && v.last_activity && (
              <div style={{
                position: "absolute", top: 36, left: -10, whiteSpace: "nowrap",
                background: "#0a0e1a", border: `1px solid ${tierColor}55`,
                color: "#f5efe4", padding: "5px 8px", borderRadius: 5,
                fontSize: 9, fontWeight: 500, zIndex: 1,
              }}>
                {v.display_name} · {v.last_activity.kind}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
