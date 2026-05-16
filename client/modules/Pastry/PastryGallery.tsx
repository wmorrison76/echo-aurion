/**
 * PastryGallery — saved photoreal cake renders, Pinterest-style masonry grid.
 * Bakeries can favorite, rename, tag, or delete renders.
 */
import React, { useEffect, useState } from "react";

const API = "";  // relative; Vite proxies /api → backend

interface RenderItem {
  render_id: string;
  session_id?: string;
  style?: string;
  image_url: string;
  prompt?: string;
  title?: string;
  tags?: string[];
  favorited?: boolean;
  owner_email?: string;
  created_at?: string;
}

export function PastryGallery() {
  const [items, setItems] = useState<RenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favOnly, setFavOnly] = useState(false);
  const [selected, setSelected] = useState<RenderItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (favOnly) qs.set("favorited_only", "true");
    qs.set("limit", "96");
    fetch(`${API}/api/pastry/gallery?${qs}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setErr("Unable to load gallery"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [favOnly]);

  const patchItem = async (render_id: string, patch: Partial<RenderItem>) => {
    const r = await fetch(`${API}/api/pastry/gallery/${render_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      setItems((prev) => prev.map((it) => (it.render_id === render_id ? { ...it, ...patch } : it)));
      if (selected?.render_id === render_id) setSelected({ ...selected, ...patch });
    }
  };

  const deleteItem = async (render_id: string) => {
    if (!confirm("Remove this render from the gallery? This cannot be undone.")) return;
    const r = await fetch(`${API}/api/pastry/gallery/${render_id}`, { method: "DELETE" });
    if (r.ok) {
      setItems((prev) => prev.filter((it) => it.render_id !== render_id));
      if (selected?.render_id === render_id) setSelected(null);
    }
  };

  return (
    <div style={wrapStyle} data-testid="pastry-gallery-page">
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>EchoAi³ · Pastry Gallery</div>
            <h1 style={h1Style}>Your cake portfolio</h1>
            <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>
              Every photoreal render you've created, saved, and favorited.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setFavOnly((v) => !v)}
              style={{ ...pillBtn, ...(favOnly ? pillActive : {}) }}
              data-testid="pastry-gallery-fav-toggle"
            >
              {favOnly ? "★ Favorites only" : "☆ All renders"}
            </button>
            <a href="/pastry/admin" style={pillBtn}>Revenue →</a>
          </div>
        </div>

        {err && <div style={{ color: "#f87171", padding: 16 }}>{err}</div>}
        {loading && <div style={{ color: "#94a3b8", padding: 40, textAlign: "center" }}>Loading…</div>}
        {!loading && items.length === 0 && (
          <div style={emptyStyle} data-testid="pastry-gallery-empty">
            <div style={{ fontSize: 44, opacity: 0.2, marginBottom: 10 }}>🎂</div>
            <div style={{ color: "#cbd5e1", fontSize: 18, marginBottom: 8 }}>No renders saved yet</div>
            <div style={{ color: "#64748b", fontSize: 14 }}>
              Open the 3D Cake Designer, compose a cake, then press{" "}
              <b style={{ color: "#c8a97e" }}>Photoreal Render</b> to populate your gallery.
            </div>
          </div>
        )}

        <div style={gridStyle}>
          {items.map((it) => (
            <div
              key={it.render_id}
              style={cardStyle}
              onClick={() => setSelected(it)}
              data-testid={`pastry-gallery-card-${it.render_id}`}
            >
              <img src={it.image_url} alt={it.title || "Cake render"} style={imgStyle} />
              <div style={cardFootStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={cardTitleStyle}>{it.title || untitledFromPrompt(it.prompt)}</div>
                  <div style={cardMetaStyle}>
                    {it.style || "studio"} · {fmtDate(it.created_at)}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); patchItem(it.render_id, { favorited: !it.favorited }); }}
                  style={favBtnStyle(it.favorited)}
                  data-testid={`pastry-gallery-fav-${it.render_id}`}
                  title={it.favorited ? "Remove from favorites" : "Add to favorites"}
                >
                  {it.favorited ? "★" : "☆"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onPatch={patchItem} onDelete={deleteItem} />}
    </div>
  );
}

