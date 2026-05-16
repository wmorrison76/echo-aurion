/** iter253 · ApprovalBanner — top-of-page banner that surfaces pending purchase
 *  approval requests. Each row collapses by default; click "+" to slide the
 *  invoice drawer DOWN inline showing PDF + line items + Approve / Not Approved.
 */
import React from "react";
import { useAuth } from "@/lib/auth-context";

const API = (window as any).location.origin;

type PendingRow = {
  id: string;
  requested_by_name: string;
  requested_by_role_label: string;
  outlet: string;
  company?: string;
  vendor?: string;
  amount: number;
  item_description: string;
  link_to?: string;
  invoice_id?: string;
  category?: string;
  notes?: string;
  approval_chain?: any[];
  created_at: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
    maximumFractionDigits: 0 }).format(n);

export default function ApprovalBanner() {
  const { user } = useAuth();
  const [rows, setRows] = React.useState<PendingRow[]>([]);
  const [collapsed, setCollapsed] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    if (!user) return;
    fetch(`${API}/api/approvals/banner?for_user=${encodeURIComponent(user.id)}`,
      { credentials: "include" })
      .then(r => r.ok ? r.json() : { pending: [] })
      .then(d => setRows(d.pending || []))
      .catch(() => undefined);
  }, [user]);

  React.useEffect(() => {
    refresh();
    if (!user) return;
    const t = setInterval(refresh, 45_000);
    const onUpdate = () => refresh();
    window.addEventListener("approvals:refresh", onUpdate);
    return () => {
      clearInterval(t);
      window.removeEventListener("approvals:refresh", onUpdate);
    };
  }, [refresh, user]);

  if (!user || rows.length === 0) return null;

  return (
    <div data-testid="approval-banner" style={{
      position: "fixed", top: 92, left: "50%",
      transform: "translateX(-50%)", zIndex: 2147482000,
      maxWidth: "min(1100px, 96vw)", width: "min(1100px, 96vw)",
    }}>
      <div style={{
        background: "linear-gradient(180deg, rgba(20,18,10,0.96), rgba(8,12,20,0.94))",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(212,175,55,0.55)",
        borderRadius: 12, color: "#f5efe4",
        boxShadow: "0 12px 36px rgba(0,0,0,0.65)",
        overflow: "hidden",
      }}>
        {/* Header bar */}
        <button
          data-testid="approval-banner-toggle"
          onClick={() => setCollapsed(c => !c)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            background: "linear-gradient(180deg, rgba(212,175,55,0.32), rgba(212,175,55,0.16))",
            border: 0, cursor: "pointer", padding: "10px 16px", color: "#fff",
            fontSize: 11, letterSpacing: 2, fontWeight: 800,
            fontFamily: "inherit",
          }}>
          <span style={{ fontSize: 14, color: "#d4af37" }}>✦</span>
          <span style={{ color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
            {rows.length} APPROVAL{rows.length === 1 ? "" : "S"} NEEDED
          </span>
          <span style={{ marginLeft: "auto", color: "#d4af37" }}>{collapsed ? "▾ EXPAND" : "▴ COLLAPSE"}</span>
        </button>

        {!collapsed && (
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {rows.map((r) => (
              <ApprovalRow key={r.id} r={r} expanded={openId === r.id}
                onToggle={() => setOpenId(o => o === r.id ? null : r.id)}
                onActed={refresh} userId={user.id} userName={user.name} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Single row + drawer ─────────── */
function ApprovalRow({ r, expanded, onToggle, onActed, userId, userName }: {
  r: PendingRow; expanded: boolean; onToggle: () => void; onActed: () => void;
  userId: string; userName: string;
}) {
  const [invoice, setInvoice] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!expanded || !r.invoice_id || invoice) return;
    fetch(`${API}/api/invoices/${r.invoice_id}`, { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(setInvoice).catch(() => undefined);
  }, [expanded, r.invoice_id, invoice]);

  async function act(action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") {
      reason = prompt("Reason for not approving?") || "";
      if (!reason) return;
    }
    setBusy(true);
    await fetch(`${API}/api/approvals/requests/${r.id}/${action}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approver_id: userId, approver_name: userName,
        ...(action === "reject" ? { reason } : { note: "" }),
      }),
    });
    // Fan out to requester (decision notification)
    fetch(`${API}/api/notif-prefs/fire`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_key: "approval_decision",
        target_role: r.requested_by_role_label?.toLowerCase().replace(/\s.*/, "") || "staff",
        payload: { request_id: r.id, action, by: userName,
                   amount: r.amount, vendor: r.vendor },
      }),
    }).catch(() => undefined);
    setBusy(false);
    onActed();
    window.dispatchEvent(new CustomEvent("approvals:refresh"));
  }

  return (
    <div data-testid={`approval-banner-row-${r.id}`}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div
        onClick={onToggle}
        title="Click to view invoice & approval detail"
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1.5fr 1.4fr 1fr 0.8fr auto",
          gap: 12, alignItems: "center", padding: "12px 16px",
          fontSize: 12, cursor: "pointer",
          background: expanded ? "rgba(212,175,55,0.06)" : "transparent",
        }}>
        {/* Expand "+" */}
        <button data-testid={`approval-row-expand-${r.id}`} onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: expanded ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.06)",
            color: "#d4af37", border: "1px solid rgba(212,175,55,0.4)",
            cursor: "pointer", fontSize: 18, lineHeight: 1, fontWeight: 700,
            fontFamily: "inherit",
          }}>{expanded ? "−" : "+"}</button>
        <div>
          <div style={{ fontWeight: 700, color: "#f5efe4", fontSize: 13 }}>
            {r.requested_by_name}
          </div>
          <div style={{ fontSize: 10, color: "#d4af37", letterSpacing: 0.8 }}>
            {r.requested_by_role_label}
          </div>
        </div>
        <div style={{ color: "#cbd5e1", lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600 }}>{r.item_description}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>
            {r.vendor && <>Vendor · {r.vendor} · </>}
            {r.company || "—"}
          </div>
        </div>
        <div style={{ color: "#cbd5e1", fontSize: 11 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5,
                          color: "#94a3b8", textTransform: "uppercase",
                          fontWeight: 700 }}>Outlet</div>
          <div>{r.outlet}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 16, fontWeight: 800,
                        color: "#d4af37", fontVariantNumeric: "tabular-nums" }}>
          {fmt(r.amount)}
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button data-testid={`approval-banner-reject-${r.id}`}
            disabled={busy} onClick={(e) => { e.stopPropagation(); act("reject"); }}
            style={btnReject} title="Not Approved (requires reason)">NOT APPROVED</button>
          <button data-testid={`approval-banner-approve-${r.id}`}
            disabled={busy} onClick={(e) => { e.stopPropagation(); act("approve"); }}
            style={btnApprove}>APPROVE</button>
        </div>
      </div>

      {/* Drawer (slides down) */}
      {expanded && (
        <div data-testid={`approval-row-drawer-${r.id}`} style={{
          padding: "16px 20px 18px",
          background: "rgba(0,0,0,0.35)",
          borderTop: "1px solid rgba(212,175,55,0.18)",
          display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 18,
        }}>
          {/* Left: Invoice metadata + lines */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#d4af37",
                            fontWeight: 700, marginBottom: 8 }}>
              INVOICE DETAIL
            </div>
            {!invoice && r.invoice_id && (
              <div style={{ color: "#94a3b8", fontSize: 11, padding: 10 }}>Loading invoice…</div>
            )}
            {!r.invoice_id && (
              <div style={{ color: "#94a3b8", fontSize: 11, padding: 10,
                              borderRadius: 6, background: "rgba(255,255,255,0.03)" }}>
                {r.notes || "No invoice attached."}
                {r.approval_chain && r.approval_chain.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 10, color: "#5a554d" }}>
                    Chain: {r.approval_chain.map((c: any) =>
                      `${c.action} by ${c.actor_name || c.role}`).join(" → ")}
                  </div>
                )}
              </div>
            )}
            {invoice && (
              <>
                <div style={{ display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                gap: "4px 14px", fontSize: 11, color: "#cbd5e1",
                                marginBottom: 12 }}>
                  <span style={{ color: "#94a3b8" }}>Vendor</span>
                  <span style={{ fontWeight: 600 }}>{invoice.vendor_name}</span>
                  <span style={{ color: "#94a3b8" }}>Invoice #</span>
                  <span style={{ fontFamily: "monospace" }}>{invoice.invoice_number}</span>
                  <span style={{ color: "#94a3b8" }}>Date</span>
                  <span>{invoice.invoice_date}</span>
                  <span style={{ color: "#94a3b8" }}>Subtotal</span>
                  <span>{fmt(invoice.subtotal || invoice.total_amount)}</span>
                  <span style={{ color: "#94a3b8" }}>Total</span>
                  <span style={{ fontWeight: 700, color: "#d4af37" }}>
                    {fmt(invoice.total_amount)}
                  </span>
                </div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#94a3b8",
                                fontWeight: 700, marginBottom: 4 }}>
                  LINE ITEMS · {(invoice.lines || []).length}
                </div>
                <div style={{ maxHeight: 240, overflowY: "auto",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: 6 }}>
                  <table style={{ width: "100%", fontSize: 10,
                                    borderCollapse: "collapse" }}>
                    <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                      <tr style={{ color: "#94a3b8" }}>
                        <th style={lineTh}>Item</th>
                        <th style={{ ...lineTh, textAlign: "right" }}>Qty</th>
                        <th style={{ ...lineTh, textAlign: "right" }}>UP</th>
                        <th style={{ ...lineTh, textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice.lines || []).map((ln: any, i: number) => (
                        <tr key={i} data-testid={`invoice-line-${i}`}
                          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={lineTd}>
                            <div style={{ fontSize: 10, color: "#cbd5e1" }}>{ln.description}</div>
                            {ln.item_code && <div style={{ fontSize: 9, color: "#5a554d",
                              fontFamily: "monospace" }}>{ln.item_code}</div>}
                          </td>
                          <td style={{ ...lineTd, textAlign: "right" }}>
                            {ln.quantity} {ln.unit_of_measure || ""}
                          </td>
                          <td style={{ ...lineTd, textAlign: "right",
                                         fontVariantNumeric: "tabular-nums" }}>
                            ${(ln.unit_price || 0).toFixed(2)}
                          </td>
                          <td style={{ ...lineTd, textAlign: "right",
                                         fontVariantNumeric: "tabular-nums",
                                         fontWeight: 600, color: "#d4af37" }}>
                            ${(ln.extended_price || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Right: PDF preview */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#d4af37",
                            fontWeight: 700, marginBottom: 8 }}>
              INVOICE DOCUMENT
            </div>
            {invoice?.pdf_filename ? (
              <iframe data-testid={`invoice-pdf-${r.id}`}
                src={`${API}/api/invoices/file/${invoice.pdf_filename}#toolbar=0`}
                title="Invoice PDF"
                style={{
                  width: "100%", height: 360, border: 0, borderRadius: 8,
                  background: "#fff",
                }} />
            ) : (
              <div style={{ padding: 20, color: "#5a554d", fontSize: 11,
                              borderRadius: 8, border: "1px dashed rgba(255,255,255,0.15)",
                              textAlign: "center" }}>
                No PDF attached to this request.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const lineTh: React.CSSProperties = {
  padding: "6px 10px", textAlign: "left", fontSize: 9, letterSpacing: 1,
  fontWeight: 700, textTransform: "uppercase",
};
const lineTd: React.CSSProperties = {
  padding: "6px 10px", verticalAlign: "top",
};
const btnApprove: React.CSSProperties = {
  padding: "6px 12px", fontSize: 9, letterSpacing: 1.5,
  fontWeight: 800, borderRadius: 6,
  background: "rgba(34,197,94,0.18)", color: "#86efac",
  border: "1px solid rgba(34,197,94,0.5)",
  cursor: "pointer", fontFamily: "inherit",
};
const btnReject: React.CSSProperties = {
  padding: "6px 12px", fontSize: 9, letterSpacing: 1.5,
  fontWeight: 800, borderRadius: 6,
  background: "rgba(239,68,68,0.12)", color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.45)",
  cursor: "pointer", fontFamily: "inherit",
};
