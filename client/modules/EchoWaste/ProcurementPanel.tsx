/** iter224·phase2 · ECW Procurement Hub — desktop requisition inbox.
 *
 * Purchasing manager workflow:
 *   1. See pending requisitions from mobile chefs (with priority flag)
 *   2. Review items + estimated totals
 *   3. Approve/Reject → flips status
 *   4. Cut PO: pick vendor, set unit prices + ETA → creates procurement_orders
 *   5. Track ordered POs → incoming receipts → variance audit
 */
import React from "react";
import { API } from "@/lib/api-url";

type Req = {
  id: string; outlet_id: string; chef_id: string; status: string;
  priority: string; items: any[]; item_count: number;
  estimated_total: number; note?: string;
  created_at: string; approved_at?: string; po_id?: string;
};
type PO = {
  id: string; requisition_id: string; vendor_name: string;
  items: any[]; item_count: number; total: number; status: string;
  expected_delivery_date?: string; created_at: string; variance?: boolean;
};

export default function ProcurementPanel() {
  const [outletId, setOutletId] = React.useState("outlet-main");
  const [outlets, setOutlets] = React.useState<any[]>([]);
  const [tab, setTab] = React.useState<"pending" | "orders" | "history">("pending");
  const [reqs, setReqs] = React.useState<Req[]>([]);
  const [pos, setPos] = React.useState<PO[]>([]);
  const [approving, setApproving] = React.useState<Req | null>(null);
  const [poModal, setPoModal] = React.useState<Req | null>(null);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/outlets/mine`, { headers: { "X-User-Id": "purchasing-manager" } })
      .then((r) => r.json()).then((d) => setOutlets(d?.outlets || []));
  }, []);

  const load = React.useCallback(async () => {
    const [r, p] = await Promise.all([
      fetch(`${API()}/api/ecw-ops/inventory/order-requests?outlet_id=${outletId}&limit=50`).then((r) => r.json()),
      fetch(`${API()}/api/ecw-ops/inventory/purchase-orders?outlet_id=${outletId}&limit=50`).then((r) => r.json()),
    ]);
    setReqs(r?.rows || []); setPos(p?.rows || []);
  }, [outletId]);

  React.useEffect(() => { void load(); }, [load]);

  async function reject(req: Req) {
    const reason = prompt(`Reject reason (shown back to ${req.chef_id})?`);
    if (!reason) return;
    const r = await fetch(`${API()}/api/ecw-ops/inventory/requisitions/${req.id}/reject`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).then((r) => r.json());
    if (r.ok) await load();
  }

  const pending = reqs.filter((r) => r.status === "pending_approval");
  const approved = reqs.filter((r) => r.status === "approved");
  const active = pos.filter((p) => p.status === "ordered" || p.status === "received_with_variance");
  const received = pos.filter((p) => p.status === "received" || p.status === "received_with_variance");

  return (
    <div data-testid="procurement-root" className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">ECW · Procurement Hub</div>
          <div className="text-sm text-foreground/60">Mobile requisitions → PO → receive → audit</div>
        </div>
        <div className="flex gap-2">
          {outlets.length > 1 && (
            <select data-testid="proc-outlet-picker" value={outletId} onChange={(e) => setOutletId(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-border/50 bg-background">
              {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <button data-testid="proc-refresh" onClick={() => void load()}
            className="text-xs px-3 py-1 rounded border border-border/50 hover:bg-muted/50">↻ Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Kpi testId="proc-kpi-pending" label="Pending approval" value={pending.length} tone={pending.length > 0 ? "amber" : "slate"} />
        <Kpi testId="proc-kpi-approved" label="Awaiting PO" value={approved.length} tone={approved.length > 0 ? "sky" : "slate"} />
        <Kpi testId="proc-kpi-active" label="Active orders" value={active.length} tone="emerald" />
        <Kpi testId="proc-kpi-received" label="Received" value={received.length} tone="slate" />
      </div>

      <div className="flex gap-2">
        {[["pending", `Pending (${pending.length})`],
          ["orders", `Active POs (${active.length})`],
          ["history", "History"]].map(([k, lbl]) => (
          <button key={k} data-testid={`proc-tab-${k}`} onClick={() => setTab(k as any)}
            className={`text-xs px-3 py-1.5 rounded border ${tab === k
              ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
              : "border-border/50 text-foreground/60 hover:bg-muted/30"}`}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <div className="space-y-3" data-testid="proc-pending-list">
          {[...pending, ...approved].length === 0 && (
            <div className="text-xs text-foreground/50 text-center py-6">No requisitions awaiting action.</div>
          )}
          {pending.map((req) => (
            <RequisitionCard key={req.id} req={req}
              onApprove={() => setApproving(req)}
              onReject={() => void reject(req)} />
          ))}
          {approved.map((req) => (
            <RequisitionCard key={req.id} req={req}
              onCutPO={() => setPoModal(req)} />
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-3" data-testid="proc-orders-list">
          {active.length === 0 && (
            <div className="text-xs text-foreground/50 text-center py-6">No active POs.</div>
          )}
          {active.map((po) => <POCard key={po.id} po={po} />)}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3" data-testid="proc-history-list">
          {received.length === 0 && (
            <div className="text-xs text-foreground/50 text-center py-6">No receipts yet.</div>
          )}
          {received.map((po) => <POCard key={po.id} po={po} history />)}
        </div>
      )}

      {approving && <ApproveModal req={approving} onClose={() => setApproving(null)}
        onDone={async () => { setApproving(null); await load(); }} />}
      {poModal && <CreatePOModal req={poModal} onClose={() => setPoModal(null)}
        onDone={async () => { setPoModal(null); await load(); }} />}
    </div>
  );
}

function Kpi({ label, value, testId, tone }: { label: string; value: any; testId: string; tone: "emerald" | "amber" | "sky" | "slate" }) {
  const t = { emerald: "border-emerald-500/30 text-emerald-400",
              amber: "border-amber-500/30 text-amber-400",
              sky: "border-sky-500/30 text-sky-400",
              slate: "border-border/50 text-foreground/80" }[tone];
  return (
    <div data-testid={testId} className={`rounded-md border ${t} px-3 py-2 bg-muted/10`}>
      <div className="text-[10px] uppercase tracking-widest text-foreground/50">{label}</div>
      <div className="text-xl font-bold font-mono">{value}</div>
    </div>
  );
}

function RequisitionCard({ req, onApprove, onReject, onCutPO }: {
  req: Req; onApprove?: () => void; onReject?: () => void; onCutPO?: () => void;
}) {
  const isPending = req.status === "pending_approval";
  const isApproved = req.status === "approved";
  return (
    <div data-testid={`proc-req-${req.id}`} className={`border rounded-md p-4 ${
      req.priority === "urgent" ? "border-rose-500/40 bg-rose-500/5" : "border-border/40 bg-muted/10"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-foreground/60">{req.id}</span>
            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-muted/30 text-foreground/70">{req.outlet_id}</span>
            {req.priority === "urgent" && <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">🔥 Urgent</span>}
            {isApproved && <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">Approved · cut PO</span>}
          </div>
          <div className="text-sm">
            {req.item_count} items · ${req.estimated_total.toFixed(2)} est · by <span className="font-mono">{req.chef_id}</span>
          </div>
          <div className="text-[11px] text-foreground/60 mt-1">
            {req.items.slice(0, 5).map((it: any) => `${it.qty} ${it.unit} ${it.name}`).join(" · ")}
            {req.items.length > 5 && ` +${req.items.length - 5} more`}
          </div>
          {req.note && <div className="text-[10px] text-foreground/50 italic mt-1">"{req.note}"</div>}
        </div>
        <div className="flex gap-2">
          {isPending && (
            <>
              <button data-testid={`proc-approve-${req.id}`} onClick={onApprove}
                className="text-xs px-3 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                ✓ Approve
              </button>
              <button data-testid={`proc-reject-${req.id}`} onClick={onReject}
                className="text-xs px-3 py-1 rounded border border-rose-500/40 text-rose-400">
                ✕ Reject
              </button>
            </>
          )}
          {isApproved && (
            <button data-testid={`proc-cutpo-${req.id}`} onClick={onCutPO}
              className="text-xs px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
              📄 Cut PO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function POCard({ po, history }: { po: PO; history?: boolean }) {
  return (
    <div data-testid={`proc-po-${po.id}`} className="border border-border/40 rounded-md p-4 bg-muted/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-foreground/60">{po.id}</span>
            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">{po.vendor_name}</span>
            {po.status === "ordered" && <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Ordered</span>}
            {po.status === "received" && <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">✓ Received</span>}
            {po.status === "received_with_variance" && <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">⚠ Variance</span>}
          </div>
          <div className="text-sm">{po.item_count} items · ${po.total.toFixed(2)}
            {po.expected_delivery_date && <span className="text-foreground/60"> · ETA {po.expected_delivery_date}</span>}
          </div>
          <div className="text-[11px] text-foreground/60 mt-1">
            {po.items.slice(0, 5).map((it: any) => {
              const delta = it.qty_delta;
              return `${it.qty_received != null ? `${it.qty_received}/` : ""}${it.qty} ${it.name}${
                delta && Math.abs(delta) > 0.01 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""
              }`;
            }).join(" · ")}
            {po.items.length > 5 && ` +${po.items.length - 5}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function ApproveModal({ req, onClose, onDone }: { req: Req; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  async function submit() {
    setSubmitting(true);
    try {
      const r = await fetch(`${API()}/api/ecw-ops/inventory/requisitions/${req.id}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "purchasing-manager" },
        body: JSON.stringify({ note: note || null }),
      }).then((r) => r.json());
      if (r.ok) onDone();
    } finally { setSubmitting(false); }
  }
  return (
    <Modal onClose={onClose} title="Approve requisition">
      <p className="text-xs text-foreground/60 mb-3">Approving locks the requisition. Next step: cut a PO with vendor + pricing.</p>
      <textarea placeholder="Approval note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
        data-testid="approve-note"
        className="w-full px-3 py-2 text-sm rounded border border-border/50 bg-background" rows={3} />
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onClose} className="text-xs px-3 py-1 border border-border/50 rounded">Cancel</button>
        <button data-testid="approve-submit" onClick={submit} disabled={submitting}
          className="text-xs px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded">
          {submitting ? "…" : "✓ Approve"}
        </button>
      </div>
    </Modal>
  );
}

function CreatePOModal({ req, onClose, onDone }: { req: Req; onClose: () => void; onDone: () => void }) {
  const [vendor, setVendor] = React.useState("Sysco · Main Food Service");
  const [eta, setEta] = React.useState("");
  const [prices, setPrices] = React.useState<Record<string, string>>(
    () => Object.fromEntries((req.items || []).map((it: any) => [it.item_id, String(it.cost_per_unit ?? 0)]))
  );
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const unit_prices: Record<string, number> = {};
      Object.entries(prices).forEach(([id, v]) => { unit_prices[id] = Number(v) || 0; });
      const r = await fetch(`${API()}/api/ecw-ops/inventory/purchase-orders`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "purchasing-manager" },
        body: JSON.stringify({
          requisition_id: req.id,
          vendor_id: "vendor-" + vendor.toLowerCase().replace(/\s+/g, "-").slice(0, 20),
          vendor_name: vendor,
          expected_delivery_date: eta || null,
          unit_prices,
        }),
      }).then((r) => r.json());
      if (r.ok) onDone();
      else alert("Failed: " + JSON.stringify(r));
    } finally { setSubmitting(false); }
  }

  const total = (req.items || []).reduce((a: number, it: any) => a + (Number(prices[it.item_id] || 0) * Number(it.qty || 0)), 0);

  return (
    <Modal onClose={onClose} title={`Cut PO · ${req.id}`} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs flex flex-col gap-1">
            Vendor
            <input data-testid="po-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)}
              className="px-2 py-1 text-sm rounded border border-border/50 bg-background" />
          </label>
          <label className="text-xs flex flex-col gap-1">
            Expected delivery
            <input data-testid="po-eta" type="date" value={eta} onChange={(e) => setEta(e.target.value)}
              className="px-2 py-1 text-sm rounded border border-border/50 bg-background" />
          </label>
        </div>
        <div className="border border-border/40 rounded max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5">Item</th>
                <th className="text-right px-2 py-1.5">Qty</th>
                <th className="text-right px-2 py-1.5">Unit $</th>
                <th className="text-right px-2 py-1.5">Line $</th>
              </tr>
            </thead>
            <tbody>
              {(req.items || []).map((it: any) => {
                const price = Number(prices[it.item_id] || 0);
                return (
                  <tr key={it.item_id} className="border-t border-border/30" data-testid={`po-line-${it.item_id}`}>
                    <td className="px-2 py-1">{it.name}</td>
                    <td className="px-2 py-1 text-right font-mono">{it.qty} {it.unit}</td>
                    <td className="px-2 py-1 text-right">
                      <input type="number" step="0.01" value={prices[it.item_id] ?? ""}
                        onChange={(e) => setPrices((p) => ({ ...p, [it.item_id]: e.target.value }))}
                        data-testid={`po-price-${it.item_id}`}
                        className="w-20 text-right font-mono px-1 py-0.5 rounded border border-border/50 bg-background" />
                    </td>
                    <td className="px-2 py-1 text-right font-mono">${(price * Number(it.qty || 0)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-amber-500/30 bg-amber-500/5">
                <td colSpan={3} className="px-2 py-1.5 text-right font-medium">Total</td>
                <td data-testid="po-total" className="px-2 py-1.5 text-right font-mono font-bold text-amber-400">${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="text-xs px-3 py-1 border border-border/50 rounded">Cancel</button>
          <button data-testid="po-submit" onClick={submit} disabled={submitting}
            className="text-xs px-4 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-medium">
            {submitting ? "…" : `📄 Cut PO · $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`bg-background border border-amber-500/30 rounded-md shadow-xl p-5 ${wide ? "max-w-2xl" : "max-w-md"} w-[95%]`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">{title}</h3>
          <button onClick={onClose} className="text-foreground/50">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
