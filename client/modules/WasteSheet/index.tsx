import React, { useState, useEffect, useCallback } from "react";
import { Trash2, DollarSign, Plus, RotateCcw, ArrowDownRight, TrendingDown, AlertTriangle } from "lucide-react";

const BACKEND = window.location.origin;

interface WasteEntry {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  reason: string;
  cost_estimate: number;
  department: string;
  recorded_by: string;
  timestamp: string;
  notes: string;
  credits: Array<{ id: string; amount: number; type: string; notes: string }>;
  net_cost: number;
  accounting_posted: boolean;
}

interface DashboardData {
  total_entries: number;
  total_cost: number;
  total_credits: number;
  net_waste_cost: number;
  by_reason: Record<string, { count: number; cost: number }>;
  by_department: Record<string, { count: number; cost: number }>;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

const REASONS = [
  { value: "expired", label: "Expired" },
  { value: "overproduction", label: "Overproduction" },
  { value: "prep_error", label: "Prep Error" },
  { value: "spoilage", label: "Spoilage" },
  { value: "quality_reject", label: "Quality Reject" },
];

const CREDIT_TYPES = [
  { value: "vendor_return", label: "Vendor Return" },
  { value: "composting", label: "Composting" },
  { value: "donation", label: "Donation" },
  { value: "staff_meal", label: "Staff Meal" },
];

export default function WasteSheetPanel() {
  const [entries, setEntries] = useState<WasteEntry[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState<string | null>(null);
  const [dept, setDept] = useState<string>("all");

  // Form state
  const [form, setForm] = useState({
    item_name: "", quantity: "", unit: "lb", reason: "expired",
    cost_per_unit: "", department: "culinary", notes: "",
  });
  const [creditForm, setCreditForm] = useState({ credit_amount: "", credit_type: "vendor_return", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const deptParam = dept !== "all" ? `?department=${dept}` : "";
      const [entriesRes, dashRes] = await Promise.all([
        fetch(`${BACKEND}/api/waste-sheet/entries${deptParam}`),
        fetch(`${BACKEND}/api/waste-sheet/dashboard${deptParam}`),
      ]);
      const entriesData = await entriesRes.json();
      const dashData = await dashRes.json();
      setEntries(entriesData.entries || []);
      setDashboard(dashData);
    } catch (err) {
      console.error("Failed to load waste data:", err);
    } finally {
      setLoading(false);
    }
  }, [dept]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND}/api/waste-sheet/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: parseFloat(form.quantity),
          cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowForm(false);
      setForm({ item_name: "", quantity: "", unit: "lb", reason: "expired", cost_per_unit: "", department: "culinary", notes: "" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCredit = async (wasteId: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/waste-sheet/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waste_id: wasteId,
          credit_amount: parseFloat(creditForm.credit_amount),
          credit_type: creditForm.credit_type,
          notes: creditForm.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowCreditForm(null);
      setCreditForm({ credit_amount: "", credit_type: "vendor_return", notes: "" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const reasonColors: Record<string, string> = {
    expired: "text-red-400", overproduction: "text-orange-400",
    prep_error: "text-yellow-400", spoilage: "text-pink-400", quality_reject: "text-purple-400",
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--foreground)]" data-testid="waste-sheet-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Trash2 size={18} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold">Waste Sheet</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--sidebar-accent)] text-[var(--muted-foreground)]">
            EchoAuruim Integrated
          </span>
        </div>
        <div className="flex gap-2">
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="text-xs rounded border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-2 py-1"
            data-testid="dept-filter"
          >
            <option value="all">All Departments</option>
            <option value="culinary">Culinary</option>
            <option value="pastry">Pastry</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
            data-testid="add-waste-btn"
          >
            <Plus size={12} /> Record Waste
          </button>
        </div>
      </div>

      {/* Dashboard Summary */}
      {dashboard && (
        <div className="grid grid-cols-4 gap-3 px-4 py-3">
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="total-waste-cost">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              <TrendingDown size={12} /> Total Waste
            </div>
            <p className="text-lg font-bold text-red-400">{formatCurrency(dashboard.total_cost)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{dashboard.total_entries} entries</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="total-credits">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              <RotateCcw size={12} /> Credits/Recovery
            </div>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(dashboard.total_credits)}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="net-cost">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              <DollarSign size={12} /> Net Cost
            </div>
            <p className="text-lg font-bold text-orange-400">{formatCurrency(dashboard.net_waste_cost)}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="top-reason">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
              <AlertTriangle size={12} /> Top Reason
            </div>
            {Object.entries(dashboard.by_reason).length > 0 ? (
              <>
                <p className="text-sm font-bold capitalize">
                  {Object.entries(dashboard.by_reason).sort((a, b) => b[1].cost - a[1].cost)[0]?.[0]?.replace(/_/g, " ")}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {formatCurrency(Object.entries(dashboard.by_reason).sort((a, b) => b[1].cost - a[1].cost)[0]?.[1]?.cost || 0)}
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No data</p>
            )}
          </div>
        </div>
      )}

      {/* New Waste Form */}
      {showForm && (
        <div className="mx-4 mb-3 rounded-lg border border-[var(--border)] p-4 bg-[var(--card)]" data-testid="waste-form">
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-3">
            <input
              placeholder="Item name"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
              required
              data-testid="waste-item-name"
            />
            <div className="flex gap-1">
              <input
                type="number"
                step="0.1"
                placeholder="Qty"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                required
                data-testid="waste-quantity"
              />
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="rounded border border-[var(--border)] bg-[var(--background)] px-1 py-1.5 text-xs text-[var(--foreground)]"
                data-testid="waste-unit"
              >
                <option value="lb">lb</option>
                <option value="oz">oz</option>
                <option value="each">each</option>
                <option value="gal">gal</option>
                <option value="kg">kg</option>
              </select>
            </div>
            <select
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
              data-testid="waste-reason"
            >
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Cost/unit ($)"
              value={form.cost_per_unit}
              onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
              data-testid="waste-cost-per-unit"
            />
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
              data-testid="waste-department"
            >
              <option value="culinary">Culinary</option>
              <option value="pastry">Pastry</option>
            </select>
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
              data-testid="waste-notes"
            />
            <div className="flex gap-2 col-span-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                Cancel
              </button>
              <button type="submit" className="px-3 py-1.5 text-xs rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90" data-testid="submit-waste-btn">
                Save & Post to GL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries Table */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center py-12 text-[var(--muted-foreground)] text-sm">No waste entries recorded. Click "Record Waste" to begin.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Dept</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Net</th>
                <th className="px-3 py-2">GL</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr className="border-b border-[var(--border)] hover:bg-[var(--sidebar-accent)] transition-colors" data-testid={`waste-row-${entry.id}`}>
                    <td className="px-3 py-2 font-medium text-[var(--foreground)]">{entry.item_name}</td>
                    <td className="px-3 py-2">{entry.quantity} {entry.unit}</td>
                    <td className="px-3 py-2">
                      <span className={`capitalize text-xs font-medium ${reasonColors[entry.reason] || ""}`}>
                        {entry.reason.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 capitalize text-xs">{entry.department}</td>
                    <td className="px-3 py-2 text-red-400">{formatCurrency(entry.cost_estimate)}</td>
                    <td className="px-3 py-2 text-emerald-400">
                      {entry.credits && entry.credits.length > 0
                        ? formatCurrency(entry.credits.reduce((s, c) => s + c.amount, 0))
                        : "-"}
                    </td>
                    <td className="px-3 py-2 font-medium">{formatCurrency(entry.net_cost ?? entry.cost_estimate)}</td>
                    <td className="px-3 py-2">
                      {entry.accounting_posted ? (
                        <span className="text-emerald-400 text-[10px] font-medium">Posted</span>
                      ) : (
                        <span className="text-[var(--muted-foreground)] text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setShowCreditForm(showCreditForm === entry.id ? null : entry.id)}
                        className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]"
                        data-testid={`apply-credit-btn-${entry.id}`}
                      >
                        <ArrowDownRight size={10} className="inline mr-0.5" /> Credit
                      </button>
                    </td>
                  </tr>
                  {showCreditForm === entry.id && (
                    <tr className="bg-[var(--sidebar-accent)]">
                      <td colSpan={9} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Credit amount"
                            value={creditForm.credit_amount}
                            onChange={(e) => setCreditForm({ ...creditForm, credit_amount: e.target.value })}
                            className="w-28 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]"
                            data-testid="credit-amount-input"
                          />
                          <select
                            value={creditForm.credit_type}
                            onChange={(e) => setCreditForm({ ...creditForm, credit_type: e.target.value })}
                            className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]"
                            data-testid="credit-type-select"
                          >
                            {CREDIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <input
                            placeholder="Notes"
                            value={creditForm.notes}
                            onChange={(e) => setCreditForm({ ...creditForm, notes: e.target.value })}
                            className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]"
                          />
                          <button
                            onClick={() => handleCredit(entry.id)}
                            className="px-3 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-500"
                            data-testid="submit-credit-btn"
                          >
                            Apply
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
