/**
 * CreateCakeOrderModal
 * --------------------
 * Collects customer info + pickup date from the Cake Designer, POSTs to
 * /api/cake-orders, then shows the generated order number, POS queue
 * status, and a live preview of the quote email.
 */
import React, { useState, useMemo } from "react";
import { X, CheckCircle2, Mail, FileText, Copy, Loader2 } from "lucide-react";

const ACCENT = "#c8a97e";
const BORDER = "rgba(255,255,255,0.08)";
const API = typeof window !== "undefined" ? window.location.origin : "";

interface TierLite {
  id?: string;
  diameter?: number;
  height?: number;
  shape?: string;
  flavor?: string;
  fillingFlavor?: string;
  frostingStyle?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  design: {
    name: string;
    version?: string;
    tiers: TierLite[];
    decorations: Array<{ name: string }>;
  };
  costing: {
    total: number;
    foodCost: number;
    laborHrs: number;
    laborCost: number;
    servings: number;
  };
}

export default function CreateCakeOrderModal({ open, onClose, design, costing }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [pickupTime, setPickupTime] = useState("15:00");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [createDeposit, setCreateDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestedPrice = useMemo(() => costing.total * 3.2, [costing.total]);
  const defaultDeposit = useMemo(() => Math.round(suggestedPrice * 0.5 * 100) / 100, [suggestedPrice]);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError("Customer name is required."); return; }
    setLoading(true);
    try {
      const body = {
        design_name: design.name,
        version: design.version,
        client: { name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined },
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        tiers: design.tiers.map((t, i) => ({
          tier: i + 1,
          diameter: t.diameter,
          height: t.height,
          shape: t.shape,
          flavor: t.flavor,
          filling: t.fillingFlavor,
          frosting_style: t.frostingStyle,
        })),
        decorations: design.decorations.map(d => d.name),
        total_servings: costing.servings,
        costing: {
          food_cost: costing.foodCost,
          labor_hours: costing.laborHrs,
          labor_cost: costing.laborCost,
          total_cost: costing.total,
          suggested_price: suggestedPrice,
          per_serving: suggestedPrice / Math.max(costing.servings, 1),
        },
        notes: notes.trim() || undefined,
        send_email: sendEmail && !!email.trim(),
        create_deposit_link: createDeposit,
        deposit_amount: typeof depositAmount === "number" ? depositAmount : defaultDeposit,
      };
      const r = await fetch(`${API}/api/cake-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to create order");
      setResult(d);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    }
    setLoading(false);
  };

  const copyOrder = () => {
    if (result?.order?.order_number) {
      navigator.clipboard?.writeText(result.order.order_number);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ background: "rgba(4,6,13,0.86)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
      data-testid="create-order-modal"
    >
      <div
        className="w-full max-w-[900px] max-h-[92vh] flex flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER, background: `linear-gradient(90deg, ${ACCENT}10 0%, transparent 100%)` }}>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>Custom Cake Order</div>
            <div className="text-[16px] font-semibold text-white mt-0.5">{design.name}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.05]">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {!result ? (
            <div className="grid grid-cols-2 gap-6 p-6">
              {/* Left — Customer form */}
              <div className="space-y-3">
                <Field label="Customer Name *">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Morrison"
                    className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none"
                    style={{ border: `1px solid ${BORDER}` }} data-testid="order-customer-name" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email">
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com"
                      className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none"
                      style={{ border: `1px solid ${BORDER}` }} data-testid="order-customer-email" />
                  </Field>
                  <Field label="Phone">
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 305-555-0142"
                      className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none"
                      style={{ border: `1px solid ${BORDER}` }} data-testid="order-customer-phone" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pickup Date *">
                    <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)}
                      className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none"
                      style={{ border: `1px solid ${BORDER}`, colorScheme: "dark" }} data-testid="order-pickup-date" />
                  </Field>
                  <Field label="Pickup Time">
                    <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)}
                      className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none"
                      style={{ border: `1px solid ${BORDER}`, colorScheme: "dark" }} data-testid="order-pickup-time" />
                  </Field>
                </div>
                <Field label="Notes (dietary, allergens, delivery details)">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    placeholder="Gluten-free tier, no nuts, pickup at venue..."
                    className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none resize-none"
                    style={{ border: `1px solid ${BORDER}` }} data-testid="order-notes" />
                </Field>

                <div className="rounded-lg p-3 space-y-2 mt-2" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <label className="flex items-center gap-2 text-[11px] text-white/80 cursor-pointer">
                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
                      className="accent-[#c8a97e]" data-testid="order-send-email" />
                    Auto-send quote email to customer
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-white/80 cursor-pointer">
                    <input type="checkbox" checked={createDeposit} onChange={e => setCreateDeposit(e.target.checked)}
                      className="accent-[#c8a97e]" data-testid="order-create-deposit" />
                    Embed 50% deposit link (Stripe)
                  </label>
                  {createDeposit && (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] text-white/50">Deposit $</span>
                      <input type="number" step={0.01} value={depositAmount === "" ? defaultDeposit : depositAmount}
                        onChange={e => setDepositAmount(+e.target.value)}
                        className="flex-1 px-2 py-1 rounded text-[11px] text-white bg-transparent outline-none font-mono"
                        style={{ border: `1px solid ${BORDER}` }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Right — Order summary */}
              <div className="rounded-lg p-4 space-y-3" style={{ background: "rgba(200,169,126,0.04)", border: `1px solid ${ACCENT}25` }}>
                <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Order Summary</div>
                <div className="space-y-1.5 text-[11px]">
                  <Row label="Design" value={design.name} />
                  <Row label="Version" value={design.version || "V001"} />
                  <Row label="Tiers" value={`${design.tiers.length} tiers`} />
                  <Row label="Decorations" value={`${design.decorations.length} items`} />
                  <Row label="Servings" value={String(costing.servings)} />
                </div>
                <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <Row label="Food cost" value={`$${costing.foodCost.toFixed(2)}`} mono />
                  <Row label={`Labor (${costing.laborHrs}h)`} value={`$${costing.laborCost.toFixed(2)}`} mono />
                  <Row label="Total cost" value={`$${costing.total.toFixed(2)}`} mono />
                </div>
                <div className="pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${ACCENT}40` }}>
                  <span className="text-[12px] text-white font-semibold">Quote</span>
                  <span className="text-[20px] font-bold" style={{ color: ACCENT }}>${suggestedPrice.toFixed(2)}</span>
                </div>
                <div className="text-[9px] text-white/40 text-right">Per serving: ${(suggestedPrice / Math.max(costing.servings, 1)).toFixed(2)}</div>
              </div>

              {error && (
                <div className="col-span-2 text-[11px] text-red-400 rounded p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}>
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Success banner */}
              <div className="flex items-start gap-3 rounded-lg p-4" style={{ background: "rgba(34,197,94,0.08)", border: `1px solid rgba(34,197,94,0.35)` }}>
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-white">Order created and routed to production.</div>
                  <div className="text-[10px] text-white/50 mt-0.5">Every custom cake generates a unique, traceable order number.</div>
                </div>
              </div>

              {/* Order number */}
              <div className="rounded-lg p-4" style={{ background: "rgba(200,169,126,0.06)", border: `1px solid ${ACCENT}35` }}>
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mb-1">Order Number</div>
                <div className="flex items-center justify-between">
                  <div className="text-[22px] font-mono font-bold tracking-wider" style={{ color: ACCENT }} data-testid="order-number-display">
                    {result.order.order_number}
                  </div>
                  <button onClick={copyOrder} className="text-[10px] px-2.5 py-1 rounded flex items-center gap-1"
                    style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="text-[9px] text-white/40 mt-1 font-mono">
                  Format: CK-{`{initials}`}-{`{pickup yymmdd}`}-{`{checksum}`}
                </div>
              </div>

              {/* Status grid */}
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <StatusCard label="Email" value={result.order.email_status}
                  color={result.order.email_status === "sent" ? "#22c55e" : result.order.email_status === "queued" ? "#f59e0b" : "#ef4444"}
                  icon={<Mail className="w-3.5 h-3.5" />} />
                <StatusCard label="POS" value={result.order.pos_status || "queued"} color={ACCENT}
                  icon={<FileText className="w-3.5 h-3.5" />} />
                <StatusCard label="Deposit link"
                  value={result.order.deposit_link ? "ready" : "—"}
                  color={result.order.deposit_link ? "#22c55e" : "rgba(148,163,184,0.4)"}
                  icon={<FileText className="w-3.5 h-3.5" />} />
              </div>

              {result.order.deposit_link && (
                <a href={result.order.deposit_link} target="_blank" rel="noreferrer"
                   className="block text-center py-2.5 rounded text-[11px] font-semibold"
                   style={{ background: ACCENT, color: "#0b1020" }} data-testid="order-deposit-link">
                  Open deposit link · ${result.order.deposit_amount?.toFixed?.(2) ?? "—"}
                </a>
              )}

              {/* Email preview */}
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email preview
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: "#f5f4f0" }}>
                  <iframe
                    srcDoc={result.email_preview_html}
                    className="w-full"
                    style={{ height: 620, border: 0 }}
                    title="Quote email preview"
                    data-testid="order-email-preview"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.015)" }}>
          {!result ? (
            <>
              <div className="text-[9px] font-mono text-white/35 uppercase tracking-wider">
                Order # auto-generated on submit
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-md text-[11px] font-medium text-white/60"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                  Cancel
                </button>
                <button onClick={submit} disabled={loading || !name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-md text-[11px] font-semibold disabled:opacity-40"
                  style={{ background: ACCENT, color: "#0b1020" }} data-testid="order-submit-btn">
                  {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <>Create Order & Send Quote</>}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] text-white/40">
                Filed in <span className="text-white/70 font-mono">cake_orders</span> · POS handoff pending pickup
              </div>
              <button onClick={onClose} className="px-5 py-2 rounded-md text-[11px] font-semibold"
                style={{ background: ACCENT, color: "#0b1020" }} data-testid="order-done-btn">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/40 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className={mono ? "font-mono text-white/85" : "text-white"}>{value}</span>
    </div>
  );
}

function StatusCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-white/40">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="text-[12px] mt-1 font-semibold capitalize" style={{ color }}>{value || "—"}</div>
    </div>
  );
}
