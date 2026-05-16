/** iter244 · Gallery — ultra-modern mobile UI worthy of award-winning dishes.
 *
 * Design language:
 *   - Pinterest-style masonry grid with crisp portfolio aesthetic
 *   - Photos hero-first, white-space generous, gallery feels like a magazine
 *   - Tap a photo → cinematic full-screen viewer w/ chef notes, hearts,
 *     recognition results, and one-tap link buttons (Recipe / Menu Item /
 *     Waste / Dish Assembly)
 *   - Filters: outlet · station · recognized only · search
 *   - Upload: front-and-center "+" with chef pride messaging
 */
import React from "react";
import { API } from "@/lib/api-url";

type Photo = {
  id: string; label: string; auto_name?: string; confirmed?: boolean;
  blob_url?: string; outlet_id?: string; station?: { name?: string };
  recipe?: { name?: string }; menu_item?: { name?: string; price?: number };
  recipe_id?: string; menu_item_id?: string; waste_event_id?: string;
  heart_count?: number; created_at: string; chef_id?: string;
};

export function GalleryTab({ outletId }: { outletId: string }) {
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [active, setActive] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "confirmed" | "linked">("all");
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(() => {
    const qs = new URLSearchParams({ outlet_id: outletId, limit: "60" });
    if (search) qs.set("q", search);
    if (filter === "confirmed") qs.set("only_confirmed", "true");
    fetch(`${API()}/api/gallery/list?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        let rows = d?.rows || [];
        if (filter === "linked") rows = rows.filter((p: Photo) => p.recipe_id || p.menu_item_id);
        setPhotos(rows);
      }).catch(() => undefined);
  }, [outletId, search, filter]);

  React.useEffect(() => { load(); }, [load]);

  async function handleUpload(file: File) {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = String(reader.result || "").split(",")[1] || "";
      const r = await fetch(`${API()}/api/ecw-ops/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_id: outletId, media_base64: b64 }),
      });
      setUploading(false);
      if (r.ok) { load(); }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div data-testid="gallery-root" style={{
      padding: "0 0 100px", background: "#0a0a0a", minHeight: "100vh",
    }}>
      {/* Editorial header */}
      <div style={{
        padding: "24px 16px 14px",
        background: "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: "#d4af37",
                        fontWeight: 600, marginBottom: 4 }}>
          ECHOBOOK EDITORIAL · GALLERY
        </div>
        <h1 style={{
          fontSize: 34, fontWeight: 200, color: "#f5efe4", margin: 0,
          fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.05,
          letterSpacing: -0.5,
        }}>
          The Pass.
        </h1>
        <div style={{ fontSize: 11, color: "#8b8680", marginTop: 8,
                        fontStyle: "italic", letterSpacing: 0.3 }}>
          A working portfolio of every dish that's left this kitchen.
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "0 16px 14px", display: "flex", gap: 8 }}>
        <input data-testid="gallery-search" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dishes…"
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 999,
            background: "rgba(255,255,255,0.05)", color: "#f5efe4",
            border: "1px solid rgba(212,175,55,0.2)", fontSize: 13,
            fontFamily: "inherit",
          }} />
        <label data-testid="gallery-upload-btn" style={{
          padding: "10px 16px", borderRadius: 999,
          background: "linear-gradient(135deg, #d4af37 0%, #c8a97e 100%)",
          color: "#0a0a0a", fontSize: 13, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          letterSpacing: 0.3, opacity: uploading ? 0.6 : 1,
        }}>
          {uploading ? "…" : "+ ADD"}
          <input type="file" accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            style={{ display: "none" }} disabled={uploading} />
        </label>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, padding: "0 16px 14px", overflowX: "auto",
                      scrollbarWidth: "none" as any }}>
        <style>{`
          [data-testid='gallery-root'] *::-webkit-scrollbar { display: none; }
          [data-testid='gallery-card'] { transition: transform 380ms cubic-bezier(0.2,0.8,0.2,1); }
          [data-testid='gallery-card']:hover { transform: translateY(-3px) scale(1.005); }
        `}</style>
        {(["all", "confirmed", "linked"] as const).map((f) => (
          <button key={f} data-testid={`gallery-filter-${f}`}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 10,
              letterSpacing: 1, fontWeight: 600, fontFamily: "inherit",
              background: filter === f ? "rgba(212,175,55,0.15)" : "transparent",
              border: `1px solid ${filter === f ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.1)"}`,
              color: filter === f ? "#d4af37" : "#8b8680",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {f === "all" ? "ALL DISHES" : f === "confirmed" ? "CONFIRMED" : "LINKED"}
          </button>
        ))}
      </div>

      {/* Masonry grid (CSS columns) */}
      <div data-testid="gallery-grid" style={{
        columnCount: 2, columnGap: 4, padding: "0 4px",
      }}>
        {photos.length === 0 && (
          <div style={{ color: "#5a554d", padding: 40, textAlign: "center",
                          fontSize: 12, fontStyle: "italic" }}>
            The gallery awaits its first plate.
          </div>
        )}
        {photos.map((p, idx) => {
          const ar = idx % 5 === 0 ? "4/5" : idx % 7 === 1 ? "1/1" : idx % 6 === 2 ? "3/4" : "1/1";
          return (
            <button key={p.id} data-testid="gallery-card"
              onClick={() => setActive(p.id)}
              style={{
                breakInside: "avoid", display: "block", width: "100%",
                marginBottom: 4, padding: 0, border: "none",
                background: "transparent", cursor: "pointer", position: "relative",
                aspectRatio: ar,
              }}>
              {p.blob_url ? (
                <img src={p.blob_url} alt={p.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
                            borderRadius: 2 }} />
              ) : (
                <div style={{ width: "100%", height: "100%",
                                background: "rgba(255,255,255,0.04)", borderRadius: 2,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#5a554d", fontSize: 28 }}>🍽</div>
              )}
              <div style={{
                position: "absolute", left: 0, right: 0, bottom: 0, padding: 8,
                background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)",
                color: "#f5efe4", textAlign: "left", borderRadius: "0 0 2px 2px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2,
                                fontFamily: "'Playfair Display', Georgia, serif",
                                letterSpacing: 0.2,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.label}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  {p.recipe_id && <span style={chip("rgba(212,175,55,0.3)", "#d4af37")}>R</span>}
                  {p.menu_item_id && <span style={chip("rgba(96,165,250,0.3)", "#60a5fa")}>M</span>}
                  {!p.confirmed && <span style={chip("rgba(245,158,11,0.3)", "#f59e0b")}>?</span>}
                  {(p.heart_count ?? 0) > 0 && (
                    <span style={chip("rgba(239,68,68,0.3)", "#ef4444")}>♥ {p.heart_count}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {active && <PhotoViewer photoId={active} onClose={() => { setActive(null); load(); }} />}
    </div>
  );
}


function chip(bg: string, color: string): React.CSSProperties {
  return {
    fontSize: 8, letterSpacing: 1, padding: "1px 5px", borderRadius: 2,
    background: bg, color, fontWeight: 700,
  };
}


function PhotoViewer({ photoId, onClose }: { photoId: string; onClose: () => void }) {
  const [photo, setPhoto] = React.useState<any>(null);
  const [linkOpen, setLinkOpen] = React.useState<"recipe" | "menu" | null>(null);
  const [reco, setReco] = React.useState<any>(null);
  const [recoBusy, setRecoBusy] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");

  const load = React.useCallback(() => {
    fetch(`${API()}/api/gallery/${photoId}/full`).then((r) => r.json())
      .then((d) => setPhoto(d?.photo)).catch(() => undefined);
  }, [photoId]);
  React.useEffect(load, [load]);

  async function recognize() {
    setRecoBusy(true);
    const r = await fetch(`${API()}/api/gallery/${photoId}/recognize`, { method: "POST" });
    setRecoBusy(false);
    if (r.ok) setReco(await r.json());
  }

  async function linkRecipe(id: string) {
    await fetch(`${API()}/api/gallery/${photoId}/link-recipe`,
                  { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ target_id: id }) });
    setLinkOpen(null); load();
  }

  async function linkMenu(id: string) {
    await fetch(`${API()}/api/gallery/${photoId}/link-menu-item`,
                  { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ target_id: id }) });
    setLinkOpen(null); load();
  }

  async function like() {
    await fetch(`${API()}/api/gallery/${photoId}/like`,
                  { method: "POST", headers: { "X-User-Id": "chef-william" } });
    load();
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await fetch(`${API()}/api/gallery/${photoId}/notes`,
                  { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: noteText.trim() }) });
    setNoteText(""); load();
  }

  if (!photo) return null;

  return (
    <div data-testid="gallery-viewer" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999990, background: "#000",
      overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()}>
        {/* Hero image */}
        <div style={{ position: "relative", width: "100%", background: "#000" }}>
          {photo.blob_url && (
            <img src={photo.blob_url} alt={photo.label}
              style={{ width: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }} />
          )}
          <button data-testid="gallery-viewer-close" onClick={onClose}
            style={{
              position: "absolute", top: 14, right: 14,
              width: 36, height: 36, borderRadius: 18, fontSize: 18,
              background: "rgba(0,0,0,0.6)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}>×</button>
          <button data-testid="gallery-like-btn" onClick={like}
            style={{
              position: "absolute", top: 14, left: 14,
              padding: "8px 14px", borderRadius: 18, fontSize: 13,
              background: "rgba(0,0,0,0.6)", color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.4)", cursor: "pointer",
              backdropFilter: "blur(6px)", fontWeight: 600,
            }}>♥ {photo.heart_count || 0}</button>
        </div>

        <div style={{ padding: "20px 18px 30px", color: "#f5efe4",
                        background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 28, fontWeight: 300, margin: 0, lineHeight: 1.1,
            letterSpacing: -0.3,
          }}>{photo.label}</h1>
          {photo.auto_name && photo.auto_name !== photo.label && (
            <div style={{ fontSize: 11, color: "#8b8680", fontStyle: "italic", marginTop: 4 }}>
              AI-recognized as: {photo.auto_name}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#5a554d", marginTop: 6, letterSpacing: 0.5 }}>
            {photo.created_at?.slice(0, 10)} · {photo.chef_id} · {photo.outlet_id}
          </div>

          {/* Linked refs */}
          {(photo.recipe || photo.menu_item) && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {photo.recipe && (
                <div data-testid="viewer-linked-recipe" style={linkedRow("rgba(212,175,55,0.15)", "rgba(212,175,55,0.4)", "#d4af37")}>
                  <span style={{ fontSize: 9, letterSpacing: 2, fontWeight: 700, opacity: 0.85 }}>RECIPE</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{photo.recipe.name}</span>
                </div>
              )}
              {photo.menu_item && (
                <div data-testid="viewer-linked-menu" style={linkedRow("rgba(96,165,250,0.15)", "rgba(96,165,250,0.4)", "#60a5fa")}>
                  <span style={{ fontSize: 9, letterSpacing: 2, fontWeight: 700, opacity: 0.85 }}>MENU ITEM</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{photo.menu_item.name}{photo.menu_item.price && ` · $${photo.menu_item.price}`}</span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons — Recipe / Menu Item / Recognize / Dish Assembly / Waste */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 18 }}>
            <ActionBtn testid="viewer-link-recipe" onClick={() => setLinkOpen("recipe")}
              icon="📖" label={photo.recipe_id ? "Change recipe" : "Link recipe"}
              color="#d4af37" />
            <ActionBtn testid="viewer-link-menu" onClick={() => setLinkOpen("menu")}
              icon="🍽" label={photo.menu_item_id ? "Change menu item" : "Link menu item"}
              color="#60a5fa" />
            <ActionBtn testid="viewer-recognize" onClick={recognize}
              icon="🔍" label={recoBusy ? "Recognizing…" : "Recognize"} color="#a855f7" />
            <ActionBtn testid="viewer-dish-assembly" onClick={() => {
              window.dispatchEvent(new CustomEvent("echo:open-dish-assembly",
                { detail: { photo_id: photoId, label: photo.label } }));
            }} icon="🧬" label="Dish Assembly" color="#22d3ee" />
          </div>

          {/* Recognition results */}
          {reco && (
            <div data-testid="viewer-reco-block" style={{
              marginTop: 14, padding: 12, borderRadius: 8,
              background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.25)",
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#a855f7", fontWeight: 700,
                              marginBottom: 6 }}>
                🔍 RECOGNIZED — {(reco.detected_items || []).join(", ") || "no detection"}
              </div>
              {(reco.recipes || []).slice(0, 4).map((rc: any) => (
                <button key={rc.id} data-testid={`viewer-reco-recipe-${rc.id}`}
                  onClick={() => linkRecipe(rc.id)}
                  style={recoBtn}>📖 {rc.name} <span style={{ fontSize: 9, opacity: 0.6 }}>· tap to link</span></button>
              ))}
              {(reco.menu_items || []).slice(0, 4).map((mi: any) => (
                <button key={mi.id} data-testid={`viewer-reco-menu-${mi.id}`}
                  onClick={() => linkMenu(mi.id)}
                  style={recoBtn}>🍽 {mi.name} <span style={{ fontSize: 9, opacity: 0.6 }}>· tap to link</span></button>
              ))}
            </div>
          )}

          {/* Notes */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#d4af37", fontWeight: 700,
                            marginBottom: 6 }}>CHEF NOTES</div>
            {(photo.notes || []).map((n: any) => (
              <div key={n.id} data-testid={`viewer-note-${n.id}`} style={{
                padding: 10, marginBottom: 6, borderRadius: 6,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 12, color: "#cbc5b9", lineHeight: 1.4,
              }}>
                <div>{n.text}</div>
                <div style={{ fontSize: 9, color: "#5a554d", marginTop: 4 }}>
                  — {n.author_id} · {n.created_at?.slice(0, 16)}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input data-testid="viewer-note-input" value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Pairing, plating cue, costing tweak…"
                style={{
                  flex: 1, padding: "8px 12px", fontSize: 12, borderRadius: 6,
                  background: "rgba(255,255,255,0.04)", color: "#f5efe4",
                  border: "1px solid rgba(255,255,255,0.1)", fontFamily: "inherit",
                }} />
              <button data-testid="viewer-note-save" onClick={addNote} style={{
                padding: "8px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
                color: "#d4af37", cursor: "pointer", letterSpacing: 0.5,
              }}>SAVE</button>
            </div>
          </div>
        </div>

        {linkOpen && <LinkPicker mode={linkOpen}
          onPickRecipe={linkRecipe} onPickMenu={linkMenu}
          onClose={() => setLinkOpen(null)} />}
      </div>
    </div>
  );
}


function linkedRow(bg: string, border: string, color: string): React.CSSProperties {
  return {
    padding: "8px 12px", borderRadius: 6, background: bg,
    border: `1px solid ${border}`, color, display: "flex", gap: 10, alignItems: "center",
  };
}


function ActionBtn({ testid, onClick, icon, label, color }: {
  testid: string; onClick: () => void; icon: string; label: string; color: string;
}) {
  return (
    <button data-testid={testid} onClick={onClick} style={{
      padding: "10px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
      background: `${color}1a`, border: `1px solid ${color}55`, color,
      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      letterSpacing: 0.5, fontFamily: "inherit", textAlign: "left",
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{label}
    </button>
  );
}


const recoBtn: React.CSSProperties = {
  display: "block", width: "100%", padding: "8px 10px", marginBottom: 4,
  background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)",
  color: "#cbc5b9", fontSize: 11, borderRadius: 4, textAlign: "left",
  cursor: "pointer", fontFamily: "inherit",
};


function LinkPicker({ mode, onPickRecipe, onPickMenu, onClose }: {
  mode: "recipe" | "menu";
  onPickRecipe: (id: string) => void;
  onPickMenu: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    const url = mode === "recipe"
      ? `${API()}/api/gallery/recipe-options${q ? `?q=${encodeURIComponent(q)}` : ""}`
      : `${API()}/api/gallery/menu-item-options${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    fetch(url).then((r) => r.json()).then((d) => setRows(d?.rows || [])).catch(() => undefined);
  }, [mode, q]);

  return (
    <div data-testid={`gallery-link-picker-${mode}`} onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999991, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", background: "#0a0a0a", borderRadius: "14px 14px 0 0",
        padding: 14, paddingBottom: 30, maxHeight: "75vh", display: "flex", flexDirection: "column",
        border: `1px solid ${mode === "recipe" ? "rgba(212,175,55,0.4)" : "rgba(96,165,250,0.4)"}`,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3,
                        color: mode === "recipe" ? "#d4af37" : "#60a5fa",
                        fontWeight: 700, marginBottom: 10 }}>
          {mode === "recipe" ? "📖 LINK A RECIPE" : "🍽 LINK A MENU ITEM"}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
          placeholder="Search…"
          style={{ padding: 10, borderRadius: 6, marginBottom: 10,
                      background: "rgba(255,255,255,0.05)", color: "#f5efe4",
                      border: "1px solid rgba(255,255,255,0.1)", fontFamily: "inherit", fontSize: 13 }} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {rows.map((r) => (
            <button key={r.id} data-testid={`gallery-pick-${mode}-${r.id}`}
              onClick={() => mode === "recipe" ? onPickRecipe(r.id) : onPickMenu(r.id)}
              style={{
                width: "100%", padding: 10, marginBottom: 4, borderRadius: 5,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                color: "#f5efe4", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{r.name}</div>
              {(r.category || r.yield) && (
                <div style={{ fontSize: 10, color: "#8b8680", marginTop: 2 }}>
                  {r.category || r.yield}{r.price && ` · $${r.price}`}
                </div>
              )}
            </button>
          ))}
          {rows.length === 0 && (
            <div style={{ color: "#5a554d", padding: 20, textAlign: "center", fontSize: 12 }}>
              No matches.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
