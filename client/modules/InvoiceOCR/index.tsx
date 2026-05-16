import React, { useState, useEffect, useCallback } from "react";
import { FileText, Search, Check, X, AlertTriangle, Brain, ArrowRight, ChevronDown } from "lucide-react";

const API = window.location.origin;
const C = { bg: "#0a0e17", card: "#111827", card2: "#1a1f2e", border: "#1e293b", accent: "#3b82f6", gold: "#c8a97e", green: "#10b981", red: "#ef4444", amber: "#f59e0b", cyan: "#06b6d4", purple: "#8b5cf6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };

type Tab = "scan" | "mapping" | "catalog" | "history";

/* ════ STAT BADGE ════ */
function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 8, background: `${color}10`, border: `1px solid ${color}25` }}>
      <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

/* ════ CONFIDENCE BAR ════ */
function ConfidenceBar({ value, source }: { value: number; source?: string }) {
  const color = value >= 85 ? C.green : value >= 50 ? C.amber : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 4, borderRadius: 2, background: `${C.border}40` }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", borderRadius: 2, background: color, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: "monospace" }}>{value}%</span>
      {source === "learned" && <span style={{ fontSize: 8, color: C.cyan, background: `${C.cyan}15`, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>LEARNED</span>}
    </div>
  );
}

