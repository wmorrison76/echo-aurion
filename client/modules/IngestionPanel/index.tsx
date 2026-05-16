import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Trash2, Search, RefreshCw, ChevronDown,
  File as FileIcon, Image, Table, Code, Database, Tag,
  AlertTriangle, Check, Loader2, MessageSquare, X
} from "lucide-react";

const API = window.location.origin;

const BG = "#04060d";
const SURFACE = "#0a0d17";
const GOLD = "#c8a97e";
const GOLD_M = "rgba(200,169,126,0.2)";
const GREEN = "#34d399";
const RED = "#ef4444";
const AMBER = "#fbbf24";
const BLUE = "#60a5fa";
const BORDER = "rgba(200,169,126,0.15)";
const TXT = "#ffffff";
const TXT2 = "#a1a1aa";
const TXT3 = "#71717a";
const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" };

const CAT_COLOR: Record<string, string> = {
  invoice: "#f97316", menu: "#a78bfa", beo: "#22d3ee", financial_statement: GREEN,
  vendor_catalog: AMBER, recipe: "#f87171", compliance_report: BLUE, contract: "#c084fc",
  employee_document: "#94a3b8", other: TXT3,
};

const EXT_ICON: Record<string, any> = {
  pdf: FileText, csv: Table, xlsx: Table, xls: Table, txt: Code, json: Code, png: Image, jpeg: Image,
};

function formatBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1048576).toFixed(1)}MB`;
}

export default function IngestionPanel() {
  const [docs, setDocs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [queryText, setQueryText] = useState("");
  const [queryAnswer, setQueryAnswer] = useState("");
  const [querying, setQuerying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const refresh = async () => {
    const [d, s] = await Promise.all([
      fetch(`${API}/api/echoai3/ingest/documents?limit=50`).then(r => r.json()),
      fetch(`${API}/api/echoai3/ingest/stats`).then(r => r.json()),
    ]);
    setDocs(d.documents || []);
    setStats(s);
  };

  useEffect(() => { refresh(); }, []);

  const upload = async (file: globalThis.File) => {
    setUploading(true);
    setProgress("Uploading...");
    const form = new FormData();
    form.append("file", file);
    form.append("category", "auto");

    try {
      setProgress("Processing & classifying...");
      const res = await fetch(`${API}/api/echoai3/ingest/upload`, { method: "POST", body: form }).then(r => r.json());
      if (res.document_id) {
        setProgress(`Classified as ${res.category} (${res.confidence}% confidence)`);
        setTimeout(() => { setProgress(""); refresh(); }, 2000);
      } else {
        setProgress(`Error: ${res.error || "Upload failed"}`);
      }
    } catch {
      setProgress("Upload failed");
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) upload(e.dataTransfer.files[0]);
  };

  const handleDelete = async (docId: string) => {
    await fetch(`${API}/api/echoai3/ingest/document/${docId}`, { method: "DELETE" });
    setDocs(p => p.filter(d => d.document_id !== docId));
    if (selected?.document_id === docId) setSelected(null);
  };

  const askDocument = async () => {
    if (!selected || !queryText.trim()) return;
    setQuerying(true);
    setQueryAnswer("");
    const form = new FormData();
    form.append("query", queryText);
    try {
      const res = await fetch(`${API}/api/echoai3/ingest/document/${selected.document_id}/query`, { method: "POST", body: form }).then(r => r.json());
      setQueryAnswer(res.answer || res.error || "No answer");
    } catch { setQueryAnswer("Query failed"); }
    setQuerying(false);
  };

  const filtered = filter ? docs.filter(d => d.category === filter) : docs;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: BG, color: TXT }} data-testid="ingestion-panel">
      {/* Left: Documents List */}
      <div className="w-[340px] flex flex-col shrink-0" style={{ borderRight: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Upload className="w-4 h-4" style={{ color: GOLD }} />
          <div className="flex-1">
            <div className="text-[12px] font-semibold">Document Intelligence</div>
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>File Ingestion Pipeline</div>
          </div>
          <button onClick={refresh} className="p-1 hover:bg-white/5 transition-colors" data-testid="refresh-docs">
            <RefreshCw className="w-3 h-3" style={{ color: TXT3 }} />
          </button>
        </div>

        {/* Drop Zone */}
        <div className="px-3 pt-3 pb-2"
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}>
          <div className={`rounded-sm py-4 text-center cursor-pointer transition-all`}
            onClick={() => fileRef.current?.click()}
            style={{
              background: dragActive ? `${GOLD}10` : "rgba(255,255,255,0.02)",
              border: `1px dashed ${dragActive ? GOLD : BORDER}`,
            }}
            data-testid="drop-zone">
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.csv,.xlsx,.xls,.txt,.json,.png,.jpeg,.jpg"
              onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
                <span className="text-[10px]" style={{ ...MONO, color: GOLD }}>{progress}</span>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 mx-auto mb-1" style={{ color: dragActive ? GOLD : TXT3 }} />
                <p className="text-[9px]" style={{ ...MONO, color: dragActive ? GOLD : TXT3 }}>Drop file or click to upload</p>
                <p className="text-[7px] mt-0.5" style={{ color: TXT3 }}>PDF, CSV, XLSX, TXT, JSON</p>
              </>
            )}
          </div>
          {progress && !uploading && (
            <div className="text-[8px] text-center mt-1" style={{ ...MONO, color: GREEN }}>{progress}</div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="px-3 mb-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] px-1.5 py-0.5 rounded-sm" style={{ ...MONO, color: TXT3, background: "rgba(255,255,255,0.03)" }}>
              {stats.total_documents} docs
            </span>
            {stats.categories?.map((c: any) => (
              <span key={c.category} className="text-[7px] px-1.5 py-0.5 rounded-sm cursor-pointer"
                onClick={() => setFilter(f => f === c.category ? "" : c.category)}
                style={{
                  ...MONO,
                  color: CAT_COLOR[c.category] || TXT3,
                  background: `${CAT_COLOR[c.category] || TXT3}10`,
                  border: filter === c.category ? `1px solid ${CAT_COLOR[c.category] || TXT3}40` : "1px solid transparent",
                }}>
                {c.category} ({c.count})
              </span>
            ))}
          </div>
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}
          data-testid="doc-list">
          {filtered.length === 0 && (
            <div className="text-center py-6">
              <FileText className="w-6 h-6 mx-auto mb-1" style={{ color: TXT3, opacity: 0.2 }} />
              <p className="text-[9px]" style={{ ...MONO, color: TXT3 }}>No documents ingested yet</p>
            </div>
          )}
          {filtered.map(doc => {
            const Icon = EXT_ICON[doc.file_ext] || FileIcon;
            const catColor = CAT_COLOR[doc.category] || TXT3;
            const isActive = selected?.document_id === doc.document_id;
            return (
              <div key={doc.document_id}
                className="group flex items-start gap-2 px-2 py-2 rounded-sm cursor-pointer transition-all"
                style={{
                  background: isActive ? GOLD_M : "transparent",
                  borderLeft: isActive ? `2px solid ${GOLD}` : "2px solid transparent",
                }}
                onClick={() => setSelected(doc)}
                data-testid={`doc-${doc.document_id}`}>
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: catColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] truncate" style={{ color: isActive ? TXT : TXT2 }}>{doc.filename}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[7px] px-1 py-0.5 rounded-sm" style={{ ...MONO, color: catColor, background: `${catColor}10` }}>
                      {doc.category}
                    </span>
                    <span className="text-[7px]" style={{ ...MONO, color: TXT3 }}>{formatBytes(doc.size_bytes)}</span>
                    {doc.confidence > 0 && (
                      <span className="text-[7px]" style={{ ...MONO, color: doc.confidence >= 80 ? GREEN : AMBER }}>{doc.confidence}%</span>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.document_id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/5 transition-all"
                  data-testid={`delete-doc-${doc.document_id}`}>
                  <Trash2 className="w-3 h-3" style={{ color: TXT3 }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Document Detail / Empty State */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <FileText className="w-12 h-12 mb-3" style={{ color: TXT3, opacity: 0.15 }} />
            <p className="text-[12px] font-light mb-1" style={{ color: TXT }}>Document Intelligence</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-center max-w-xs" style={{ ...MONO, color: TXT3 }}>
              Upload invoices, menus, BEOs, financial statements — AI classifies, extracts, and indexes them for intelligence queries
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Document Header */}
            <div className="rounded-sm overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <FileText className="w-4 h-4" style={{ color: GOLD }} />
                <div className="flex-1">
                  <div className="text-[12px] font-semibold" style={{ color: TXT }}>{selected.filename}</div>
                  <div className="flex items-center gap-2 text-[8px]" style={MONO}>
                    <span style={{ color: CAT_COLOR[selected.category] || TXT3 }}>{selected.category}</span>
                    <span style={{ color: TXT3 }}>{formatBytes(selected.size_bytes)}</span>
                    <span style={{ color: TXT3 }}>{selected.file_ext?.toUpperCase()}</span>
                    <span style={{ color: selected.confidence >= 80 ? GREEN : selected.confidence >= 50 ? AMBER : RED }}>
                      {selected.confidence}% confidence
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/5" data-testid="close-detail">
                  <X className="w-3.5 h-3.5" style={{ color: TXT3 }} />
                </button>
              </div>

              {/* Summary */}
              {selected.summary && (
                <div className="px-4 py-3">
                  <div className="text-[8px] uppercase tracking-[0.2em] mb-1" style={{ ...MONO, color: TXT3 }}>AI Summary</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: TXT2 }}>{selected.summary}</p>
                </div>
              )}
            </div>

            {/* Key Data */}
            {selected.key_data && Object.keys(selected.key_data).length > 0 && (
              <div className="rounded-sm px-4 py-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ ...MONO, color: GOLD }}>Extracted Data</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.key_data).map(([k, v]) => (
                    <div key={k} className="px-2 py-1.5 rounded-sm" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="text-[7px] uppercase tracking-[0.15em]" style={{ ...MONO, color: TXT3 }}>{k.replace(/_/g, " ")}</div>
                      <div className="text-[10px] font-semibold" style={{ color: TXT }}>
                        {typeof v === "object" ? JSON.stringify(v, null, 2).slice(0, 200) : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entities */}
            {selected.entities && selected.entities.length > 0 && (
              <div className="rounded-sm px-4 py-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ ...MONO, color: TXT3 }}>Entities Detected</div>
                <div className="flex flex-wrap gap-1">
                  {selected.entities.map((e: string, i: number) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-sm" style={{ ...MONO, color: BLUE, background: `${BLUE}10`, border: `1px solid ${BLUE}15` }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Items */}
            {selected.actionable_items && selected.actionable_items.length > 0 && (
              <div className="rounded-sm px-4 py-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ ...MONO, color: AMBER }}>Action Items</div>
                <div className="space-y-1">
                  {selected.actionable_items.map((a: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 px-2 py-1.5" style={{ background: `${AMBER}05`, border: `1px solid ${AMBER}10` }}>
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: AMBER }} />
                      <span className="text-[9px]" style={{ color: TXT2 }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ask About Document */}
            <div className="rounded-sm px-4 py-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ ...MONO, color: GOLD }}>Ask About This Document</div>
              <div className="flex gap-2">
                <input value={queryText} onChange={e => setQueryText(e.target.value)}
                  placeholder="What is the total amount on this invoice?"
                  className="flex-1 bg-transparent text-[11px] px-2 py-1.5 outline-none rounded-sm"
                  style={{ color: TXT, border: `1px solid ${BORDER}`, ...MONO }}
                  onKeyDown={e => e.key === "Enter" && askDocument()}
                  data-testid="doc-query-input" />
                <button onClick={askDocument} disabled={querying || !queryText.trim()}
                  className="px-3 py-1.5 rounded-sm transition-all"
                  style={{ background: GOLD_M, border: `1px solid ${GOLD}40`, color: GOLD, opacity: querying ? 0.5 : 1 }}
                  data-testid="doc-query-btn">
                  {querying ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                </button>
              </div>
              {queryAnswer && (
                <div className="mt-2 px-3 py-2 rounded-sm text-[10px] leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.02)", color: TXT2, border: `1px solid rgba(255,255,255,0.04)` }}
                  data-testid="doc-query-answer">
                  {queryAnswer}
                </div>
              )}
            </div>

            {/* Tags */}
            {selected.tags && selected.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <Tag className="w-3 h-3" style={{ color: TXT3 }} />
                {selected.tags.map((t: string) => (
                  <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-sm" style={{ ...MONO, color: TXT3, background: "rgba(255,255,255,0.03)" }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
