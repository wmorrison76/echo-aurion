/**
 * PastryReferrals — referrals leaderboard + unique link for each subscriber.
 */
import React, { useEffect, useState } from "react";

const API = "";

interface Row {
  bakery_name?: string;
  email?: string;
  referral_code?: string;
  referral_count?: number;
  referral_free_months?: number;
}

export function PastryReferrals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/pastry/referrals/leaderboard`)
      .then((r) => r.json())
      .then((d) => setRows(d.leaderboard || []))
      .catch(() => setErr("Unable to load referrals"));
  }, []);

  const copy = (code: string) => {
    const url = `${window.location.origin}/pastry?ref=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div style={{ marginTop: 30, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="pastry-referrals-panel">
      <div style={{ padding: "14px 18px 8px" }}>
        <h3 style={{ fontSize: 18, margin: 0, color: "#f8fafc", fontFamily: "'Instrument Serif', Georgia, serif" }}>
          Referral leaderboard
        </h3>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Every paid referral earns the referring bakery a free month.</div>
      </div>
      {err && <div style={{ padding: 16, color: "#f87171" }}>{err}</div>}
      {!err && rows.length === 0 && (
        <div style={{ padding: 20, color: "#64748b", fontSize: 14 }} data-testid="pastry-referrals-empty">
          No referrals recorded yet. Share your link to earn free months.
        </div>
      )}
      {rows.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }} data-testid="pastry-referrals-table">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              <th style={thStyle}>Bakery</th>
              <th style={thStyle}>Referral code</th>
              <th style={thStyle}>Referrals</th>
              <th style={thStyle}>Free months</th>
              <th style={thStyle}>Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.referral_code} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={tdStyle}><b>{r.bakery_name || "—"}</b><div style={{ color: "#94a3b8", fontSize: 11 }}>{r.email}</div></td>
                <td style={{ ...tdStyle, fontFamily: "monospace", color: "#c8a97e" }}>{r.referral_code}</td>
                <td style={tdStyle}>{r.referral_count}</td>
                <td style={tdStyle}>{r.referral_free_months || 0}</td>
                <td style={tdStyle}>
                  <button onClick={() => copy(r.referral_code || "")} style={copyBtnStyle} data-testid={`pastry-referrals-copy-${r.referral_code}`}>
                    {copied === r.referral_code ? "✓ Copied" : "Copy link"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 14px", color: "#94a3b8",
  fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 1,
};
const tdStyle: React.CSSProperties = { padding: "14px 14px", color: "#f8fafc" };
const copyBtnStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)", color: "#c8a97e", cursor: "pointer", fontSize: 12, fontWeight: 600,
};