/* ════ SCAN TAB ════ */
function ScanTab() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true); setError(""); setResult(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch(`${API}/api/invoice-ocr/scan-and-map`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (err: any) { setError(err.message); }
    finally { setScanning(false); }
  };

  const ext = result?.extracted;
  const mapping = result?.item_mapping;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1 }}>Scan & Auto-Map</span>
        <label data-testid="scan-upload-btn" style={{ padding: "6px 16px", borderRadius: 8, border: `1px solid ${C.accent}30`, background: `${C.accent}12`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {scanning ? "Scanning..." : "Upload Invoice"}
          <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleUpload} disabled={scanning} />
        </label>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!result && !scanning && !error && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.dim }}>
            <FileText size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Upload a Vendor Invoice</div>
            <div style={{ fontSize: 11, textAlign: "center", maxWidth: 350 }}>AI will extract line items, then auto-match each to your internal catalog with confidence scores</div>
          </div>
        )}
        {scanning && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: C.dim }}>Scanning with Gemini Vision + Auto-Mapping...</div>
          </div>
        )}
        {error && <div style={{ padding: 12, borderRadius: 8, background: `${C.red}08`, border: `1px solid ${C.red}20`, color: C.red, fontSize: 12 }}>{error}</div>}

        {ext && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Vendor Header */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, padding: 12, borderRadius: 8, background: C.card2, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 8, color: C.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>VENDOR</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{ext.vendor?.name || "Unknown"}</div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>INV# {ext.invoice_number} | {ext.invoice_date}</div>
              </div>
              {mapping && (
                <div style={{ display: "flex", gap: 8 }}>
                  <StatBadge label="Auto-Matched" value={mapping.auto_matched} color={C.green} />
                  <StatBadge label="Needs Review" value={mapping.needs_review} color={C.amber} />
                  <StatBadge label="Unmapped" value={mapping.unmapped} color={C.red} />
                </div>
              )}
            </div>

            {/* Mapped Items Table */}
            {mapping?.items && (
              <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", background: C.card2, fontSize: 9, color: C.accent, textTransform: "uppercase", letterSpacing: 2 }}>
                  ITEM MAPPING ({mapping.total_items} items)
                </div>
                <div style={{ fontSize: 8, display: "grid", gridTemplateColumns: "60px 1fr 1fr 60px 70px 80px", gap: 0, padding: "6px 12px", background: `${C.border}20`, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>
                  <span>Code</span><span>Vendor Description</span><span>Mapped To</span><span>Conf</span><span>Status</span><span>Action</span>
                </div>
                {mapping.items.map((item: any, i: number) => (
                  <MappedItemRow key={i} item={item} vendorName={ext.vendor?.name || ""} />
                ))}
              </div>
            )}

            {/* Totals */}
            {ext.total && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ padding: "10px 16px", borderRadius: 8, background: C.card2, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 10, color: C.dim, marginRight: 12 }}>TOTAL</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: C.green, fontFamily: "monospace" }}>${ext.total?.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ════ MAPPED ITEM ROW ════ */
function MappedItemRow({ item, vendorName }: { item: any; vendorName: string }) {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(item.mapping_status === "auto_matched");
  const [showAlts, setShowAlts] = useState(false);

  const approve = async (matchItem?: any) => {
    const best = matchItem || item.best_match;
    if (!best) return;
    setApproving(true);
    await fetch(`${API}/api/item-mapping/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_item_code: item.vendor_item_code, vendor_item_desc: item.vendor_item_desc, vendor_name: vendorName, internal_item_id: best.internal_item_id, internal_item_name: best.internal_item_name }),
    });
    setApproved(true); setApproving(false); setShowAlts(false);
  };

  const statusColor = item.mapping_status === "auto_matched" ? C.green : item.mapping_status === "review" ? C.amber : C.red;
  const statusLabel = item.mapping_status === "auto_matched" ? "AUTO" : item.mapping_status === "review" ? "REVIEW" : "UNMAPPED";

  return (
    <>
      <div data-testid={`mapped-item-${item.vendor_item_code || "row"}`} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 60px 70px 80px", gap: 0, padding: "8px 12px", borderTop: `1px solid ${C.border}15`, alignItems: "center", background: approved ? `${C.green}04` : "transparent" }}>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: C.dim }}>{item.vendor_item_code || "—"}</span>
        <span style={{ fontSize: 11, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.vendor_item_desc}</span>
        <span style={{ fontSize: 11, color: item.best_match ? C.cyan : C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.best_match?.internal_item_name || "No match"}
          {item.best_match && <ConfidenceBar value={item.best_match.confidence} source={item.best_match.source} />}
        </span>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: statusColor, fontWeight: 700 }}>{item.best_match?.confidence || 0}%</span>
        <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: `${statusColor}15`, color: statusColor, fontWeight: 700, textTransform: "uppercase", textAlign: "center" }}>{approved ? "APPROVED" : statusLabel}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {!approved && item.best_match && (
            <button data-testid={`approve-${item.vendor_item_code}`} onClick={() => approve()} disabled={approving} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.green}30`, background: `${C.green}10`, color: C.green, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
              {approving ? "..." : "Approve"}
            </button>
          )}
          {item.alternatives?.length > 0 && !approved && (
            <button onClick={() => setShowAlts(!showAlts)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 9, cursor: "pointer" }}>
              <ChevronDown size={10} style={{ transform: showAlts ? "rotate(180deg)" : "none" }} />
            </button>
          )}
        </div>
      </div>
      {showAlts && item.alternatives?.map((alt: any, i: number) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 60px 70px 80px", gap: 0, padding: "4px 12px 4px 24px", background: `${C.accent}04`, alignItems: "center" }}>
          <span />
          <span style={{ fontSize: 9, color: C.dim }}>Alternative {i + 1}</span>
          <span style={{ fontSize: 10, color: C.purple }}>{alt.internal_item_name} <ConfidenceBar value={alt.confidence} /></span>
          <span style={{ fontSize: 9, color: C.dim, fontFamily: "monospace" }}>{alt.confidence}%</span>
          <span />
          <button onClick={() => approve(alt)} style={{ padding: "2px 6px", borderRadius: 3, border: `1px solid ${C.purple}30`, background: `${C.purple}08`, color: C.purple, fontSize: 8, cursor: "pointer" }}>Use This</button>
        </div>
      ))}
    </>
  );
}