function DetailModal({ item, onClose, onPatch, onDelete }: {
  item: RenderItem;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<RenderItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(item.title || "");
  const [tagInput, setTagInput] = useState((item.tags || []).join(", "));
  const [clientName, setClientName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = () => {
    const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    onPatch(item.render_id, { title: title.trim() || undefined, tags });
    onClose();
  };

  const publishShare = async () => {
    setSharing(true);
    try {
      const r = await fetch(`${API}/api/pastry/look/${item.render_id}/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_title: title.trim() || undefined, client_name: clientName.trim() || undefined }),
      });
      const d = await r.json();
      if (d.share_url) {
        const full = `${window.location.origin}${d.share_url}`;
        setShareUrl(full);
      }
    } finally {
      setSharing(false);
    }
  };

  const copyShare = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div style={modalBg} onClick={onClose} data-testid="pastry-gallery-modal">
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <img src={item.image_url} alt={title} style={{ width: "min(540px, 100%)", borderRadius: 14, display: "block" }} />
          <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Blush Peony Wedding" data-testid="pastry-gallery-title-input" />
            </label>
            <label style={labelStyle}>
              Tags (comma-separated)
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} style={inputStyle} placeholder="wedding, peony, blush" data-testid="pastry-gallery-tags-input" />
            </label>
            {item.prompt && (
              <div>
                <div style={labelStyle}>AI prompt used</div>
                <div style={promptBoxStyle}>{item.prompt}</div>
              </div>
            )}
            <div style={{ padding: 14, borderRadius: 10, background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.25)" }} data-testid="pastry-gallery-share-panel">
              <div style={labelStyle}>Send to client</div>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
                placeholder="Client name (optional, e.g. Sarah & Tom)"
                data-testid="pastry-gallery-client-name"
              />
              {!shareUrl && (
                <button onClick={publishShare} disabled={sharing} style={{ ...saveBtn, marginTop: 8 }} data-testid="pastry-gallery-publish-share">
                  {sharing ? "Publishing…" : "🔗 Publish share link"}
                </button>
              )}
              {shareUrl && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.3)" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Shareable URL:</div>
                  <div style={{ fontSize: 12, color: "#c8a97e", wordBreak: "break-all", fontFamily: "monospace" }} data-testid="pastry-gallery-share-url">{shareUrl}</div>
                  <button onClick={copyShare} style={{ ...downloadBtn, marginTop: 8 }} data-testid="pastry-gallery-copy-share">
                    {copied ? "✓ Copied" : "Copy link"}
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap" }}>
              <button onClick={save} style={saveBtn} data-testid="pastry-gallery-save-btn">Save changes</button>
              <a href={item.image_url} download target="_blank" rel="noreferrer" style={downloadBtn} data-testid="pastry-gallery-download">
                Download
              </a>
              <button onClick={() => onDelete(item.render_id)} style={delBtn} data-testid="pastry-gallery-delete-btn">
                Delete
              </button>
              <button onClick={onClose} style={closeBtn}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function untitledFromPrompt(p?: string): string {
  if (!p) return "Untitled render";
  // Extract first ~40 chars after "bottom tier:" or first meaningful segment
  const m = p.match(/bottom tier:\s*([^.]+)/i);
  return (m?.[1] || p).slice(0, 40).trim() + "…";
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return ""; }
}

// ─── styles ───
const wrapStyle: React.CSSProperties = {
  minHeight: "100vh", padding: "40px 24px 80px",
  background: "radial-gradient(900px 500px at 30% -10%, rgba(200,169,126,0.12), transparent), #0b1020",
  color: "#f8fafc", fontFamily: "system-ui, sans-serif",
};
const headerStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-end",
  marginBottom: 30, flexWrap: "wrap", gap: 16,
};
const eyebrowStyle: React.CSSProperties = {
  fontSize: 12, letterSpacing: 2, color: "#c8a97e",
  fontWeight: 700, textTransform: "uppercase",
};
const h1Style: React.CSSProperties = {
  fontSize: 48, margin: "10px 0 0", fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400, lineHeight: 1,
};
const pillBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 99, background: "rgba(255,255,255,0.06)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer", fontWeight: 600, fontSize: 13, textDecoration: "none",
  display: "inline-flex", alignItems: "center",
};
const pillActive: React.CSSProperties = {
  background: "rgba(200,169,126,0.18)", borderColor: "rgba(200,169,126,0.5)", color: "#c8a97e",
};
const gridStyle: React.CSSProperties = {
  columnWidth: 280, columnGap: 18, marginTop: 24,
};
const cardStyle: React.CSSProperties = {
  breakInside: "avoid", marginBottom: 18, borderRadius: 14, overflow: "hidden",
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
  cursor: "pointer", transition: "transform 120ms, border-color 120ms",
};
const imgStyle: React.CSSProperties = {
  width: "100%", display: "block", background: "#0b1020",
};
const cardFootStyle: React.CSSProperties = {
  padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
};
const cardTitleStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#f8fafc",
  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
};
const cardMetaStyle: React.CSSProperties = {
  fontSize: 11, color: "#94a3b8", marginTop: 2,
};
const favBtnStyle = (active?: boolean): React.CSSProperties => ({
  background: "transparent", border: 0, color: active ? "#facc15" : "#64748b",
  fontSize: 18, cursor: "pointer", padding: 4,
});
const emptyStyle: React.CSSProperties = {
  padding: "80px 40px", textAlign: "center",
  border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 18,
  background: "rgba(255,255,255,0.02)", marginTop: 40,
};
const modalBg: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 24, backdropFilter: "blur(4px)",
};
const modalCard: React.CSSProperties = {
  width: "min(960px, 100%)", maxHeight: "90vh", overflow: "auto",
  padding: 24, borderRadius: 18,
  background: "#0b1020", border: "1px solid rgba(200,169,126,0.25)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, color: "#94a3b8", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: 1,
  display: "flex", flexDirection: "column", gap: 6,
};
const inputStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 8,
  background: "rgba(0,0,0,0.4)", color: "#f8fafc",
  border: "1px solid rgba(255,255,255,0.1)",
  fontSize: 14, fontFamily: "system-ui",
};
const promptBoxStyle: React.CSSProperties = {
  fontSize: 12, color: "#cbd5e1", lineHeight: 1.6,
  padding: 12, borderRadius: 8,
  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)",
  maxHeight: 180, overflowY: "auto",
};
const saveBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 10, border: 0,
  background: "#c8a97e", color: "#0b1020", fontWeight: 700, cursor: "pointer",
};
const downloadBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 10,
  background: "rgba(255,255,255,0.06)", color: "#f8fafc",
  border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none",
  fontWeight: 600, fontSize: 14,
};
const delBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
  background: "rgba(239,68,68,0.1)", color: "#fca5a5", cursor: "pointer", fontWeight: 600,
};
const closeBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent", color: "#cbd5e1", cursor: "pointer", fontWeight: 600, marginLeft: "auto",
};
