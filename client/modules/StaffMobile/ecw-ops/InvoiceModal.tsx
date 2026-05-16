/** iter228 · Mobile invoice drill-down + flag-to-accounting modal.
 *
 * Opened via `window.dispatchEvent("echo:open-invoices")` from the P&L rail.
 * Shows list → drill to invoice → line items → 🚩 flag button (top-right).
 */
import React from "react";
import { API } from "@/lib/api-url";

export function InvoiceModal({ outletId, filter, onClose }: {
  outletId: string;
  filter?: { gl_code?: string; label?: string } | null;
  onClose: () => void;
}) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState<any>(null);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/invoices?outlet_id=${outletId}`)
      .then((r) => r.json()).then((d) => {
        let result = d?.rows || [];
        // iter236 · Filter by GL code when opened from a P&L line-item click.
        if (filter?.gl_code) {
          result = result.filter((inv: any) => {
            const lines = inv.line_items || inv.items || [];
            return lines.some((ln: any) =>
              String(ln.gl_code || "") === String(filter.gl_code));
          });
        }
        setRows(result);
      });
  }, [outletId, filter?.gl_code]);

  return (
    <div data-testid="invoice-modal-scrim" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
                zIndex: 9999997 }}>
      <div onClick={(e) => e.stopPropagation()} data-testid="invoice-modal"
        style={{
          position: "absolute", inset: 20,
          background: "#0a0e1a",
          border: "1px solid rgba(200,169,126,0.3)", borderRadius: 10,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
        <header style={{
          padding: "14px 16px", borderBottom: "1px solid rgba(200,169,126,0.15)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 14, color: "#f5efe4", fontWeight: 500 }}>
            {open ? open.vendor_name : (filter?.label ? `Invoices · ${filter.label}` : "Invoices")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {open && (
              <button data-testid="invoice-flag-btn"
                onClick={() => setOpen({ ...open, __flagging: true })}
                style={{
                  background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.5)",
                  color: "#fca5a5", padding: "6px 10px", borderRadius: 6,
                  fontSize: 12, cursor: "pointer",
                }}>
                🚩 Flag
              </button>
            )}
            <button data-testid="invoice-modal-close" onClick={() => open ? setOpen(null) : onClose()}
              style={{ background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
                        color: "#94a3b8", padding: "6px 10px", borderRadius: 6,
                        fontSize: 12, cursor: "pointer" }}>
              {open ? "← Back" : "✕"}
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {!open && <InvoiceList rows={rows} onOpen={setOpen} />}
          {open && !open.__flagging && <InvoiceDetail invoice={open} />}
          {open?.__flagging && (
            <FlagForm invoice={open} onCancel={() => setOpen({ ...open, __flagging: false })}
              onFlagged={() => {
                alert("✓ Accounting + outlet managers notified");
                setOpen(null);
              }} />
          )}
        </div>
      </div>
    </div>
  );
}


function InvoiceList({ rows, onOpen }: { rows: any[]; onOpen: (r: any) => void }) {
  const [scanning, setScanning] = React.useState(false);
  const [scanMsg, setScanMsg] = React.useState<string | null>(null);

  async function scanAll() {
    setScanning(true);
    try {
      const r = await fetch(`${API()}/api/ecw-ops/invoices/scan-all?outlet_id=outlet-main&limit=20`, {
        method: "POST",
      }).then((r) => r.json());
      const flagged = (r?.results || []).filter((x: any) => x.suspicion).length;
      setScanMsg(flagged > 0
        ? `🤖🚩 AI flagged ${flagged} invoice${flagged === 1 ? "" : "s"} — refresh to see`
        : "✓ All invoices look correctly coded");
    } catch {
      setScanMsg("✗ Scan failed");
    } finally {
      setScanning(false);
      setTimeout(() => setScanMsg(null), 6000);
    }
  }

  if (rows.length === 0) {
    return <div style={{ color: "#64748b", fontSize: 12, textAlign: "center", padding: 24 }}>
      No invoices yet.
    </div>;
  }
  return (
    <>
      <button data-testid="invoice-scan-all" onClick={() => void scanAll()} disabled={scanning}
        style={{
          width: "100%", marginBottom: 10, padding: 10,
          background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 6, color: "#c4b5fd", fontSize: 12, fontWeight: 600,
          cursor: "pointer", opacity: scanning ? 0.5 : 1,
        }}>
        {scanning ? "🤖 Claude scanning…" : "🤖 Scan all for mis-coding"}
      </button>
      {scanMsg && (
        <div data-testid="invoice-scan-msg" style={{ padding: 8, marginBottom: 10,
          background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 4, fontSize: 11, color: "#c4b5fd" }}>{scanMsg}</div>
      )}

      <div data-testid="invoice-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => {
          const aiFlag = r.ai_flagged;
          return (
            <button key={r.id} data-testid={`invoice-row-${r.id}`} onClick={() => onOpen(r)}
              style={{
                padding: 12, textAlign: "left",
                background: r.has_flag ? "rgba(244,63,94,0.08)" : "rgba(200,169,126,0.04)",
                border: `1px solid ${r.has_flag ? "rgba(244,63,94,0.3)" : "rgba(200,169,126,0.15)"}`,
                borderRadius: 6, color: "#f5efe4", cursor: "pointer",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14 }}>
                  {r.vendor_name}{aiFlag ? " 🤖🚩" : r.has_flag ? " 🚩" : ""}
                </span>
                <span style={{ fontSize: 14, fontFamily: "monospace", color: "#c8a97e" }}>
                  ${r.amount?.toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                {r.date} · {r.category} · {r.gl_code || "no GL"}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}


function InvoiceDetail({ invoice }: { invoice: any }) {
  const [full, setFull] = React.useState<any>(invoice);
  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/invoices/${invoice.id}`)
      .then((r) => r.json()).then((d) => d?.invoice && setFull(d.invoice));
  }, [invoice.id]);

  return (
    <div data-testid="invoice-detail">
      <div style={{ fontSize: 22, color: "#c8a97e", fontFamily: "monospace", marginBottom: 4 }}>
        ${full.amount?.toLocaleString()}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>
        {full.date} · {full.category} · GL {full.gl_code || "?"}
      </div>

      <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", marginBottom: 8 }}>LINE ITEMS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {(full.line_items || []).map((li: any, i: number) => (
          <div key={i} style={{
            padding: "8px 10px", background: "rgba(200,169,126,0.03)",
            border: "1px solid rgba(200,169,126,0.1)", borderRadius: 4,
            display: "flex", justifyContent: "space-between",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#f5efe4" }}>{li.name}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                {li.sku} · qty {li.qty}
                {li.gl_code && (
                  <span data-testid={`line-gl-${i}`} style={{
                    marginLeft: 6, padding: "1px 6px", borderRadius: 3,
                    background: li.gl_code.startsWith("82") ? "rgba(168,85,247,0.15)" : "rgba(200,169,126,0.15)",
                    color: li.gl_code.startsWith("82") ? "#c4b5fd" : "#c8a97e",
                    fontFamily: "monospace", fontSize: 9,
                  }}>GL {li.gl_code}</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#c8a97e", fontFamily: "monospace" }}>
              ${li.price?.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {(full.flags || []).length > 0 && (
        <>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#fca5a5", marginTop: 14, marginBottom: 8 }}>
            🚩 FLAGS
          </div>
          {full.flags.map((f: any) => (
            <div key={f.id} style={{ padding: 8, background: "rgba(244,63,94,0.08)",
                                        border: "1px solid rgba(244,63,94,0.2)", borderRadius: 4,
                                        marginBottom: 4, fontSize: 11, color: "#fca5a5" }}>
              {f.comment} <span style={{ opacity: 0.6 }}>— {f.flagged_by}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}


function FlagForm({ invoice, onCancel, onFlagged }: {
  invoice: any; onCancel: () => void; onFlagged: () => void;
}) {
  const [reason, setReason] = React.useState("coding_error");
  const [comment, setComment] = React.useState("Not coded correctly");
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API()}/api/ecw-ops/invoices/${invoice.id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({
          reason, comment,
          notify_accounting: true, notify_outlet_managers: true,
        }),
      });
      onFlagged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div data-testid="flag-form">
      <div style={{ fontSize: 14, color: "#f5efe4", marginBottom: 4 }}>
        Flag {invoice.vendor_name} · ${invoice.amount?.toLocaleString()}
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 14 }}>
        Accounting + other outlet managers will be notified.
      </div>

      <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", marginBottom: 6 }}>REASON</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
        {[
          { v: "coding_error", l: "GL mis-coded" },
          { v: "price", l: "Price wrong" },
          { v: "quantity", l: "Qty mismatch" },
          { v: "other", l: "Other" },
        ].map((r) => (
          <button key={r.v} data-testid={`flag-reason-${r.v}`}
            onClick={() => setReason(r.v)}
            style={{
              padding: "8px 10px", fontSize: 11, cursor: "pointer",
              background: reason === r.v ? "rgba(244,63,94,0.12)" : "rgba(200,169,126,0.04)",
              border: `1px solid ${reason === r.v ? "rgba(244,63,94,0.5)" : "rgba(200,169,126,0.15)"}`,
              borderRadius: 5, color: reason === r.v ? "#fca5a5" : "#f5efe4",
            }}>
            {r.l}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", marginBottom: 6 }}>COMMENT</div>
      <textarea data-testid="flag-comment" value={comment}
        onChange={(e) => setComment(e.target.value)} rows={3}
        placeholder="e.g. GL should be 5002-F not 5001-F for this SKU"
        style={{
          width: "100%", padding: 10, background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(148,163,184,0.2)", borderRadius: 5,
          color: "#f5efe4", fontSize: 12, fontFamily: "inherit", resize: "vertical",
        }} />

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button data-testid="flag-submit" onClick={submit} disabled={submitting || !comment.trim()}
          style={{
            flex: 1, padding: 10,
            background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.5)",
            color: "#fca5a5", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
            opacity: submitting ? 0.5 : 1,
          }}>
          {submitting ? "Flagging…" : "🚩 Send flag"}
        </button>
        <button onClick={onCancel}
          style={{ padding: "10px 14px", background: "transparent",
                    border: "1px solid rgba(148,163,184,0.2)", color: "#94a3b8",
                    borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