/* ════ MAPPING REVIEW TAB ════ */
function MappingTab() {
  const [stats, setStats] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [filter, setFilter] = useState("approved");

  const load = () => {
    fetch(`${API}/api/item-mapping/stats`).then(r => r.json()).then(setStats);
    fetch(`${API}/api/item-mapping/mappings?status=${filter}&limit=50`).then(r => r.json()).then(d => setMappings(d.mappings || []));
  };
  useEffect(load, [filter]);

  const deleteMapping = async (id: string) => {
    await fetch(`${API}/api/item-mapping/mappings/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Stats Row */}
      {stats && (
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <StatBadge label="Total Mappings" value={stats.mappings.total} color={C.accent} />
          <StatBadge label="Approved" value={stats.mappings.approved} color={C.green} />
          <StatBadge label="Learning Rate" value={`${stats.learning_rate}%`} color={C.cyan} />
          <StatBadge label="Catalog Items" value={stats.catalog_items} color={C.gold} />
          <StatBadge label="Queue" value={stats.queue.review + stats.queue.unmapped} color={C.amber} />
        </div>
      )}
      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 16px", borderBottom: `1px solid ${C.border}` }}>
        {["approved", "rejected", ""].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${filter === f ? C.accent : C.border}`, background: filter === f ? `${C.accent}12` : "transparent", color: filter === f ? C.accent : C.dim, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
            {f || "All"}
          </button>
        ))}
      </div>
      {/* Mappings List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        {mappings.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.dim, fontSize: 12 }}>No mappings found</div>}
        {mappings.map((m: any) => (
          <div key={m.id} data-testid={`mapping-${m.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: `1px solid ${C.border}10`, gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.vendor_item_desc}</div>
              <div style={{ fontSize: 9, color: C.dim }}>{m.vendor_name} | Code: {m.vendor_item_code || "—"}</div>
            </div>
            <ArrowRight size={12} color={C.dim} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.cyan, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.internal_item_name}</div>
              <div style={{ fontSize: 9, color: C.dim }}>Used {m.times_used || 1}x</div>
            </div>
            <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: m.status === "approved" ? `${C.green}15` : `${C.red}15`, color: m.status === "approved" ? C.green : C.red, fontWeight: 700 }}>{m.status?.toUpperCase()}</span>
            <button onClick={() => deleteMapping(m.id)} style={{ padding: "2px 6px", borderRadius: 3, border: `1px solid ${C.red}30`, background: "transparent", color: C.red, fontSize: 8, cursor: "pointer" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════ CATALOG TAB ════ */
function CatalogTab() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const url = catFilter ? `${API}/api/item-mapping/catalog?category=${catFilter}` : `${API}/api/item-mapping/catalog`;
    fetch(url).then(r => r.json()).then(d => { setItems(d.items || []); setCategories(d.categories || []); });
  }, [catFilter]);

  const filtered = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center", flexWrap: "wrap" }}>
        <Search size={14} color={C.dim} />
        <input data-testid="catalog-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search catalog..." style={{ flex: 1, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 11, minWidth: 120 }} />
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(catFilter === c ? "" : c)} style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${catFilter === c ? C.gold : C.border}`, background: catFilter === c ? `${C.gold}12` : "transparent", color: catFilter === c ? C.gold : C.dim, fontSize: 9, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{c}</button>
        ))}
        <span style={{ fontSize: 10, color: C.dim }}>{filtered.length} items</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 80px 60px 70px 60px", padding: "6px 16px", fontSize: 8, color: C.dim, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${C.border}20` }}>
          <span>ID</span><span>Name</span><span>Category</span><span>Unit</span><span>Par Cost</span><span>GL</span>
        </div>
        {filtered.map(item => (
          <div key={item.item_id} data-testid={`catalog-${item.item_id}`} style={{ display: "grid", gridTemplateColumns: "70px 1fr 80px 60px 70px 60px", padding: "7px 16px", borderBottom: `1px solid ${C.border}08`, alignItems: "center" }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: C.dim }}>{item.item_id}</span>
            <span style={{ fontSize: 11, color: C.text }}>{item.name}</span>
            <span style={{ fontSize: 9, color: C.purple, textTransform: "capitalize" }}>{item.category}</span>
            <span style={{ fontSize: 9, color: C.dim }}>{item.unit}</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: C.gold }}>${item.par_cost?.toFixed(2)}</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: C.dim }}>{item.gl_code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════ MAIN PANEL ════ */
export default function InvoiceOCRPanel() {
  const [tab, setTab] = useState<Tab>("scan");
  const tabs: { id: Tab; label: string }[] = [
    { id: "scan", label: "Scan & Map" },
    { id: "mapping", label: "Learned Mappings" },
    { id: "catalog", label: "Item Catalog" },
  ];

  return (
    <div data-testid="invoice-ocr-panel" style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: `${C.accent}12`, border: `1px solid ${C.accent}25` }}>
            <Brain size={16} color={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>Invoice Intelligence</div>
            <div style={{ fontSize: 9, color: C.dim, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>AI-Powered OCR + Item Mapping</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} data-testid={`invoice-tab-${t.id}`} onClick={() => setTab(t.id)} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? `${C.accent}12` : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "scan" && <ScanTab />}
        {tab === "mapping" && <MappingTab />}
        {tab === "catalog" && <CatalogTab />}
      </div>
    </div>
  );
}
