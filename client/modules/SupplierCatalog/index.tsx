import React, { useState, useEffect, useCallback, useMemo } from "react";

const BACKEND = window.location.origin;
async function fetchApi(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { "Content-Type": "application/json", ...((opts.headers as Record<string, string>) || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

interface Supplier { id: string; name: string; code: string; items: number; status: string; last_sync: string; contract_tier: string }
interface Product { sku: string; name: string; brand: string; category: string; pack_size: string; unit: string; price: number; par_unit: string; min_order: number; lead_days: number; supplier?: string }

type SortKey = "name" | "price" | "supplier" | "lead_days" | "category";

export default function SupplierCatalogPanel() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [activeSupplier, setActiveSupplier] = useState("all");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [tab, setTab] = useState<"catalog" | "compare">("catalog");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Product | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const loadSelections = useCallback(async () => {
    try {
      const d = await fetchApi("/api/supplier-catalog/vendor-selections");
      const map: Record<string, string> = {};
      (d.selections || []).forEach((s: any) => { map[s.sku] = s.supplier_id; });
      setSelections(map);
    } catch {}
  }, []);

  useEffect(() => {
    fetchApi("/api/supplier-catalog/suppliers").then(d => setSuppliers(d.suppliers || [])).catch(() => {});
    fetchApi("/api/supplier-catalog/search").then(d => setProducts(d.results || [])).catch(() => {});
    loadSelections();
  }, [loadSelections]);

  const search = useCallback(async (q?: string) => {
    const s = q !== undefined ? q : query;
    const res = await fetchApi(`/api/supplier-catalog/search?q=${encodeURIComponent(s)}&supplier=${activeSupplier}`);
    setProducts(res.results || []);
  }, [query, activeSupplier]);

  const triggerSync = async (supplierId: string) => {
    setSyncing(supplierId);
    try {
      await fetchApi("/api/supplier-catalog/sync", { method: "POST", body: JSON.stringify({ supplier_id: supplierId, sync_type: "full" }) });
      await search();
    } finally { setSyncing(null); }
  };

  const comparePrices = async () => {
    if (!query.trim()) return;
    const res = await fetchApi("/api/supplier-catalog/compare", { method: "POST", body: JSON.stringify({ item_name: query }) });
    setCompareResult(res);
    setTab("compare");
  };

  const sorted = useMemo(() => {
    const arr = [...products];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a: any, b: any) => {
      const x = a[sortKey], y = b[sortKey];
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x ?? "").localeCompare(String(y ?? "")) * dir;
    });
    return arr;
  }, [products, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <div data-testid="supplier-catalog-panel" className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(16,185,129,0.25)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide">Supplier Catalog · Deep Dive</div>
            <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Vendor selection · Pricing history · Outlet usage</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {suppliers.map(s => (
            <button key={s.id} data-testid={`sync-${s.id}`} onClick={() => triggerSync(s.id)} disabled={syncing === s.id}
              className="px-3 py-1.5 rounded-md text-[11px] font-mono border transition-all disabled:opacity-50" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)", color: "#6ee7b7" }}>
              {syncing === s.id ? "Syncing..." : `Sync ${s.code}`}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier Cards */}
      <div className="flex gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {suppliers.map(s => (
          <div key={s.id} data-testid={`supplier-card-${s.id}`} onClick={() => { setActiveSupplier(s.id); search(); }}
            className="flex-1 p-3 rounded-lg border cursor-pointer transition-all hover:-translate-y-px" style={{ background: activeSupplier === s.id ? "rgba(16,185,129,0.08)" : "#1a1f2e", borderColor: activeSupplier === s.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">{s.name}</span>
              <span className="w-2 h-2 rounded-full" style={{ background: s.status === "connected" ? "#10b981" : "#ef4444" }} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500">{s.items} products</span>
              <span className="text-[10px] font-mono text-emerald-400">{s.contract_tier}</span>
            </div>
          </div>
        ))}
        <div onClick={() => { setActiveSupplier("all"); search(); }}
          className="flex-1 p-3 rounded-lg border cursor-pointer transition-all hover:-translate-y-px flex items-center justify-center" style={{ background: activeSupplier === "all" ? "rgba(59,130,246,0.08)" : "#1a1f2e", borderColor: activeSupplier === "all" ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.05)" }}>
          <span className="text-xs font-medium text-slate-400">All Suppliers</span>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <input data-testid="supplier-search" type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") search(); }}
          className="flex-1 bg-transparent border rounded-md px-3 py-1.5 text-sm text-white outline-none font-mono placeholder:text-slate-600" style={{ borderColor: "rgba(255,255,255,0.08)" }}
          placeholder="Search products (e.g. salmon, truffle, flour)..." />
        <button onClick={() => search()} data-testid="supplier-search-btn" className="px-3 py-1.5 rounded-md text-[11px] font-mono border" style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.25)", color: "#93c5fd" }}>Search</button>
        <button onClick={comparePrices} data-testid="supplier-compare-btn" className="px-3 py-1.5 rounded-md text-[11px] font-mono border" style={{ background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.25)", color: "#fbbf24" }}>Compare</button>
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {(["catalog", "compare"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} data-testid={`supplier-tab-${t}`} className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors"
              style={{ background: tab === t ? "rgba(59,130,246,0.15)" : "transparent", color: tab === t ? "#93c5fd" : "#64748b" }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#2a3348 transparent" }}>
        {tab === "catalog" && (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_120px_100px_80px_90px_60px_70px] gap-2 px-3 py-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-wider">
              <SortHeader label="Product" k="name" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
              <span>Pack Size</span>
              <SortHeader label="Category" k="category" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Price" k="price" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Supplier" k="supplier" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Lead" k="lead_days" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
              <span className="text-right">Selected</span>
            </div>
            {sorted.map((p, i) => (
              <div
                key={`${p.sku}-${i}`}
                data-testid={`product-row-${p.sku}`}
                onClick={() => setSelected(p)}
                className="grid grid-cols-[1fr_120px_100px_80px_90px_60px_70px] gap-2 px-3 py-2 rounded-md border transition-colors hover:border-amber-400/40 hover:bg-amber-400/5 cursor-pointer"
                style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.03)" }}>
                <div>
                  <div className="text-xs text-white font-medium">{p.name}</div>
                  <div className="text-[9px] font-mono text-slate-500">{p.sku} · {p.brand}</div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 self-center">{p.pack_size}</span>
                <span className="text-[10px] text-slate-500 self-center">{p.category.split(" - ")[1] || p.category}</span>
                <span className="text-[11px] font-mono font-semibold text-emerald-400 self-center">${p.price.toFixed(2)}</span>
                <span className="text-[10px] font-mono self-center" style={{ color: p.supplier === "Sysco" ? "#06b6d4" : "#a78bfa" }}>{p.supplier || "—"}</span>
                <span className="text-[10px] font-mono text-slate-500 self-center">{p.lead_days}d</span>
                <span className="text-[10px] font-mono self-center text-right">
                  {selections[p.sku] && (
                    <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }} data-testid={`selected-${p.sku}`}>
                      ✓ {selections[p.sku] === "sysco" ? "SYS" : "USF"}
                    </span>
                  )}
                </span>
              </div>
            ))}
            {sorted.length === 0 && <div className="text-center text-sm text-slate-600 py-8">No products found</div>}
          </div>
        )}
        {tab === "compare" && compareResult && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 mb-2">Price comparison for: <span className="text-white font-medium">{compareResult.query}</span></div>
            {compareResult.best_value && (
              <div className="p-3 rounded-lg border" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}>
                <div className="text-[9px] font-mono text-emerald-400 tracking-wider mb-1">BEST VALUE</div>
                <div className="text-sm text-white font-semibold">{compareResult.best_value.supplier} — ${compareResult.best_value.price.toFixed(2)}</div>
              </div>
            )}
            {(compareResult.matches || []).map((m: Product, i: number) => (
              <div key={i} onClick={() => setSelected(m)} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:border-amber-400/40" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
                <div>
                  <div className="text-xs text-white">{m.name}</div>
                  <div className="text-[9px] font-mono text-slate-500">{m.sku} · {m.pack_size}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-cyan-400">${m.price.toFixed(2)}</div>
                  <div className="text-[9px] font-mono" style={{ color: m.supplier === "Sysco" ? "#06b6d4" : "#a78bfa" }}>{m.supplier}</div>
                </div>
              </div>
            ))}
            {(compareResult.matches || []).length === 0 && <div className="text-center text-sm text-slate-600 py-8">No matching products found</div>}
          </div>
        )}
      </div>

      {selected && (
        <SupplierDeepDive
          product={selected}
          onClose={() => setSelected(null)}
          onVendorSelect={async (supplier_id) => {
            await fetchApi("/api/supplier-catalog/select-vendor", {
              method: "POST",
              body: JSON.stringify({ sku: selected.sku, supplier_id, note: "Selected from Deep Dive" }),
            }).catch(() => {});
            await loadSelections();
          }}
        />
      )}
    </div>
  );
}

