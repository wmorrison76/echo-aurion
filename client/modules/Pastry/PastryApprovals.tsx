/**
 * PastryApprovals — inbox of client approvals/change-requests for the bakery.
 * Mounted inside PastryAdmin below the referrals leaderboard.
 */
import React, { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-auth";

const API = "";

interface Approval {
  id: string;
  share_token: string;
  render_id: string;
  public_title?: string;
  client_name?: string;
  image_url?: string;
  decision: "approved" | "changes_requested";
  note?: string;
  seen_by_bakery?: boolean;
  created_at: string;
}

export function PastryApprovals() {
  const [items, setItems] = useState<Approval[]>([]);
  const [unseenOnly, setUnseenOnly] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (unseenOnly) qs.set("unseen_only", "true");
    qs.set("limit", "50");
    adminFetch(`${API}/api/pastry/approvals?${qs}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, [unseenOnly, refresh]);

  const markSeen = async (id: string) => {
    await adminFetch(`${API}/api/pastry/approvals/${id}/seen`, { method: "POST" });
    setRefresh((x) => x + 1);
  };

  const unseenCount = items.filter((i) => !i.seen_by_bakery).length;

  return (
    <div style={{ marginTop: 30, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="pastry-approvals-panel">
      <div style={{ padding: "14px 18px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: 18, margin: 0, color: "#f8fafc", fontFamily: "'Instrument Serif', Georgia, serif" }}>
            Client approvals
            {unseenCount > 0 && (
              <span style={{ marginLeft: 10, padding: "2px 8px", borderRadius: 999, background: "#c8a97e", color: "#0b1020", fontSize: 12, fontFamily: "system-ui", fontWeight: 700 }}>
                {unseenCount} new
              </span>
            )}
          </h3>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Approvals and change requests from clients who viewed your shared cake looks.</div>
        </div>
        <button onClick={() => setUnseenOnly((v) => !v)} style={pillBtn} data-testid="pastry-approvals-unseen-toggle">
          {unseenOnly ? "Unseen only ✓" : "All"}
        </button>
      </div>

      {items.length === 0 && <div style={{ padding: 20, color: "#64748b", fontSize: 14 }} data-testid="pastry-approvals-empty">No client responses yet.</div>}

      <div style={{ display: "grid", gap: 10, padding: 12 }}>
        {items.map((a) => (
          <div key={a.id} style={{
            padding: 14, borderRadius: 10, background: a.seen_by_bakery ? "rgba(255,255,255,0.02)" : "rgba(200,169,126,0.08)",
            border: `1px solid ${a.decision === "approved" ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
            display: "flex", gap: 12, alignItems: "center",
          }} data-testid={`pastry-approval-${a.id}`}>
            {a.image_url && <img src={a.image_url} alt="" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover" }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: a.decision === "approved" ? "rgba(34,197,94,0.18)" : "rgba(245,158,11,0.18)",
                  color: a.decision === "approved" ? "#86efac" : "#fbbf24",
                }}>
                  {a.decision === "approved" ? "✓ APPROVED" : "↻ CHANGES REQUESTED"}
                </span>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{a.client_name || "Client"}</span>
                <span style={{ color: "#64748b", fontSize: 11, marginLeft: "auto" }}>{fmtDate(a.created_at)}</span>
              </div>
              <div style={{ fontSize: 14, color: "#f8fafc", marginTop: 4, fontWeight: 600 }}>{a.public_title || "Cake preview"}</div>
              {a.note && <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4, fontStyle: "italic" }}>"{a.note}"</div>}
            </div>
            {!a.seen_by_bakery && (
              <button onClick={() => markSeen(a.id)} style={miniBtn} data-testid={`pastry-approval-seen-${a.id}`}>Mark seen</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

const pillBtn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 99, background: "rgba(255,255,255,0.06)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
  fontWeight: 600, fontSize: 12,
};
const miniBtn: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 12, fontWeight: 600,
};
