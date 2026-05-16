/**
 * SpaServicesManager
 * ------------------
 * Admin table for spa services with:
 *   - Activate / deactivate toggle (instant POS sync)
 *   - Inline edit of price, duration, name, category
 *   - Auto-generated SKU on create
 *   - POS sync queue status viewer
 */
import React, { useEffect, useState } from "react";
import { Plus, X, Power, RefreshCw, Loader2, Save, Trash2, Check, Wifi } from "lucide-react";

const ACCENT = "#c8a97e";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

interface SpaService {
  id: string; name: string; category: string;
  description?: string; duration_min: number; price: number;
  active: boolean; sku?: string; color?: string;
  include_in_pamphlet?: boolean;
  therapists?: string[]; rooms?: string[];
}

const CATEGORIES = ["massage", "facial", "body", "nails", "salon", "package"];

export default function SpaServicesManager() {
  const [services, setServices] = useState<SpaService[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [cat, setCat] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [posQueue, setPosQueue] = useState<any[]>([]);
  const [showQueue, setShowQueue] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/spa-services/`);
      const d = await r.json();
      setServices(d.services || []);
    } catch { /* */ }
    setLoading(false);
  };
  const loadQueue = async () => {
    const r = await fetch(`${API}/api/spa-services/pos/sync-queue`);
    if (r.ok) setPosQueue((await r.json()).items || []);
  };

  useEffect(() => { load(); loadQueue(); }, []);

  const toggle = async (id: string) => {
    setBusyId(id);
    await fetch(`${API}/api/spa-services/${id}/toggle-active`, { method: "POST" });
    await Promise.all([load(), loadQueue()]);
    setBusyId(null);
  };
  const patch = async (id: string, body: Partial<SpaService>) => {
    setBusyId(id);
    await fetch(`${API}/api/spa-services/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await Promise.all([load(), loadQueue()]);
    setBusyId(null);
  };
  const del = async (id: string) => {
    if (!confirm("Delete this service? It will be flagged as deactivated in POS.")) return;
    setBusyId(id);
    await fetch(`${API}/api/spa-services/${id}`, { method: "DELETE" });
    await Promise.all([load(), loadQueue()]);
    setBusyId(null);
  };

  const filtered = services.filter(s =>
    (!cat || s.category === cat) &&
    (!filter || s.name.toLowerCase().includes(filter.toLowerCase()) ||
                (s.sku || "").toLowerCase().includes(filter.toLowerCase()))
  );

  const activeCount = services.filter(s => s.active).length;

  return (
    <div className="h-full flex flex-col" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="spa-services-manager">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>Spa Operations</div>
          <div className="text-[18px] font-semibold text-white mt-0.5">Services</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            {activeCount} active · {services.length - activeCount} inactive · every change auto-syncs to POS
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name / SKU"
            className="px-3 py-1.5 rounded text-[11px] text-white bg-transparent outline-none w-56"
            style={{ border: `1px solid ${BORDER}` }} data-testid="spa-services-filter" />
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="px-3 py-1.5 rounded text-[11px] text-white bg-transparent outline-none"
            style={{ border: `1px solid ${BORDER}`, background: "#0b1020" }}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowQueue(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium"
            style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="spa-services-pos-queue">
            <Wifi className="w-3 h-3" /> POS Queue
            {posQueue.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: ACCENT, color: "#0b1020" }}>{posQueue.length}</span>}
          </button>
          <button onClick={load}
            className="p-1.5 rounded hover:bg-white/[0.05]" title="Reload">
            <RefreshCw className="w-3.5 h-3.5 text-white/50" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-[11px] font-semibold"
            style={{ background: ACCENT, color: "#0b1020" }} data-testid="spa-services-new-btn">
            <Plus className="w-3.5 h-3.5" /> New Service
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && <div className="text-center text-white/40 text-[11px] py-10">Loading…</div>}
        {!loading && filtered.length === 0 && <div className="text-center text-white/30 text-[11px] py-10">No services match.</div>}
        {!loading && filtered.length > 0 && (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10" style={{ background: "#0b1020" }}>
              <tr className="text-left text-white/40 text-[9px] uppercase tracking-wider">
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Duration</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-center">Pamphlet</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t transition-colors hover:bg-white/[0.02]" style={{ borderColor: BORDER }} data-testid={`spa-service-row-${s.id}`}>
                  <td className="px-4 py-2">
                    <button onClick={() => toggle(s.id)} disabled={busyId === s.id}
                      className="p-1 rounded" title={s.active ? "Deactivate" : "Activate"}
                      style={{ background: s.active ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", border: `1px solid ${s.active ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.35)"}` }}
                      data-testid={`spa-service-toggle-${s.id}`}>
                      {busyId === s.id ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Power className="w-3 h-3" style={{ color: s.active ? "#22c55e" : "#ef4444" }} />}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color || ACCENT }} />
                      <input defaultValue={s.name}
                        onBlur={e => e.target.value !== s.name && patch(s.id, { name: e.target.value })}
                        className="bg-transparent outline-none text-white font-medium" />
                    </div>
                    {s.description && <div className="text-[9px] text-white/40 ml-4 truncate max-w-md">{s.description}</div>}
                  </td>
                  <td className="px-4 py-2 font-mono text-white/60 text-[10px]">{s.sku}</td>
                  <td className="px-4 py-2">
                    <select value={s.category} onChange={e => patch(s.id, { category: e.target.value })}
                      className="bg-transparent outline-none text-white/80 text-[10px] uppercase">
                      {CATEGORIES.map(c => <option key={c} value={c} style={{ background: "#0b1020" }}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" defaultValue={s.duration_min}
                      onBlur={e => +e.target.value !== s.duration_min && patch(s.id, { duration_min: +e.target.value })}
                      className="w-16 bg-transparent outline-none text-right text-white/80" />
                    <span className="text-white/30 text-[9px] ml-1">min</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-white/40 text-[9px]">$</span>
                    <input type="number" step="0.01" defaultValue={s.price}
                      onBlur={e => +e.target.value !== s.price && patch(s.id, { price: +e.target.value })}
                      className="w-20 bg-transparent outline-none text-right font-semibold" style={{ color: ACCENT }} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => patch(s.id, { include_in_pamphlet: !s.include_in_pamphlet })}
                      className="p-1 rounded" title="Include in pamphlet">
                      {s.include_in_pamphlet
                        ? <Check className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                        : <X className="w-3.5 h-3.5 text-white/30" />}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => del(s.id)} className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateServiceModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {showQueue && <PosQueueModal items={posQueue} onClose={() => setShowQueue(false)} reload={loadQueue} />}
    </div>
  );
}

function CreateServiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("massage");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState<number | "">(150);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await fetch(`${API}/api/spa-services/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), category, duration_min: duration, price: +price, description: desc }),
    });
    setLoading(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" style={{ background: "rgba(4,6,13,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full max-w-[520px] rounded-xl p-6" style={{ background: "#0b1020", border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()} data-testid="spa-services-create-modal">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>New Service</div>
            <div className="text-[15px] font-semibold text-white mt-0.5">Create Spa Service</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.05]"><X className="w-4 h-4 text-white/50" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Name *</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Signature Lavender Massage"
              className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none" style={{ border: `1px solid ${BORDER}` }}
              data-testid="spa-new-name" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Category</div>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded text-[12px] text-white outline-none" style={{ border: `1px solid ${BORDER}`, background: "#0b1020" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Duration (min)</div>
              <input type="number" value={duration} onChange={e => setDuration(+e.target.value)}
                className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none" style={{ border: `1px solid ${BORDER}` }} />
            </label>
          </div>
          <label className="block">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Price (USD)</div>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value === "" ? "" : +e.target.value)}
              className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none" style={{ border: `1px solid ${BORDER}` }} />
          </label>
          <label className="block">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Description</div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none resize-none" style={{ border: `1px solid ${BORDER}` }} />
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-md text-[11px] font-medium text-white/60"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={submit} disabled={!name.trim() || loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-md text-[11px] font-semibold disabled:opacity-40"
              style={{ background: ACCENT, color: "#0b1020" }} data-testid="spa-new-create-btn">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><Save className="w-3.5 h-3.5" /> Create & Sync to POS</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PosQueueModal({ items, onClose, reload }: { items: any[]; onClose: () => void; reload: () => void }) {
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-end p-0" style={{ background: "rgba(4,6,13,0.72)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="h-full w-[480px] overflow-auto" style={{ background: "#0b1020", borderLeft: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>POS Sync Queue</div>
            <div className="text-[13px] font-semibold text-white mt-0.5">{items.length} pending items</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reload} className="p-1.5 rounded hover:bg-white/[0.05]"><RefreshCw className="w-3.5 h-3.5 text-white/50" /></button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.05]"><X className="w-4 h-4 text-white/50" /></button>
          </div>
        </div>
        {items.length === 0 && <div className="text-center text-white/30 text-[11px] py-10">Queue is empty. All spa services are in sync with POS.</div>}
        {items.map((it, i) => (
          <div key={it.id || i} className="px-5 py-3 border-b" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: it.action === "create" ? "rgba(34,197,94,0.12)" :
                        it.action === "deactivate" ? "rgba(239,68,68,0.12)" :
                        `${ACCENT}12`,
                      color: it.action === "create" ? "#22c55e" :
                        it.action === "deactivate" ? "#ef4444" : ACCENT,
                    }}>
                    {it.action}
                  </span>
                  <span className="text-[12px] text-white font-medium">{it.name}</span>
                </div>
                <div className="text-[9px] text-white/40 font-mono mt-1">{it.sku} · ${it.price}</div>
              </div>
              <div className="text-[9px] font-mono text-white/30 uppercase">{it.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