function SortHeader({ label, k, sortKey, dir, onClick }: { label: string; k: SortKey; sortKey: SortKey; dir: "asc" | "desc"; onClick: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <button
      data-testid={`supplier-sort-${k}`}
      onClick={() => onClick(k)}
      className="text-left cursor-pointer hover:text-white transition-colors"
      style={{ color: active ? "#c8a97e" : undefined, background: "transparent", border: 0, padding: 0, fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}
    >
      {label}{active ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

function SupplierDeepDive({ product, onClose, onVendorSelect }: { product: Product; onClose: () => void; onVendorSelect: (sid: string) => void }) {
  const [hist, setHist] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchApi(`/api/supplier-catalog/price-history/${product.sku}`).catch(() => null),
      fetchApi(`/api/supplier-catalog/outlet-usage/${product.sku}`).catch(() => null),
    ]).then(([h, u]) => { setHist(h); setUsage(u); setLoading(false); });
  }, [product.sku]);

  return (
    <div
      data-testid="supplier-deep-dive"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 2147483400, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border shadow-2xl overflow-hidden"
        style={{ width: "min(880px, 96vw)", maxHeight: "92vh", background: "#0b1020", borderColor: "rgba(200,169,126,0.3)", display: "flex", flexDirection: "column" }}
      >
        <div className="px-5 py-4 border-b flex items-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <div className="text-xs font-mono tracking-widest text-amber-300/80 uppercase">Supplier Deep Dive</div>
            <div className="text-base text-white font-semibold">{product.name}</div>
            <div className="text-[10px] font-mono text-slate-500">{product.sku} · {product.brand} · {product.pack_size} · ${product.price.toFixed(2)} / {product.par_unit}</div>
          </div>
          <button onClick={onClose} data-testid="supplier-deep-dive-close" className="ml-auto px-2 py-1 rounded border text-slate-400 hover:text-white" style={{ borderColor: "rgba(255,255,255,0.1)" }}>Close</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && <div className="text-slate-500 text-sm">Loading insights…</div>}

          {/* Price history */}
          {hist && (
            <section data-testid="deep-dive-price-history">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono uppercase tracking-widest text-amber-300/80">Price History · 26-week</h3>
                <div className="flex gap-3 text-[10px] font-mono">
                  <span className="text-slate-400">low <span className="text-emerald-400">${hist.low_52w}</span></span>
                  <span className="text-slate-400">high <span className="text-rose-400">${hist.high_52w}</span></span>
                  <span className="text-slate-400">avg <span className="text-cyan-400">${hist.avg_52w}</span></span>
                  <span className="text-slate-400">trend <span style={{ color: hist.trend_pct >= 0 ? "#fda4af" : "#86efac" }}>{hist.trend_pct >= 0 ? "+" : ""}{hist.trend_pct}%</span></span>
                </div>
              </div>
              <PriceSparkline series={hist.series} />
            </section>
          )}

          {/* Outlet usage */}
          {usage && (
            <section data-testid="deep-dive-outlet-usage">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono uppercase tracking-widest text-amber-300/80">Outlet Usage · {usage.weeks}-week</h3>
                <div className="text-[10px] font-mono text-slate-400">
                  total <span className="text-white">{usage.grand_total_units}</span> {product.par_unit} ·
                  est. weekly spend <span className="text-emerald-400">${usage.estimated_weekly_spend}</span>
                </div>
              </div>
              <div className="space-y-2">
                {usage.outlets.map((o: any) => (
                  <div key={o.outlet_id} data-testid={`outlet-row-${o.outlet_id}`} className="grid grid-cols-[160px_1fr_60px_80px] gap-3 items-center">
                    <div>
                      <div className="text-[12px] text-white">{o.outlet_name}</div>
                      <div className="text-[9px] font-mono text-slate-500">{o.avg_per_week}/wk avg · rank #{o.rank}</div>
                    </div>
                    <UsageBar series={o.series} />
                    <div className="text-[11px] font-mono text-cyan-300 text-right">{o.total_units}</div>
                    <div className="text-[10px] font-mono text-slate-400 text-right">{o.share_pct}%</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vendor selection */}
          <section data-testid="deep-dive-vendor-select">
            <h3 className="text-xs font-mono uppercase tracking-widest text-amber-300/80 mb-2">Preferred Vendor</h3>
            <div className="flex gap-2">
              {[
                { id: "sysco", label: "Sysco", color: "#06b6d4" },
                { id: "usfoods", label: "US Foods", color: "#a78bfa" },
              ].map(v => (
                <button
                  key={v.id}
                  data-testid={`vendor-select-${v.id}`}
                  onClick={() => onVendorSelect(v.id)}
                  className="px-4 py-2 rounded-md border text-xs font-semibold transition-all hover:-translate-y-px"
                  style={{ background: `${v.color}15`, borderColor: `${v.color}40`, color: v.color }}
                >
                  Pin {v.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PriceSparkline({ series }: { series: { week: string; price: number }[] }) {
  if (!series?.length) return null;
  const w = 760, h = 80, pad = 4;
  const prices = series.map(p => p.price);
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(series.length - 1, 1);
  const points = series.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p.price - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 80, background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
      <polyline fill="none" stroke="#c8a97e" strokeWidth="1.5" points={points} />
      <polyline fill="rgba(200,169,126,0.12)" stroke="none" points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} />
    </svg>
  );
}

function UsageBar({ series }: { series: { week: string; units: number }[] }) {
  if (!series?.length) return null;
  const max = Math.max(...series.map(s => s.units), 1);
  return (
    <div className="flex items-end gap-[2px] h-7">
      {series.map((s, i) => (
        <div key={i} title={`${s.week}: ${s.units}`} style={{
          flex: 1,
          height: `${Math.max(8, (s.units / max) * 100)}%`,
          background: "linear-gradient(180deg, rgba(56,189,248,0.65), rgba(56,189,248,0.25))",
          borderRadius: 1,
        }} />
      ))}
    </div>
  );
}
