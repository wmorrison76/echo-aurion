import React, { useState, useEffect, useCallback } from "react";
import { ShoppingCart, FileText, ScanLine, BookOpen, ClipboardList, Truck, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BACKEND}/api/purchasing${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "dashboard" | "vendors" | "orders" | "receiving" | "invoice-ocr" | "gl-codes";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: ShoppingCart },
  { id: "vendors", label: "Vendors", icon: ClipboardList },
  { id: "orders", label: "Purchase Orders", icon: FileText },
  { id: "receiving", label: "Receiving", icon: Truck },
  { id: "invoice-ocr", label: "Invoice OCR", icon: ScanLine },
  { id: "gl-codes", label: "GL Codes", icon: BookOpen },
];

export default function PurchasingHubPanel() {
  const [tab, setTab] = useState<TabId>("dashboard");
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="purchasing-hub-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(34,197,94,0.25)" }}>
          <ShoppingCart className="w-[18px] h-[18px] text-emerald-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">Purchasing & Receiving</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Vendors, POs, Receiving, Invoice OCR, GL Codes</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`pr-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#22c55e" : "transparent", color: tab === t.id ? "#86efac" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "vendors" && <VendorsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "receiving" && <ReceivingTab />}
        {tab === "invoice-ocr" && <InvoiceOcrTab />}
        {tab === "gl-codes" && <GlCodesTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/dashboard").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-4" data-testid="pr-dashboard-tab">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Kpi label="Active Vendors" value={data.active_vendors} accent="text-emerald-400" />
        <Kpi label="Open POs" value={data.open_purchase_orders} accent="text-blue-400" />
        <Kpi label="Deliveries Today" value={data.deliveries_today} accent="text-cyan-400" />
        <Kpi label="Invoice Scans" value={data.invoice_scans} accent="text-violet-400" />
        <Kpi label="GL Codes" value={data.gl_codes} accent="text-amber-400" />
        <Kpi label="YTD Spend" value={`$${(data.ytd_spend / 1000).toFixed(0)}K`} accent="text-rose-400" />
      </div>
    </div>
  );
}

function VendorsTab() {
  const [vendors, setVendors] = useState<any[]>([]);
  const load = useCallback(() => { api("/vendors").then(d => setVendors(d.vendors)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-2" data-testid="pr-vendors-tab">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{vendors.length} Vendors</span>
      {vendors.map(v => (
        <div key={v.vendor_id} className="flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-700/30 px-3 py-2.5">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{v.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 font-mono">{v.category}</span>
              <span className="text-[9px] font-mono text-emerald-400">GL: {v.gl_code}</span>
            </div>
            <div className="flex gap-3 text-[10px] text-slate-500 mt-0.5">
              <span>{v.contact}</span><span>{v.payment_terms}</span>
              <span>{v.total_orders} orders</span><span>${(v.ytd_spend / 1000).toFixed(0)}K YTD</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-400">{v.rating}/5</span>
        </div>
      ))}
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const load = useCallback(() => { api("/orders").then(d => setOrders(d.orders)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const statusColor = (s: string) => s === "open" ? "text-blue-300 bg-blue-500/15" : s === "received" ? "text-emerald-300 bg-emerald-500/15" : s === "partially_received" ? "text-amber-300 bg-amber-500/15" : "text-slate-400 bg-slate-700/40";
  return (
    <div className="space-y-2" data-testid="pr-orders-tab">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{orders.length} Purchase Orders</span>
      {orders.map(o => (
        <div key={o.po_id} className="bg-slate-800/40 rounded-lg border border-slate-700/30 px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-blue-300">{o.po_id}</span>
              <span className="text-xs text-white">{o.vendor_name}</span>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono", statusColor(o.status))}>{o.status}</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">${o.total?.toFixed(2)}</span>
          </div>
          <div className="flex gap-3 text-[10px] text-slate-500">
            <span>{o.items?.length || 0} items</span>
            <span>GL: {o.gl_code}</span>
            <span>Delivery: {o.delivery_date}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceivingTab() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { api("/receiving-log").then(d => setLogs(d.logs)).catch(() => {}); }, []);
  return (
    <div className="space-y-3" data-testid="pr-receiving-tab">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{logs.length} Receiving Events</span>
      {logs.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No receiving events. Log a delivery to get started.</div>}
      {logs.map(l => (
        <div key={l.receive_id} className="bg-slate-800/40 rounded-lg border border-slate-700/30 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-mono text-cyan-300">{l.receive_id}</span>
              <span className="text-xs text-white">{l.vendor_name}</span>
            </div>
            <span className="text-[9px] text-slate-500">{l.received_at ? new Date(l.received_at).toLocaleString() : ""}</span>
          </div>
          <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
            <span>PO: {l.po_id || "—"}</span>
            <span>Temp: {l.temperature_check}</span>
            <span>Quality: {l.quality_check}</span>
            <span>GL: {l.gl_code}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvoiceOcrTab() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [scans, setScans] = useState<any[]>([]);

  useEffect(() => { api("/invoice-scans").then(d => setScans(d.scans)).catch(() => {}); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true); setError(""); setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${BACKEND}/api/invoice-ocr/scan`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);

      // Log the scan
      if (data.extracted && !data.extracted.parse_error) {
        const ext = data.extracted;
        await api("/invoice-scans", { method: "POST", body: JSON.stringify({
          filename: file.name,
          vendor_name: ext.vendor?.name || "",
          invoice_number: ext.invoice_number || "",
          po_number: ext.po_number || "",
          total: ext.total || 0,
          line_count: ext.line_items?.length || 0,
          gl_code: "5000",
        })});

        // Auto PO match
        const matchRes = await fetch(`${BACKEND}/api/invoice-ocr/match-po`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ext),
        });
        if (matchRes.ok) {
          const match = await matchRes.json();
          setResult((prev: any) => ({ ...prev, match: match }));
        }
      }
    } catch (err: any) { setError(err.message || "OCR failed"); }
    finally { setScanning(false); }
  };

  const ext = result?.extracted;

  return (
    <div className="space-y-4" data-testid="pr-invoice-ocr-tab">
      <label data-testid="invoice-upload-btn" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-300 text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors">
        <ScanLine className="w-3.5 h-3.5" /> {scanning ? "Scanning with Gemini Vision..." : "Upload & Scan Invoice"}
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={scanning} />
      </label>

      {error && <div className="p-3 rounded-lg border bg-rose-500/5 border-rose-500/20 text-xs text-rose-400">{error}</div>}

      {result?.match && (
        <div className={cn("p-3 rounded-lg border", result.match.match_status === "clean" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20")}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: result.match.match_status === "clean" ? "#10b981" : "#f59e0b" }} />
            <span className={cn("text-xs font-mono font-semibold", result.match.match_status === "clean" ? "text-emerald-400" : "text-amber-400")}>
              {result.match.match_status === "clean" ? "CLEAN PO MATCH" : `${result.match.discrepancy_count} DISCREPANCIES`}
            </span>
            <span className="text-[10px] text-slate-400">{result.match.recommendation}</span>
          </div>
        </div>
      )}

      {ext && !ext.parse_error && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-slate-800/40 border-slate-700/30">
              <div className="text-[9px] font-mono text-blue-400 tracking-widest mb-1">VENDOR</div>
              <div className="text-xs text-white font-semibold">{ext.vendor?.name || "—"}</div>
              <div className="text-[10px] text-slate-500">{ext.vendor?.address}</div>
            </div>
            <div className="p-3 rounded-lg border bg-slate-800/40 border-slate-700/30">
              <div className="text-[9px] font-mono text-blue-400 tracking-widest mb-1">INVOICE</div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">Invoice #</span><span className="text-white font-mono">{ext.invoice_number}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">PO #</span><span className="text-cyan-400 font-mono">{ext.po_number || "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="text-emerald-400 font-mono font-bold">${ext.total?.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
          {ext.line_items?.length > 0 && (
            <div className="rounded-lg border border-slate-700/20 overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-800/60 text-[9px] font-mono text-blue-400 tracking-widest">LINE ITEMS ({ext.line_items.length})</div>
              {ext.line_items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 border-t border-slate-700/10 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono w-14">{item.item_code}</span>
                    <span className="text-white">{item.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{item.quantity_shipped || item.quantity_ordered} {item.pack_unit}</span>
                    <span className="text-emerald-400 font-mono">${item.extension?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {scans.length > 0 && !ext && (
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scan History ({scans.length})</span>
          <div className="mt-2 space-y-1.5">
            {scans.map(s => (
              <div key={s.scan_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20 text-[10px]">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-3 h-3 text-blue-400" />
                  <span className="text-white">{s.vendor_name || s.filename}</span>
                  <span className="text-slate-500">INV# {s.invoice_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("px-1.5 py-0.5 rounded font-mono", s.match_status === "clean" ? "text-emerald-300 bg-emerald-500/15" : "text-amber-300 bg-amber-500/15")}>{s.match_status}</span>
                  <span className="text-white font-mono">${s.total?.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GlCodesTab() {
  const [codes, setCodes] = useState<any[]>([]);
  useEffect(() => { api("/gl-codes").then(d => setCodes(d.gl_codes)).catch(() => {}); }, []);
  const catColor = (c: string) => c === "COGS" ? "text-amber-300 bg-amber-500/15" : c === "Labor" ? "text-blue-300 bg-blue-500/15" : c === "Overhead" ? "text-violet-300 bg-violet-500/15" : "text-slate-300 bg-slate-700/40";
  return (
    <div className="space-y-2" data-testid="pr-gl-codes-tab">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{codes.length} GL Codes</span>
      {codes.map(gl => (
        <div key={gl.code} className="flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-700/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 w-10">{gl.code}</span>
            <span className="text-xs text-white">{gl.name}</span>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono", catColor(gl.category))}>{gl.category}</span>
          </div>
          <span className="text-[10px] text-slate-500 max-w-48 truncate">{gl.description}</span>
        </div>
      ))}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }
function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      <div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div>
    </div>
  );
}
