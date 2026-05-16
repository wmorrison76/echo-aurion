import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Filter, Grid, List, Plus, Calendar, Tag, Heart,
  Download, Share2, Eye, ChefHat, Upload, Trash2, Printer,
  FileDown, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** ---------- Types (JS doc for intellisense) ---------- */
/**
 * @typedef {"Easy"|"Medium"|"Hard"} Difficulty
 * @typedef {Object} PastryItem
 * @property {string} id
 * @property {string} name
 * @property {string} image     // data URL or remote URL
 * @property {string} category
 * @property {string=} customCategory
 * @property {string} timestamp // ISO string
 * @property {string[]} tags
 * @property {string} chef
 * @property {Difficulty} difficulty
 * @property {string} prepTime
 * @property {boolean} liked
 * @property {number} views
 */

/** ---------- Storage helpers ---------- */
const LSK = "lu:pastry:gallery:v1";

function loadItems() {
  try { return JSON.parse(localStorage.getItem(LSK) || "[]"); } catch { return []; }
}
function saveItems(items) {
  localStorage.setItem(LSK, JSON.stringify(items));
}

/** Quick printable window */
function openPrintWindow(html) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
  if (!w) return;
  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>Pastry Gallery Export</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 16px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .item { border: 1px solid #e5e7eb; padding: 12px; border-radius: 10px; }
          img { width: 100%; height: auto; border-radius: 8px; }
          h3 { margin: 8px 0 4px; }
          .meta { color: #6b7280; font-size: 12px; }
          @media print {
            .grid { grid-template-columns: repeat(3, 1fr); }
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  w.document.close();
  // Give images a tick to load before print
  setTimeout(() => w.print(), 350);
}

/** Build a simple Word (.doc) file from HTML (works offline; not a true .docx) */
function downloadDoc(html, filename = "pastry-gallery.doc") {
  const blob = new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>', html, "</body></html>"], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Image -> dataURL */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** ---------- Component ---------- */
/**
 * Props:
 * - isDarkMode?: boolean (optional; otherwise reads from document.documentElement.classList.contains("dark"))
 * - onAttachToServerNotes?: (items: PastryItem[]) => void  // optional hook for Server Notes
 */
export default function PastryGallery({ isDarkMode, onAttachToServerNotes }) {
  // Mode: prefer prop, else infer from html.dark
  const [dark, setDark] = useState(() =>
    typeof isDarkMode === "boolean" ? isDarkMode : document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    if (typeof isDarkMode === "boolean") { setDark(isDarkMode); return; }
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [isDarkMode]);

  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [items, setItems] = useState(() => {
    const existing = loadItems();
    if (existing.length) return existing;
    // Seed with your mock data once
    const seed = getMockData();
    saveItems(seed);
    return seed;
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Persist
  useEffect(() => saveItems(items), [items]);

  // Panel-fit wrapper (no min-h-screen; scroll inside the panel body)
  // header is sticky to top of panel
  const containerClass = useMemo(() => {
    return [
      "h-full w-full overflow-auto transition-all duration-300",
      dark
        ? "bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-cyan-50"
        : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900"
    ].join(" ");
  }, [dark]);

  const categories = useMemo(() => {
    const base = [
      "All", "Cakes", "Cookies", "Pastries", "Breads", "Tarts",
      "Macarons", "Chocolates", "Desserts", "Specialty", "Seasonal"
    ];
    const customs = Array.from(new Set(items.map(i => i.customCategory).filter(Boolean)));
    return base.concat(customs);
  }, [items]);

  const filtered = items.filter(i => {
    const q = searchTerm.trim().toLowerCase();
    const matchesQ =
      !q ||
      i.name.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q)) ||
      i.chef.toLowerCase().includes(q);
    const cat = selectedCategory;
    const matchesCat = cat === "All" || i.category === cat || i.customCategory === cat;
    return matchesQ && matchesCat;
  });

  const toggleLike = (id) => setItems(arr => arr.map(i => i.id === id ? { ...i, liked: !i.liked } : i));
  const toggleSelect = (id) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());

  const onFilesChosen = async (files) => {
    const toAdd = [];
    for (const file of files) {
      try {
        const dataUrl = await fileToDataURL(file);
        const now = new Date();
        toAdd.push({
          id: "p-" + Math.random().toString(36).slice(2, 8),
          name: file.name.replace(/\.[^.]+$/, ""),
          image: dataUrl,
          category: "Specialty",
          customCategory: "",
          timestamp: now.toISOString(),
          tags: [],
          chef: "Unknown",
          difficulty: "Easy",
          prepTime: "-",
          liked: false,
          views: 0,
        });
      } catch { /* ignore this file */ }
    }
    if (toAdd.length) setItems(arr => toAdd.concat(arr));
  };

  const fileInputRef = useRef(null);

  /** -------- Export / Print / Word -------- */
  const selectedOrAll = () => (selectedIds.size ? filtered.filter(i => selectedIds.has(i.id)) : filtered);

  const buildExportHTML = (list) => `
    <h2>Pastry Gallery Export (${list.length} items)</h2>
    <div class="grid">
      ${list.map(i => `
        <div class="item">
          <img src="${i.image}" alt="${escapeHtml(i.name)}" />
          <h3>${escapeHtml(i.name)}</h3>
          <div class="meta">${escapeHtml(i.chef)} • ${escapeHtml(i.prepTime)}</div>
          <div class="meta">${new Date(i.timestamp).toLocaleString()}</div>
          <div class="meta">${escapeHtml(i.category)} ${i.customCategory ? "(" + escapeHtml(i.customCategory) + ")" : ""}</div>
          ${i.tags?.length ? `<div class="meta">tags: ${i.tags.map(escapeHtml).join(", ")}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;

  const onPrint = () => {
    const html = buildExportHTML(selectedOrAll());
    openPrintWindow(html);
  };

  const onExportPDF = () => {
    // Use the print-HTML into a new window and ask user to "Save as PDF" in print dialog.
    const html = buildExportHTML(selectedOrAll());
    openPrintWindow(html);
  };

  const onExportDoc = () => {
    const html = buildExportHTML(selectedOrAll());
    downloadDoc(html, "pastry-gallery.doc");
  };

  const onShareToServerNotes = () => {
    const list = selectedOrAll();
    // Hook: call prop if provided
    if (typeof onAttachToServerNotes === "function") onAttachToServerNotes(list);
    // Also broadcast a CustomEvent so other modules can catch it.
    window.dispatchEvent(new CustomEvent("server-notes-attach", { detail: { items: list, source: "PastryGallery" } }));
  };

  const removeSelected = () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Remove ${selectedIds.size} item(s) from gallery?`)) return;
    setItems(arr => arr.filter(i => !selectedIds.has(i.id)));
    clearSelection();
  };

  /** Panel header (sticky) */
  return (
    <div className={containerClass}>
      <div className={[
        "sticky top-0 z-20 backdrop-blur-xl border-b",
        dark
          ? "bg-slate-900/80 border-cyan-500/30 shadow-[0_8px_32px_rgba(22,224,255,0.12)]"
          : "bg-white/80 border-slate-200/70 shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
      ].join(" ")}>
        <div className="px-4 sm:px-6 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className={[
                "p-2 rounded-xl border",
                dark
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/30"
                  : "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-200"
              ].join(" ")}>
                <ChefHat className={dark ? "w-6 h-6 text-cyan-400" : "w-6 h-6 text-blue-600"} />
              </div>
              <div>
                <h1 className={dark
                  ? "text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
                  : "text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                }>
                  Pastry Gallery
                </h1>
                <p className={dark ? "text-cyan-300/70 text-sm" : "text-slate-600 text-sm"}>
                  {filtered.length} item{filtered.length !== 1 ? "s" : ""} • {selectedIds.size} selected
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className={["absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                  dark ? "text-cyan-400/70" : "text-slate-400"].join(" ")} />
                <input
                  className={[
                    "pl-10 pr-3 py-2 rounded-lg border w-64",
                    dark
                      ? "bg-slate-800/60 border-cyan-400/30 text-cyan-100 placeholder-cyan-400/60"
                      : "bg-white/80 border-slate-200 text-slate-900 placeholder-slate-500"
                  ].join(" ")}
                  placeholder="Search pastries, tags, chefs…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className={dark ? "w-4 h-4 text-cyan-400" : "w-4 h-4 text-slate-600"} />
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className={[
                    "px-3 py-2 rounded-lg border",
                    dark
                      ? "bg-slate-800/60 border-cyan-400/30 text-cyan-100"
                      : "bg-white/80 border-slate-200 text-slate-900"
                  ].join(" ")}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomCategory(v => !v)}
                  className={dark ? "border-cyan-400/30 text-cyan-300" : "border-slate-200 text-slate-700"}
                >
                  <Plus className="w-4 h-4 mr-1" /> Custom
                </Button>
              </div>

              <div className="w-px h-6 bg-black/10 dark:bg-white/20 mx-1" />

              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
                className={dark ? "bg-cyan-600/20 text-cyan-300 border-cyan-400/30" : ""}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
                className={dark ? "bg-cyan-600/20 text-cyan-300 border-cyan-400/30" : ""}
              >
                <List className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-black/10 dark:bg-white/20 mx-1" />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const f = e.target.files;
                  if (f && f.length) onFilesChosen(f);
                  e.target.value = "";
                }}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> Upload
              </Button>
              <Button variant="outline" onClick={removeSelected} disabled={!selectedIds.size}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>

              <div className="w-px h-6 bg-black/10 dark:bg-white/20 mx-1" />

              <Button variant="outline" onClick={onPrint}><Printer className="w-4 h-4 mr-1" /> Print</Button>
              <Button variant="outline" onClick={onExportPDF}><FileDown className="w-4 h-4 mr-1" /> PDF</Button>
              <Button variant="outline" onClick={onExportDoc}><FileText className="w-4 h-4 mr-1" /> Word</Button>

              <Button variant="secondary" onClick={onShareToServerNotes}>
                Share to Server Notes
              </Button>
            </div>
          </div>

          {showCustomCategory && (
            <div className="mt-3 flex items-center gap-2">
              <input
                className={[
                  "px-3 py-2 rounded-lg border w-72",
                  dark
                    ? "bg-slate-800/60 border-cyan-400/30 text-cyan-100"
                    : "bg-white/80 border-slate-200 text-slate-900"
                ].join(" ")}
                placeholder="New category name…"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (!customCategory.trim()) return;
                  setSelectedCategory(customCategory.trim());
                  setShowCustomCategory(false);
                  setCustomCategory("");
                }}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 sm:px-6 py-4">
        {filtered.length === 0 ? (
          <EmptyState dark={dark} />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filtered.map(item => (
              <GalleryCard
                key={item.id}
                item={item}
                dark={dark}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onToggleLike={() => toggleLike(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <ListRow
                key={item.id}
                item={item}
                dark={dark}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onToggleLike={() => toggleLike(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** ---------- Presentational bits ---------- */

function GalleryCard({ item, dark, selected, onToggleSelect, onToggleLike }) {
  const ts = new Date(item.timestamp);
  return (
    <Card className={[
      "group overflow-hidden border transition-all duration-200",
      dark
        ? "bg-slate-800/40 border-cyan-400/20 hover:border-cyan-400/40 shadow-[0_8px_32px_rgba(22,224,255,0.08)] hover:shadow-[0_16px_48px_rgba(22,224,255,0.18)]"
        : "bg-white/80 border-slate-200 hover:border-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.10)]",
      selected ? (dark ? "ring-2 ring-cyan-400/60" : "ring-2 ring-blue-400/50") : ""
    ].join(" ")}>
      <div className="relative aspect-square overflow-hidden">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className={[
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          dark ? "bg-gradient-to-t from-slate-950/80 via-transparent" : "bg-gradient-to-t from-black/60 via-transparent"
        ].join(" ")} />
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="w-4 h-4 accent-cyan-500"
            title="Select"
          />
          <Badge variant={item.difficulty === "Easy" ? "secondary" : item.difficulty === "Medium" ? "default" : "destructive"}>
            {item.difficulty}
          </Badge>
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onToggleLike}
            className={dark ? "bg-slate-800/80 border-cyan-400/30" : "bg-white/80 border-slate-200"}>
            <Heart className={`w-4 h-4 ${item.liked ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <div className="flex items-center gap-1 text-xs">
            <Eye className="w-4 h-4" />
            {item.views}
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between">
          <h3 className={dark ? "font-semibold text-cyan-100" : "font-semibold text-slate-900"}>{item.name}</h3>
          <span className={dark ? "text-cyan-300/70 text-xs" : "text-slate-500 text-xs"}>
            {ts.toLocaleDateString()} {ts.toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}
          </span>
        </div>
        <div className={dark ? "text-cyan-300/70 text-sm mt-1" : "text-slate-600 text-sm mt-1"}>
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4" /> {item.chef} • {item.prepTime}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.slice(0, 3).map(t =>
            <Badge key={t} variant="secondary"
              className={dark ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-xs" : "bg-blue-50 text-blue-700 border-blue-200 text-xs"}>
              {t}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

function ListRow({ item, dark, selected, onToggleSelect, onToggleLike }) {
  const ts = new Date(item.timestamp);
  return (
    <Card className={[
      "overflow-hidden border transition-all duration-200",
      dark
        ? "bg-slate-800/40 border-cyan-400/20 hover:border-cyan-400/40"
        : "bg-white/80 border-slate-200 hover:border-slate-300",
      selected ? (dark ? "ring-2 ring-cyan-400/60" : "ring-2 ring-blue-400/50") : ""
    ].join(" ")}>
      <div className="flex items-center gap-3 p-3">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-4 h-4 accent-cyan-500" title="Select" />
        <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={dark ? "font-semibold text-cyan-100 truncate" : "font-semibold text-slate-900 truncate"}>{item.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant={item.difficulty === "Easy" ? "secondary" : item.difficulty === "Medium" ? "default" : "destructive"}>
                {item.difficulty}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onToggleLike}><Heart className={`w-4 h-4 ${item.liked ? "fill-red-500 text-red-500" : ""}`} /></Button>
            </div>
          </div>
          <div className={dark ? "text-cyan-300/70 text-sm" : "text-slate-600 text-sm"}>
            <ChefHat className="w-4 h-4 inline mr-1" />{item.chef} • {item.prepTime}
          </div>
          <div className={dark ? "text-cyan-400/70 text-xs" : "text-slate-500 text-xs"}>
            <Calendar className="w-3 h-3 inline mr-1" />
            {ts.toLocaleDateString()} {ts.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.map(t =>
              <Badge key={t} variant="secondary"
                className={dark ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-[11px]" : "bg-blue-50 text-blue-700 border-blue-200 text-[11px]"}>
                <Tag className="w-3 h-3 mr-1 inline" /> {t}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm opacity-80">
          <Eye className="w-4 h-4" /> {item.views}
          <Download className="w-4 h-4 ml-2" title="(demo) Download image" onClick={() => downloadImage(item)} />
          <Share2 className="w-4 h-4" title="(demo) Share" />
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ dark }) {
  return (
    <div className={dark ? "text-cyan-300/70 text-center py-16" : "text-slate-500 text-center py-16"}>
      <ChefHat className={dark ? "w-16 h-16 mx-auto mb-3 text-cyan-400/60" : "w-16 h-16 mx-auto mb-3 text-slate-300"} />
      <h3 className={dark ? "text-cyan-100 text-xl font-semibold" : "text-slate-700 text-xl font-semibold"}>No pastries yet</h3>
      <p>Upload images to get started or change your filters.</p>
    </div>
  );
}

/** ---------- Utils ---------- */
function downloadImage(item) {
  // For data URLs, just force download; for remote URLs you'd fetch-blob.
  const a = document.createElement("a");
  a.href = item.image;
  a.download = (item.name || "image") + ".png";
  a.click();
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

/** Seed data you provided (timestamps -> ISO) */
function getMockData() {
  return [
    {
      id: "1",
      name: "Chocolate Ganache Tart",
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800",
      category: "Tarts",
      timestamp: new Date("2024-01-15T10:30:00").toISOString(),
      tags: ["chocolate","rich","elegant"],
      chef: "Chef Laurent",
      difficulty: "Medium",
      prepTime: "2h 30m",
      liked: true,
      views: 245
    },
    {
      id: "2",
      name: "French Macarons",
      image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800",
      category: "Macarons",
      timestamp: new Date("2024-01-14T14:15:00").toISOString(),
      tags: ["colorful","delicate","french"],
      chef: "Chef Marie",
      difficulty: "Hard",
      prepTime: "4h 15m",
      liked: false,
      views: 189
    },
    {
      id: "3",
      name: "Artisan Sourdough",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
      category: "Breads",
      timestamp: new Date("2024-01-13T08:45:00").toISOString(),
      tags: ["artisan","sourdough","rustic"],
      chef: "Chef Antonio",
      difficulty: "Medium",
      prepTime: "18h total",
      liked: true,
      views: 156
    },
    {
      id: "4",
      name: "Vanilla Bean Crème Brûlée",
      image: "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800",
      category: "Desserts",
      timestamp: new Date("2024-01-12T16:20:00").toISOString(),
      tags: ["vanilla","custard","torched"],
      chef: "Chef Isabella",
      difficulty: "Easy",
      prepTime: "3h 45m",
      liked: true,
      views: 298
    },
    {
      id: "5",
      name: "Red Velvet Cupcakes",
      image: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800",
      category: "Cakes",
      timestamp: new Date("2024-01-11T11:30:00").toISOString(),
      tags: ["red velvet","cupcakes","cream cheese"],
      chef: "Chef Sarah",
      difficulty: "Easy",
      prepTime: "1h 45m",
      liked: false,
      views: 203
    },
    {
      id: "6",
      name: "Chocolate Chip Cookies",
      image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800",
      category: "Cookies",
      timestamp: new Date("2024-01-10T13:15:00").toISOString(),
      tags: ["classic","chocolate chip","comfort"],
      chef: "Chef David",
      difficulty: "Easy",
      prepTime: "45m",
      liked: true,
      views: 412
    }
  ];
}
