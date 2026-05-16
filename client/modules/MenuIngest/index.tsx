/**
 * Menu Ingest - Seasonal PDF Menu Ingestion & Management
 * Upload PDFs, AI-parse into structured menu items, manage seasons.
 * Connects to /api/menu-ingest/* endpoints.
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  FileUp,
  Plus,
  Loader2,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  Download,
  Sparkles,
  BookOpen,
  Tag,
  DollarSign,
  Utensils,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/glass";

const API = "";

async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}/api/menu-ingest${path}`, {
    headers: opts?.body instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// ─── Season Card ───────────────────────────────────────────────────
function SeasonCard({ season, active, onClick }: { season: any; active: boolean; onClick: () => void }) {
  return (
    <button data-testid={`season-${season.season_id}`} onClick={onClick}
      className={cn("w-full text-left rounded-lg p-3 transition-all border",
        active ? "bg-cyan-500/15 border-cyan-500/40 shadow-lg shadow-cyan-500/5" : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">{season.name}</span>
        {season.active && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 rounded-full px-1.5 py-0.5">ACTIVE</span>}
      </div>
      <div className="text-xs text-slate-400 mt-1">{season.year} {season.quarter} | {season.item_count || 0} items</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{season.documents?.length || 0} documents uploaded</div>
    </button>
  );
}

// ─── Item Row ──────────────────────────────────────────────────────
function ItemRow({ item, onUpdate }: { item: any; onUpdate: (id: string, data: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(item.price_pp ?? "");

  const savePrice = () => {
    onUpdate(item.item_id, { price_pp: price === "" ? null : Number(price) });
    setEditing(false);
  };

  return (
    <tr data-testid={`menu-item-${item.item_id}`} className="border-b border-slate-700/30 hover:bg-slate-800/30 text-sm">
      <td className="py-2 px-3 text-slate-200">{item.item_name}</td>
      <td className="py-2 px-3 text-slate-400">{item.category}</td>
      <td className="py-2 px-3 text-slate-400">{item.subcategory}</td>
      <td className="py-2 px-3 text-slate-400">{item.service_style}</td>
      <td className="py-2 px-3">
        {editing ? (
          <div className="flex items-center gap-1">
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-16 bg-slate-700 text-slate-200 rounded px-1 py-0.5 text-xs" autoFocus />
            <button onClick={savePrice} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3 h-3" /></button>
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-300"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-slate-300 hover:text-cyan-300 flex items-center gap-1">
            {item.price_pp != null ? `$${item.price_pp}` : "—"}
            <Pencil className="w-2.5 h-2.5 opacity-50" />
          </button>
        )}
      </td>
      <td className="py-2 px-3">{item.price_unit}</td>
      <td className="py-2 px-3">
        <div className="flex flex-wrap gap-0.5">
          {(item.dietary_tags || []).map((t: string) => (
            <span key={t} className="text-[9px] bg-emerald-500/15 text-emerald-300 rounded px-1 py-0">{t}</span>
          ))}
        </div>
      </td>
      <td className="py-2 px-3">{item.is_premium && <Tag className="w-3 h-3 text-amber-400" />}</td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function MenuIngest() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonYear, setNewSeasonYear] = useState(2026);
  const [newSeasonQuarter, setNewSeasonQuarter] = useState("Q1");
  const [filterCat, setFilterCat] = useState("");
  const [filterStyle, setFilterStyle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadSeasons = useCallback(async () => {
    const d = await api("/seasons");
    setSeasons(d.seasons || []);
  }, []);

  const loadSeason = useCallback(async (seasonId: string) => {
    const d = await api(`/seasons/${seasonId}`);
    setActiveSeason(d);
    setItems(d.items || []);
    const u = await api(`/uploads/${seasonId}`);
    setUploads(u.uploads || []);
    const c = await api(`/categories/${seasonId}`);
    setCategories(c.categories || []);
  }, []);

  useEffect(() => { loadSeasons(); }, [loadSeasons]);

  const createSeason = async () => {
    if (!newSeasonName) return;
    setLoading(true);
    const s = await api("/seasons", { method: "POST", body: JSON.stringify({ name: newSeasonName, year: newSeasonYear, quarter: newSeasonQuarter }) });
    setShowNewSeason(false);
    setNewSeasonName("");
    await loadSeasons();
    loadSeason(s.season_id);
    setLoading(false);
  };

  const uploadPdf = async (file: File) => {
    if (!activeSeason) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    await api(`/upload/${activeSeason.season_id}`, { method: "POST", body: fd, headers: undefined as any });
    const u = await api(`/uploads/${activeSeason.season_id}`);
    setUploads(u.uploads || []);
    setUploading(false);
  };

  const parsePdf = async (uploadId: string) => {
    setParsing(uploadId);
    await api(`/parse/${uploadId}`, { method: "POST" });
    if (activeSeason) await loadSeason(activeSeason.season_id);
    setParsing(null);
  };

  const updateItem = async (itemId: string, data: any) => {
    await api(`/items/${itemId}`, { method: "PUT", body: JSON.stringify(data) });
    if (activeSeason) await loadSeason(activeSeason.season_id);
  };

  const filteredItems = items.filter(i => {
    if (filterCat && i.category !== filterCat) return false;
    if (filterStyle && i.service_style !== filterStyle) return false;
    if (searchQuery && !i.item_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const allCategories = [...new Set(items.map(i => i.category))].sort();
  const allStyles = [...new Set(items.map(i => i.service_style))].sort();

  return (
    <div data-testid="menu-ingest-panel" className="h-full flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700/60 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" /> Seasonal Menu Ingestion
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Upload banquet menu PDFs, AI-parse into structured items, manage pricing across seasons</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Seasons */}
        <div className="w-64 flex-shrink-0 border-r border-slate-700/60 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Seasons</span>
            <button data-testid="new-season-btn" onClick={() => setShowNewSeason(true)} className="text-cyan-400 hover:text-cyan-300"><Plus className="w-4 h-4" /></button>
          </div>

          {showNewSeason && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 mb-3 space-y-2">
              <input placeholder="Season name" value={newSeasonName} onChange={e => setNewSeasonName(e.target.value)}
                className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={newSeasonYear} onChange={e => setNewSeasonYear(+e.target.value)} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" />
                <select value={newSeasonQuarter} onChange={e => setNewSeasonQuarter(e.target.value)} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
                  {["Q1","Q2","Q3","Q4"].map(q => <option key={q}>{q}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createSeason} disabled={loading} className="flex-1 bg-cyan-600/30 text-cyan-300 rounded py-1 text-xs hover:bg-cyan-600/40">Create</button>
                <button onClick={() => setShowNewSeason(false)} className="flex-1 bg-slate-700/40 text-slate-400 rounded py-1 text-xs hover:bg-slate-700/60">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {seasons.map(s => (
              <SeasonCard key={s.season_id} season={s} active={activeSeason?.season_id === s.season_id} onClick={() => loadSeason(s.season_id)} />
            ))}
            {seasons.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No seasons yet. Create one to start.</div>}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeSeason ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <div className="text-sm">Select or create a season to begin</div>
              </div>
            </div>
          ) : (
            <>
              {/* Season Header + Upload */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700/40 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{activeSeason.name}</div>
                  <div className="text-xs text-slate-400">{activeSeason.year} {activeSeason.quarter} | {items.length} items | {uploads.length} documents</div>
                </div>
                <label data-testid="upload-pdf-btn" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors",
                  uploading ? "bg-slate-700/50 text-slate-400" : "bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30")}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                  {uploading ? "Uploading..." : "Upload PDF Menu"}
                  <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && uploadPdf(e.target.files[0])} disabled={uploading} />
                </label>
              </div>

              {/* Uploads list */}
              {uploads.length > 0 && (
                <div className="flex-shrink-0 px-6 py-3 border-b border-slate-700/30 flex gap-2 overflow-x-auto">
                  {uploads.map(u => (
                    <div key={u.upload_id} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2 text-xs flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-300">{u.filename}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px]",
                        u.status === "parsed" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300")}>{u.status}</span>
                      {u.status !== "parsed" && (
                        <button data-testid={`parse-${u.upload_id}`} onClick={() => parsePdf(u.upload_id)} disabled={parsing === u.upload_id}
                          className="flex items-center gap-1 px-2 py-0.5 bg-violet-600/20 text-violet-300 rounded hover:bg-violet-600/30">
                          {parsing === u.upload_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI Parse
                        </button>
                      )}
                      {u.status === "parsed" && <span className="text-slate-500">{u.parsed_items} items</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Category Summary */}
              {categories.length > 0 && (
                <div className="flex-shrink-0 px-6 py-3 border-b border-slate-700/30">
                  <div className="flex gap-2 overflow-x-auto">
                    {categories.map(c => (
                      <button key={c.category} onClick={() => setFilterCat(filterCat === c.category ? "" : c.category)}
                        className={cn("flex-shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-colors",
                          filterCat === c.category ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300" : "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:border-slate-600")}>
                        <span className="font-semibold">{c.category}</span>
                        <span className="ml-1 text-slate-500">{c.item_count}</span>
                        {c.avg_price_pp > 0 && <span className="ml-1 text-emerald-400">${c.avg_price_pp}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex-shrink-0 px-6 py-2 flex items-center gap-3 border-b border-slate-700/20">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-800/40 text-sm text-slate-200 rounded border border-slate-700/40" />
                </div>
                <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)} className="bg-slate-800/40 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-700/40">
                  <option value="">All Styles</option>
                  {allStyles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-xs text-slate-500">{filteredItems.length} of {items.length}</span>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-auto px-6">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                    Upload a PDF menu and click "AI Parse" to extract items
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-900 z-10">
                      <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase">
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Sub</th>
                        <th className="py-2 px-3">Style</th>
                        <th className="py-2 px-3">Price/pp</th>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3">Tags</th>
                        <th className="py-2 px-3">Prem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => <ItemRow key={item.item_id} item={item} onUpdate={updateItem} />)}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
