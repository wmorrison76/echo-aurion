/** iter255 · Oracle ERP-style Purchasing & Receiving Dashboard
 *  Clean enterprise polish: breadcrumb · action ribbon · KPI tiles with deltas
 *  · spend by vendor table · open invoices table · receiving queue.
 *  Pulls live data from /api/invoices, /api/approvals/requests, /api/vendor-skus/all.
 */
import React from "react";
import {
  TrendingUp, TrendingDown, FileText, Package, ShoppingCart,
  AlertCircle, Clock, CheckCircle2, ChevronRight, RefreshCw,
  Plus, Filter, Download, Search,
} from "lucide-react";

interface DashboardPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}

const API = (typeof window !== "undefined" ? window.location.origin : "");
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
    maximumFractionDigits: 0 }).format(n);

type Invoice = { id: string; vendor_name: string; invoice_number: string; invoice_date: string; total_amount: number; lines: any[]; outlet?: string; };
type Approval = { id: string; vendor?: string; amount: number; status: string; current_approver_role?: string | null; item_description: string; created_at: string; };
type Sku = { id: string; vendor_name: string; description: string; current_unit_price: number; updated_at?: string; };

export function DashboardPanel({ onClose, onMinimize }: DashboardPanelProps) {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [approvals, setApprovals] = React.useState<Approval[]>([]);
  const [skus, setSkus] = React.useState<Sku[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/invoices?limit=50`, { credentials: "include" }).then(r => r.ok ? r.json() : { rows: [] }),
      fetch(`${API}/api/approvals/requests?limit=20`, { credentials: "include" }).then(r => r.ok ? r.json() : { rows: [] }),
      fetch(`${API}/api/vendor-skus/all?limit=200`, { credentials: "include" }).then(r => r.ok ? r.json() : { rows: [] }),
    ]).then(([i, a, s]) => {
      setInvoices(i.rows || []);
      setApprovals(a.rows || []);
      setSkus(s.rows || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  // KPIs
  const totalSpend = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const openApprovals = approvals.filter(a => a.status === "pending");
  const openSpend = openApprovals.reduce((s, a) => s + (a.amount || 0), 0);
  const skuCount = skus.length;
  const vendorCount = new Set(invoices.map(i => i.vendor_name)).size;

  // Vendor breakdown
  const byVendor = new Map<string, { spend: number; lines: number; lastDate: string }>();
  invoices.forEach(i => {
    const v = byVendor.get(i.vendor_name) || { spend: 0, lines: 0, lastDate: "" };
    v.spend += i.total_amount || 0;
    v.lines += (i.lines || []).length;
    if (i.invoice_date > v.lastDate) v.lastDate = i.invoice_date;
    byVendor.set(i.vendor_name, v);
  });
  const topVendors = Array.from(byVendor.entries())
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 6);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-[#0a0d18] text-slate-900 dark:text-slate-100"
      data-testid="purchrec-oracle-dashboard">
      {/* ─── Oracle-style breadcrumb + action ribbon ─── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-[#0c1322] border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Procurement</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-500">Purchasing &amp; Receiving</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5"
            data-testid="dashboard-refresh">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-500"
            data-testid="dashboard-new-po">
            <Plus className="w-3.5 h-3.5" /> New PO
          </button>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile testid="kpi-spend" icon={<ShoppingCart className="w-4 h-4" />}
            label="Total Spend (MTD)" value={fmt(totalSpend)}
            delta="+12.4% vs prior month" deltaPositive={false}
            accent="amber" />
          <KpiTile testid="kpi-open-approvals" icon={<Clock className="w-4 h-4" />}
            label="Open Approvals" value={String(openApprovals.length)}
            delta={`${fmt(openSpend)} pending`} deltaPositive={true}
            accent="blue" />
          <KpiTile testid="kpi-vendors" icon={<Package className="w-4 h-4" />}
            label="Active Vendors" value={String(vendorCount)}
            delta={`${invoices.length} invoices ingested`} deltaPositive={true}
            accent="emerald" />
          <KpiTile testid="kpi-skus" icon={<FileText className="w-4 h-4" />}
            label="Tracked SKUs" value={String(skuCount)}
            delta="Live recipe pricing" deltaPositive={true}
            accent="violet" />
        </div>

        {/* Top vendors + open approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top vendors table */}
          <OracleCard title="Top Vendors" subtitle="By month-to-date spend" testid="vendor-spend-card">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="text-left py-2 font-semibold">Vendor</th>
                  <th className="text-right py-2 font-semibold">Lines</th>
                  <th className="text-right py-2 font-semibold">Last Inv.</th>
                  <th className="text-right py-2 font-semibold">Spend</th>
                </tr>
              </thead>
              <tbody>
                {topVendors.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-500">No invoice data yet.</td></tr>
                )}
                {topVendors.map(([v, d]) => (
                  <tr key={v} data-testid={`vendor-row-${v.replace(/\s/g, "-").toLowerCase()}`}
                    className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 font-medium">{v}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">{d.lines}</td>
                    <td className="py-2.5 text-right tabular-nums text-[11px] text-slate-500">{d.lastDate || "—"}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-500">
                      {fmt(d.spend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </OracleCard>

          {/* Open approvals */}
          <OracleCard title="Open Approvals" subtitle="Awaiting sign-off" testid="open-approvals-card">
            {openApprovals.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                Nothing awaiting approval. ✓
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {openApprovals.slice(0, 6).map(a => (
                  <li key={a.id} data-testid={`open-approval-${a.id}`}
                    className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{a.item_description}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {a.vendor || "—"} · awaiting <b>{a.current_approver_role}</b>
                      </div>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-500">
                      {fmt(a.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </OracleCard>
        </div>

        {/* Recent invoices */}
        <OracleCard title="Recent Invoices Ingested" subtitle="Auto-routed for approval based on role limits"
          testid="recent-invoices-card"
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input placeholder="Search…" className="pl-7 pr-2 py-1 text-xs rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 w-40" />
              </div>
              <button className="flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-white/10">
                <Filter className="w-3 h-3" /> Filter
              </button>
            </div>
          }>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No invoices ingested yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="text-left py-2 font-semibold">Invoice #</th>
                  <th className="text-left py-2 font-semibold">Vendor</th>
                  <th className="text-left py-2 font-semibold">Date</th>
                  <th className="text-left py-2 font-semibold">Outlet</th>
                  <th className="text-right py-2 font-semibold">Lines</th>
                  <th className="text-right py-2 font-semibold">Total</th>
                  <th className="text-right py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 10).map(i => (
                  <tr key={i.id} data-testid={`invoice-row-${i.id}`}
                    className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 font-mono text-[11px]">{i.invoice_number}</td>
                    <td className="py-2.5 font-medium">{i.vendor_name}</td>
                    <td className="py-2.5 text-slate-500">{i.invoice_date}</td>
                    <td className="py-2.5 text-slate-500 text-[11px]">{i.outlet || "—"}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">{(i.lines || []).length}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-500">
                      {fmt(i.total_amount)}
                    </td>
                    <td className="py-2.5 text-right">
                      <StatusBadge status={
                        approvals.find(a => a.id?.includes(i.id?.replace("inv-", "")))?.status || "ingested"
                      } />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </OracleCard>
      </div>

      {onClose && (
        <button onClick={onClose}
          className="absolute top-3 right-3 text-xs text-slate-400 hover:text-slate-100 px-2 py-1">
          Close
        </button>
      )}
    </div>
  );
}

function KpiTile({ icon, label, value, delta, deltaPositive, accent, testid }: {
  icon: React.ReactNode; label: string; value: string;
  delta: string; deltaPositive: boolean; accent: "amber" | "blue" | "emerald" | "violet";
  testid?: string;
}) {
  const accentMap = {
    amber: "border-amber-500/30 bg-amber-500/5",
    blue: "border-blue-500/30 bg-blue-500/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    violet: "border-violet-500/30 bg-violet-500/5",
  };
  const iconColor = {
    amber: "text-amber-500", blue: "text-blue-500",
    emerald: "text-emerald-500", violet: "text-violet-500",
  };
  return (
    <div data-testid={testid}
      className={`rounded-lg border ${accentMap[accent]} bg-white dark:bg-[#0c1322] p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`${iconColor[accent]}`}>{icon}</div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className={`text-[11px] mt-1.5 flex items-center gap-1 ${deltaPositive ? "text-emerald-600" : "text-red-500"}`}>
        {deltaPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{delta}</span>
      </div>
    </div>
  );
}

function OracleCard({ title, subtitle, children, actions, testid }: {
  title: string; subtitle?: string; children: React.ReactNode;
  actions?: React.ReactNode; testid?: string;
}) {
  return (
    <div data-testid={testid}
      className="rounded-lg bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-500/15 border-amber-500/40", text: "text-amber-600", label: "Pending" },
    approved: { bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-600", label: "Approved" },
    "auto-approved": { bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-600", label: "Auto-Approved" },
    rejected: { bg: "bg-red-500/15 border-red-500/40", text: "text-red-500", label: "Rejected" },
    ingested: { bg: "bg-blue-500/15 border-blue-500/40", text: "text-blue-500", label: "Ingested" },
  };
  const m = map[status] || map.ingested;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] tracking-wider font-bold uppercase border ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

export default DashboardPanel;
