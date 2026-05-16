/** iter255 · Vendor & Supplier Intel — Oracle ERP-style panel
 *  Shows all tracked vendor SKUs with price history, last invoice, current
 *  pricing per UOM. Search + filter + group-by-vendor. Pulls from
 *  /api/vendor-skus/all (populated from ingested invoices).
 */
import React from "react";
import { Search, ChevronRight, Package, RefreshCw, Filter } from "lucide-react";

const API = (typeof window !== "undefined" ? window.location.origin : "");
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
    minimumFractionDigits: 2 }).format(n);

type Sku = {
  id: string;
  vendor_name: string;
  description: string;
  item_code?: string;
  current_unit_price: number;
  current_uom?: string;
  pack_size?: string;
  last_invoice_number?: string;
  last_invoice_date?: string;
  updated_at?: string;
};

export default function VendorIntelPanel() {
  const [rows, setRows] = React.useState<Sku[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [vendorFilter, setVendorFilter] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/vendor-skus/all?limit=500`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(d => { setRows(d.rows || []); setLoading(false); });
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const filtered = rows.filter(r => {
    if (vendorFilter && r.vendor_name !== vendorFilter) return false;
    if (q && !(r.description || "").toLowerCase().includes(q.toLowerCase())
      && !(r.item_code || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const vendors = Array.from(new Set(rows.map(r => r.vendor_name))).sort();
  const byVendor = new Map<string, Sku[]>();
  filtered.forEach(s => {
    if (!byVendor.has(s.vendor_name)) byVendor.set(s.vendor_name, []);
    byVendor.get(s.vendor_name)!.push(s);
  });

  return (
    <div data-testid="vendor-intel-panel"
      className="flex flex-col h-full w-full bg-slate-50 dark:bg-[#0a0d18] text-slate-900 dark:text-slate-100">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-[#0c1322] border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Procurement</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-500">Purchasing &amp; Receiving</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold">Vendor &amp; Supplier Intel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              data-testid="vendor-intel-search"
              placeholder="Search SKUs / item codes…"
              className="pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 w-64" />
          </div>
          <button onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-white/15">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Vendor filter chips */}
      <div className="px-6 py-3 flex items-center gap-2 flex-wrap bg-white dark:bg-[#0c1322] border-b border-slate-100 dark:border-white/5">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-1">
          <Filter className="w-3 h-3 inline mr-1" /> Vendor:
        </span>
        <button data-testid="vendor-chip-all"
          onClick={() => setVendorFilter(null)}
          className={`px-3 py-1 text-[11px] rounded-full font-semibold border ${
            vendorFilter === null ? "bg-amber-500/20 border-amber-500/50 text-amber-600" : "border-slate-300 dark:border-white/10 text-slate-500"
          }`}>All ({rows.length})</button>
        {vendors.map(v => (
          <button key={v} data-testid={`vendor-chip-${v.replace(/\s/g, "-").toLowerCase()}`}
            onClick={() => setVendorFilter(v === vendorFilter ? null : v)}
            className={`px-3 py-1 text-[11px] rounded-full font-semibold border ${
              v === vendorFilter ? "bg-amber-500/20 border-amber-500/50 text-amber-600" : "border-slate-300 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}>{v} ({rows.filter(x => x.vendor_name === v).length})</button>
        ))}
      </div>

      {/* SKU table */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-500">Loading vendor intel…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">
            <Package className="w-10 h-10 mx-auto mb-3 text-slate-400" />
            No SKUs match your search.
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(byVendor.entries()).map(([vendor, skus]) => (
              <div key={vendor}
                className="rounded-lg bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{vendor}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {skus.length} SKU{skus.length === 1 ? "" : "s"} tracked · last invoice {skus[0]?.last_invoice_date || "—"}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Total catalog value: <b className="text-amber-600 dark:text-amber-500">
                      {fmt(skus.reduce((s, k) => s + (k.current_unit_price || 0), 0))}
                    </b>
                  </div>
                </div>
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-white/5">
                    <tr>
                      <th className="text-left py-2 px-4 font-semibold">Item Code</th>
                      <th className="text-left py-2 px-4 font-semibold">Description</th>
                      <th className="text-left py-2 px-4 font-semibold">Pack</th>
                      <th className="text-right py-2 px-4 font-semibold">Unit Price</th>
                      <th className="text-right py-2 px-4 font-semibold">UOM</th>
                      <th className="text-right py-2 px-4 font-semibold">Last Inv #</th>
                      <th className="text-right py-2 px-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skus.map(s => (
                      <tr key={s.id} data-testid={`sku-row-${s.id.replace(/[^a-z0-9]/gi, "-")}`}
                        className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{s.item_code || "—"}</td>
                        <td className="py-2.5 px-4 font-medium">{s.description}</td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">{s.pack_size || "—"}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-bold text-amber-600 dark:text-amber-500">
                          {fmt(s.current_unit_price)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500 text-[11px]">{s.current_uom || "EA"}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-[10px] text-slate-500">{s.last_invoice_number || "—"}</td>
                        <td className="py-2.5 px-4 text-right text-slate-500 text-[11px]">{s.last_invoice_date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
