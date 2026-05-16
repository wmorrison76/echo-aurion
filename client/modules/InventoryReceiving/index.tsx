import React, { useState, useEffect, useCallback } from "react";
import {
  Package, Search, Check, AlertTriangle, BarChart3, Truck,
  RefreshCw, DollarSign, Plus, ClipboardList, ArrowUp, ArrowDown,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/inventory${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/inventory${p}`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(b) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const INV_COLOR = "#06b6d4";

type Tab = "dashboard" | "receive" | "items" | "receipts";

export default function InventoryReceiving() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [searchQ, setSearchQ] = useState("");
  // Receiving form
  const [prId, setPrId] = useState("");
  const [recvItems, setRecvItems] = useState<any[]>([{ingredient: "", quantity: 0, unit: "lb", unit_cost: 0}]);
  const [recvResult, setRecvResult] = useState<any>(null);

  useEffect(() => { GET("/dashboard").then(setDashboard); }, []);
  useEffect(() => { if (tab === "items") GET("/items").then(d => setItems(d.items || [])); }, [tab]);
  useEffect(() => { if (tab === "receipts") GET("/receipts").then(d => setReceipts(d.receipts || [])); }, [tab]);

  const seedInventory = useCallback(async () => {
    await POST("/seed");
    GET("/dashboard").then(setDashboard);
    if (tab === "items") GET("/items").then(d => setItems(d.items || []));
  }, [tab]);

  const submitReceiving = useCallback(async () => {
    const valid = recvItems.filter(i => i.ingredient && i.quantity > 0);
    if (valid.length === 0) return;
    const result = await POST("/receive", { requisition_id: prId, items: valid, received_by: "Staff" });
    setRecvResult(result);
    GET("/dashboard").then(setDashboard);
  }, [prId, recvItems]);

  const addRecvLine = () => setRecvItems(prev => [...prev, {ingredient: "", quantity: 0, unit: "lb", unit_cost: 0}]);

  const filteredItems = searchQ ? items.filter(i => i.name?.toLowerCase().includes(searchQ.toLowerCase())) : items;

  const TABS: {id: Tab; label: string; icon: any}[] = [
    {id: "dashboard", label: "Dashboard", icon: BarChart3},
    {id: "receive", label: "Receive Delivery", icon: Truck},
    {id: "items", label: "Inventory", icon: Package},
    {id: "receipts", label: "Receipts", icon: ClipboardList},
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{...FONT, background: BG, color: "#e2e8f0"}} data-testid="inventory-panel">
      <div style={{borderBottom: `1px solid ${BORDER}`}}>
        <div className="flex items-center gap-4 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)"}}>
              <Package className="w-4 h-4" style={{color: INV_COLOR}} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">INVENTORY RECEIVING</div>
              <div className="text-[9px] tracking-[0.15em] uppercase" style={{...MONO, color: "rgba(6,182,212,0.5)"}}>Scan Deliveries | Par Levels | Stock Alerts</div>
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={seedInventory} className="px-2 py-1 rounded text-[9px]" style={{background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.5)"}}>Seed Inventory</button>
          <div className="flex gap-0.5 p-0.5 rounded-lg" style={{background: SURFACE, border: `1px solid ${BORDER}`}}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} data-testid={`inv-tab-${t.id}`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{background: tab === t.id ? "rgba(6,182,212,0.08)" : "transparent", color: tab === t.id ? INV_COLOR : "rgba(148,163,184,0.5)", border: tab === t.id ? "1px solid rgba(6,182,212,0.15)" : "1px solid transparent"}}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard" && dashboard && (
          <div className="p-4" data-testid="inv-dashboard">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <SC label="Total Items" value={dashboard.total_items} color={INV_COLOR} />
              <SC label="Inventory Value" value={`$${(dashboard.total_value/1000).toFixed(1)}K`} color={ACCENT} />
              <SC label="Low Stock" value={dashboard.low_stock_count} color="#f59e0b" />
              <SC label="Critical (0)" value={dashboard.critical_count} color="#ef4444" />
            </div>
            {dashboard.low_stock_items?.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold mb-2 flex items-center gap-1" style={{color: "#f59e0b"}}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Alerts
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {dashboard.low_stock_items.slice(0, 8).map((i: any) => (
                    <div key={i.item_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded"
                      style={{background: i.on_hand === 0 ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)", border: `1px solid ${i.on_hand === 0 ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)"}`}}>
                      <span className="text-[10px] text-white flex-1">{i.name}</span>
                      <span className="text-[9px]" style={{...MONO, color: i.on_hand === 0 ? "#ef4444" : "#f59e0b"}}>{i.on_hand}/{i.par_level} {i.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(dashboard.by_category || {}).length > 0 && (
              <div className="p-3 rounded-lg" style={{background: SURFACE, border: `1px solid ${BORDER}`}}>
                <div className="text-[11px] font-semibold mb-2 text-white">By Category</div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(dashboard.by_category).map(([cat, info]: [string, any]) => (
                    <div key={cat} className="p-2 rounded" style={{background: "rgba(255,255,255,0.015)"}}>
                      <div className="text-[10px] font-medium capitalize text-white">{cat}</div>
                      <div className="text-[9px]" style={{color: "rgba(148,163,184,0.5)"}}>{info.count} items | ${info.value.toFixed(0)} value</div>
                      {info.low_stock > 0 && <div className="text-[8px]" style={{color: "#f59e0b"}}>{info.low_stock} low stock</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "receive" && (
          <div className="p-4 max-w-3xl" data-testid="receive-form">
            <div className="text-[11px] font-semibold mb-3 text-white">Receive Delivery</div>
            <div className="mb-3">
              <label className="text-[9px] uppercase mb-1 block" style={{color: "rgba(148,163,184,0.5)"}}>Purchase Requisition ID (optional)</label>
              <input value={prId} onChange={e => setPrId(e.target.value)} placeholder="pr-xxxxxxxx"
                className="w-full px-3 py-2 rounded-md text-[11px] bg-transparent outline-none text-white"
                style={{background: SURFACE, border: `1px solid ${BORDER}`}} data-testid="pr-id-input" />
            </div>
            <div className="text-[9px] font-semibold mb-1.5" style={{color: "rgba(148,163,184,0.5)"}}>ITEMS RECEIVED</div>
            {recvItems.map((item, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input value={item.ingredient} onChange={e => {const n=[...recvItems]; n[i]={...n[i], ingredient: e.target.value}; setRecvItems(n);}}
                  placeholder="Ingredient name" className="flex-1 px-2 py-1.5 rounded text-[10px] bg-transparent outline-none text-white"
                  style={{background: SURFACE, border: `1px solid ${BORDER}`}} />
                <input type="number" step={0.1} value={item.quantity} onChange={e => {const n=[...recvItems]; n[i]={...n[i], quantity: parseFloat(e.target.value)||0}; setRecvItems(n);}}
                  className="w-16 px-2 py-1.5 rounded text-[10px] bg-transparent outline-none text-white text-center"
                  style={{background: SURFACE, border: `1px solid ${BORDER}`}} />
                <select value={item.unit} onChange={e => {const n=[...recvItems]; n[i]={...n[i], unit: e.target.value}; setRecvItems(n);}}
                  className="px-2 py-1.5 rounded text-[10px] bg-transparent outline-none" style={{background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.7)"}}>
                  <option value="lb">lb</option><option value="oz">oz</option><option value="each">each</option><option value="gal">gal</option><option value="case">case</option>
                </select>
                <input type="number" step={0.01} value={item.unit_cost} onChange={e => {const n=[...recvItems]; n[i]={...n[i], unit_cost: parseFloat(e.target.value)||0}; setRecvItems(n);}}
                  placeholder="$/unit" className="w-16 px-2 py-1.5 rounded text-[10px] bg-transparent outline-none text-white text-center"
                  style={{background: SURFACE, border: `1px solid ${BORDER}`}} />
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button onClick={addRecvLine} className="px-3 py-1.5 rounded text-[10px]" style={{background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.5)"}}>
                <Plus className="w-3 h-3 inline mr-1" />Add Line
              </button>
              <button onClick={submitReceiving} className="px-4 py-1.5 rounded text-[10px] font-medium"
                style={{background: "rgba(6,182,212,0.1)", color: INV_COLOR, border: "1px solid rgba(6,182,212,0.2)"}} data-testid="submit-receiving-btn">
                <Check className="w-3 h-3 inline mr-1" />Confirm Receiving
              </button>
            </div>
            {recvResult && (
              <div className="mt-4 p-3 rounded-lg" style={{background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)"}} data-testid="receive-result">
                <div className="text-[11px] font-semibold text-white mb-1">Receipt: {recvResult.receipt_id}</div>
                <div className="text-[10px]" style={{color: "rgba(148,163,184,0.6)"}}>
                  {recvResult.total_items} items | ${recvResult.total_cost?.toFixed(2)} total | {recvResult.variance_count} variances
                </div>
                {recvResult.items?.map((li: any, j: number) => (
                  <div key={j} className="flex items-center gap-2 mt-1 text-[9px]">
                    <span className="text-white flex-1">{li.ingredient}</span>
                    <span style={{...MONO, color: INV_COLOR}}>{li.qty_received} {li.unit}</span>
                    {li.status !== "exact" && (
                      <span style={{color: li.status === "over" ? "#22c55e" : "#ef4444"}}>
                        {li.status === "over" ? <ArrowUp className="w-2.5 h-2.5 inline" /> : <ArrowDown className="w-2.5 h-2.5 inline" />}
                        {li.variance > 0 ? "+" : ""}{li.variance}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "items" && (
          <div className="p-4" data-testid="inventory-items">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md flex-1 max-w-xs" style={{background: SURFACE, border: `1px solid ${BORDER}`}}>
                <Search className="w-3 h-3" style={{color: "rgba(148,163,184,0.4)"}} />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search..."
                  className="flex-1 bg-transparent text-[11px] outline-none text-white placeholder:text-gray-600" />
              </div>
              <span className="text-[10px]" style={{...MONO, color: INV_COLOR}}>{filteredItems.length} items</span>
            </div>
            <table className="w-full text-[10px]">
              <thead><tr style={{borderBottom: `1px solid ${BORDER}`}}>
                {["Item", "Category", "On Hand", "Par", "Unit", "Cost/Unit", "Storage", "Last Recv"].map(h => (
                  <th key={h} className="px-2 py-1.5 text-left text-[9px] font-semibold" style={{color: "rgba(148,163,184,0.4)"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredItems.slice(0, 50).map(i => {
                  const isLow = i.on_hand < i.par_level;
                  return (
                    <tr key={i.item_id} style={{borderBottom: `1px solid rgba(255,255,255,0.02)`}} className="hover:bg-white/[0.02]">
                      <td className="px-2 py-1.5 font-medium text-white">{i.name}</td>
                      <td className="px-2 py-1.5 capitalize" style={{color: "rgba(148,163,184,0.5)"}}>{i.category}</td>
                      <td className="px-2 py-1.5 font-medium" style={{...MONO, color: isLow ? (i.on_hand === 0 ? "#ef4444" : "#f59e0b") : "#22c55e"}}>{i.on_hand}</td>
                      <td className="px-2 py-1.5" style={{...MONO, color: "rgba(148,163,184,0.5)"}}>{i.par_level}</td>
                      <td className="px-2 py-1.5" style={{color: "rgba(148,163,184,0.4)"}}>{i.unit}</td>
                      <td className="px-2 py-1.5" style={{...MONO, color: ACCENT}}>${i.cost_per_unit}</td>
                      <td className="px-2 py-1.5 text-[8px]" style={{color: "rgba(148,163,184,0.35)"}}>{i.storage_location}</td>
                      <td className="px-2 py-1.5 text-[8px]" style={{color: "rgba(148,163,184,0.35)"}}>{i.last_received?.slice(0, 10) || "Never"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "receipts" && (
          <div className="p-4" data-testid="receipts-list">
            <div className="text-[11px] font-semibold mb-3 text-white">Receiving Log ({receipts.length})</div>
            {receipts.map(r => (
              <div key={r.receipt_id} className="p-3 mb-2 rounded-lg" style={{background: SURFACE, border: `1px solid ${BORDER}`}}>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4" style={{color: INV_COLOR}} />
                  <div className="flex-1">
                    <div className="text-[11px] font-medium text-white">{r.receipt_id}</div>
                    <div className="text-[9px]" style={{color: "rgba(148,163,184,0.5)"}}>{r.total_items} items | {r.variance_count} variances | PR: {r.requisition_id || "N/A"}</div>
                  </div>
                  <span className="text-[12px] font-semibold" style={{...MONO, color: ACCENT}}>${r.total_cost?.toFixed(2)}</span>
                  <span className="text-[8px]" style={{color: "rgba(148,163,184,0.3)"}}>{r.received_at?.slice(0, 16)}</span>
                </div>
              </div>
            ))}
            {receipts.length === 0 && <div className="text-center py-10 text-[11px]" style={{color: "rgba(148,163,184,0.3)"}}>No receipts yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function SC({label, value, color}: {label: string; value: any; color: string}) {
  return (
    <div className="px-3 py-2.5 rounded-lg" style={{background: `${color}06`, border: `1px solid ${color}15`}}>
      <div className="text-[16px] font-bold" style={{fontFamily: "'IBM Plex Mono', monospace", color}}>{value}</div>
      <div className="text-[8px] uppercase tracking-wider" style={{color: `${color}80`}}>{label}</div>
    </div>
  );
}
