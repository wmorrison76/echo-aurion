/** iter244 · Desktop Gallery — ultra-modern editorial layout.
 *
 * Tightly integrated with iter244 backend (gallery_iter244.py):
 *   - Pinterest-style masonry grid
 *   - Side-rail filters (outlet · station · status · search)
 *   - Side panel detail with tabs: Story · Recipe · Menu · Waste · Notes
 *   - One-click link to Recipe / Menu Item / Dish Assembly / Waste
 *   - "Recognize" runs vision + suggests links
 */
import React from "react";
import { API } from "@/lib/api-url";

type Photo = {
  id: string; label: string; auto_name?: string; confirmed?: boolean;
  blob_url?: string; outlet_id?: string;
  station?: { name?: string }; recipe?: any; menu_item?: any;
  recipe_id?: string; menu_item_id?: string; waste_event_id?: string;
  heart_count?: number; created_at: string; chef_id?: string;
};

const ACCENT = "#d4af37";

export default function DesktopGalleryAlpha() {
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [active, setActive] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [outletFilter, setOutletFilter] = React.useState<string>("all");
  const [confirmFilter, setConfirmFilter] = React.useState<"all" | "confirmed" | "unconfirmed" | "linked">("all");
  const [outlets, setOutlets] = React.useState<any[]>([]);

  const load = React.useCallback(() => {
    const qs = new URLSearchParams({ limit: "120" });
    if (search) qs.set("q", search);
    if (outletFilter !== "all") qs.set("outlet_id", outletFilter);
    if (confirmFilter === "confirmed") qs.set("only_confirmed", "true");
    fetch(`${API()}/api/gallery/list?${qs}`)
      .then((r) => r.json()).then((d) => {
        let rows = d?.rows || [];
        if (confirmFilter === "unconfirmed") rows = rows.filter((p: Photo) => !p.confirmed);
        if (confirmFilter === "linked") rows = rows.filter((p: Photo) => p.recipe_id || p.menu_item_id);
        setPhotos(rows);
      }).catch(() => undefined);
  }, [search, outletFilter, confirmFilter]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    fetch(`${API()}/api/outlets`).then((r) => r.json())
      .then((d) => setOutlets(d?.rows || [])).catch(() => undefined);
  }, []);

  const activeP = photos.find((p) => p.id === active);

  return (
    <div data-testid="desktop-gallery" style={{
      display: "flex", height: "100%", width: "100%",
      background: "#0a0a0a", color: "#f5efe4",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Left sidebar — filters */}
      <aside style={{
        width: 260, padding: "28px 22px", borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
        flexShrink: 0, overflowY: "auto",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: ACCENT, fontWeight: 600 }}>
          ECHOBOOK EDITORIAL
        </div>
        <h1 data-testid="desktop-gallery-title" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 38, fontWeight: 200, color: "#f5efe4",
          margin: "8px 0 4px", letterSpacing: -1, lineHeight: 1.05,
        }}>The Pass</h1>
        <div style={{ fontSize: 11, color: "#8b8680", fontStyle: "italic", marginBottom: 28 }}>
          Award-worthy work, archived in style.
        </div>

        <Field label="Search" testid="dg-search-field">
          <input data-testid="dg-search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Dish, ingredient, technique…" style={inputStyle} />
        </Field>

        <Field label="Outlet">
          <select data-testid="dg-outlet" value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)} style={inputStyle}>
            <option value="all">All outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(["all", "confirmed", "unconfirmed", "linked"] as const).map((c) => (
              <button key={c} data-testid={`dg-confirm-${c}`}
                onClick={() => setConfirmFilter(c)}
                style={{
                  textAlign: "left", padding: "8px 12px", borderRadius: 6,
                  fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                  background: confirmFilter === c ? "rgba(212,175,55,0.12)" : "transparent",
                  border: `1px solid ${confirmFilter === c ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color: confirmFilter === c ? ACCENT : "#8b8680",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                {c === "all" ? "All photos"
                  : c === "confirmed" ? "Confirmed only"
                  : c === "unconfirmed" ? "Needs review"
                  : "Linked to recipe/menu"}
              </button>
            ))}
          </div>
        </Field>

        <div style={{ marginTop: 24, padding: 14, borderRadius: 8,
                        background: "rgba(212,175,55,0.05)",
                        border: "1px solid rgba(212,175,55,0.2)" }}>
          <div style={{ fontSize: 9, letterSpacing: 2.5, color: ACCENT, fontWeight: 700, marginBottom: 6 }}>
            CONNECTED TO
          </div>
          <div style={{ fontSize: 11, color: "#cbc5b9", lineHeight: 1.7 }}>
            📖 Recipes<br />🍽 Menu Builder<br />🧬 Dish Assembly<br />♻️ Waste App
          </div>
        </div>
      </aside>

      {/* Main grid */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 22 }}>
          <div data-testid="dg-count" style={{ fontSize: 12, color: "#8b8680", letterSpacing: 0.5 }}>
            {photos.length} dishes · {photos.filter((p) => p.recipe_id).length} linked to recipes
          </div>
          <div style={{ fontSize: 9, color: "#5a554d", letterSpacing: 2 }}>
            HOVER FOR DETAILS · CLICK TO OPEN
          </div>
        </div>

        <style>{`
          [data-testid='dg-tile'] { transition: transform 280ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 280ms; }
          [data-testid='dg-tile']:hover { transform: translateY(-4px); box-shadow: 0 24px 60px -12px rgba(212,175,55,0.4); }
        `}</style>

        <div data-testid="dg-grid" style={{
          columnCount: 4, columnGap: 14,
        }}>
          {photos.length === 0 && (
            <div style={{ color: "#5a554d", textAlign: "center",
                            padding: 60, fontStyle: "italic", fontSize: 14 }}>
              No dishes yet matching this filter.
            </div>
          )}
          {photos.map((p, i) => {
            const aspects = ["1/1", "4/5", "3/4", "1/1", "5/4", "2/3"];
            const ar = aspects[i % aspects.length];
            return (
              <button key={p.id} data-testid="dg-tile"
                onClick={() => setActive(p.id)}
                style={{
                  display: "block", width: "100%", marginBottom: 14, padding: 0,
                  border: "none", background: "transparent", cursor: "pointer",
                  position: "relative", breakInside: "avoid", aspectRatio: ar,
                }}>
                {p.blob_url ? (
                  <img src={p.blob_url} alt={p.label}
                    style={{ width: "100%", height: "100%", objectFit: "cover",
                                display: "block", borderRadius: 4 }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", borderRadius: 4,
                                  background: "rgba(255,255,255,0.04)",
                                  display: "flex", alignItems: "center",
                                  justifyContent: "center", color: "#5a554d", fontSize: 36 }}>🍽</div>
                )}
                <div style={{
                  position: "absolute", inset: 0, padding: 14,
                  background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%)",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end",
                  borderRadius: 4, color: "#f5efe4", textAlign: "left",
                }}>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif",
                                  fontSize: 16, fontWeight: 400, lineHeight: 1.15,
                                  letterSpacing: -0.2, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
                    {p.label}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    {p.recipe_id    && <Pill bg="rgba(212,175,55,0.35)" color="#fbd24a">RECIPE</Pill>}
                    {p.menu_item_id && <Pill bg="rgba(96,165,250,0.35)" color="#93c5fd">MENU</Pill>}
                    {!p.confirmed   && <Pill bg="rgba(245,158,11,0.35)" color="#fbbf24">REVIEW</Pill>}
                    {(p.heart_count ?? 0) > 0 && <Pill bg="rgba(239,68,68,0.35)" color="#fca5a5">♥{p.heart_count}</Pill>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Right detail rail */}
      {activeP && <DetailRail photoId={activeP.id} onClose={() => { setActive(null); load(); }} />}
    </div>
  );
}


function DetailRail({ photoId, onClose }: { photoId: string; onClose: () => void }) {
  const [photo, setPhoto] = React.useState<any>(null);
  const [tab, setTab] = React.useState<"story" | "recipe" | "menu" | "waste" | "notes">("story");
  const [reco, setReco] = React.useState<any>(null);
  const [recoBusy, setRecoBusy] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState<"recipe" | "menu" | null>(null);
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

  async function pick(kind: "recipe" | "menu", id: string) {
    const url = kind === "recipe" ? "link-recipe" : "link-menu-item";
    await fetch(`${API()}/api/gallery/${photoId}/${url}`,
                  { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ target_id: id }) });
    setLinkOpen(null); load();
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
    <aside data-testid="dg-rail" style={{
      width: 460, background: "#0a0a0a", borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
        {photo.blob_url && (
          <img src={photo.blob_url} alt={photo.label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <button data-testid="dg-rail-close" onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 17,
          background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 16,
          border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}>×</button>
      </div>

      <div style={{ padding: "20px 24px 14px" }}>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 26, fontWeight: 300, margin: 0, lineHeight: 1.1,
          letterSpacing: -0.3, color: "#f5efe4",
        }}>{photo.label}</h2>
        <div style={{ fontSize: 11, color: "#5a554d", marginTop: 6, letterSpacing: 0.4 }}>
          {photo.created_at?.slice(0, 10)} · {photo.chef_id} · {photo.outlet_id}
        </div>
      </div>

      <div style={{ display: "flex", padding: "0 16px", gap: 4,
                      borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {(["story", "recipe", "menu", "waste", "notes"] as const).map((t) => (
          <button key={t} data-testid={`dg-rail-tab-${t}`}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 14px", fontSize: 10, fontWeight: 700,
              background: "transparent", border: "none", letterSpacing: 1.5,
              color: tab === t ? ACCENT : "#5a554d", cursor: "pointer",
              borderBottom: `2px solid ${tab === t ? ACCENT : "transparent"}`,
              fontFamily: "inherit", textTransform: "uppercase",
            }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
        {tab === "story" && (
          <div>
            {photo.auto_name && photo.auto_name !== photo.label && (
              <div style={{ fontSize: 11, color: "#8b8680", fontStyle: "italic", marginBottom: 10 }}>
                AI recognized: {photo.auto_name}
              </div>
            )}
            <button data-testid="dg-recognize" onClick={recognize}
              style={primaryBtn("#a855f7")}>
              {recoBusy ? "Recognizing…" : "🔍 Run vision recognition"}
            </button>
            {reco && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8,
                              background: "rgba(168,85,247,0.06)",
                              border: "1px solid rgba(168,85,247,0.25)" }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#a855f7", fontWeight: 700, marginBottom: 8 }}>
                  DETECTED · {(reco.detected_items || []).join(", ") || "—"}
                </div>
                <div style={{ fontSize: 10, color: "#8b8680", marginBottom: 6 }}>SUGGESTED RECIPES</div>
                {(reco.recipes || []).slice(0, 4).map((rc: any) => (
                  <button key={rc.id} onClick={() => pick("recipe", rc.id)}
                    data-testid={`dg-reco-recipe-${rc.id}`} style={recoBtn}>📖 {rc.name}</button>
                ))}
                <div style={{ fontSize: 10, color: "#8b8680", margin: "8px 0 6px" }}>SUGGESTED MENU ITEMS</div>
                {(reco.menu_items || []).slice(0, 4).map((mi: any) => (
                  <button key={mi.id} onClick={() => pick("menu", mi.id)}
                    data-testid={`dg-reco-menu-${mi.id}`} style={recoBtn}>🍽 {mi.name}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "recipe" && (
          <div>
            {photo.recipe ? (
              <div data-testid="dg-rail-recipe" style={{
                padding: 14, borderRadius: 8,
                background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.3)",
              }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: ACCENT, fontWeight: 700, marginBottom: 6 }}>
                  LINKED RECIPE
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#f5efe4" }}>{photo.recipe.name}</div>
                <div style={{ fontSize: 11, color: "#8b8680", marginTop: 4 }}>
                  Yield: {photo.recipe.yield || "—"} · Cost: {photo.recipe.cost || "—"}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "#8b8680", marginBottom: 10 }}>
                No recipe linked yet.
              </div>
            )}
            <button data-testid="dg-link-recipe" onClick={() => setLinkOpen("recipe")}
              style={{ ...primaryBtn(ACCENT), marginTop: 10 }}>
              📖 {photo.recipe ? "Change recipe" : "Link a recipe"}
            </button>
          </div>
        )}

        {tab === "menu" && (
          <div>
            {photo.menu_item ? (
              <div data-testid="dg-rail-menu" style={{
                padding: 14, borderRadius: 8,
                background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.3)",
              }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#60a5fa", fontWeight: 700, marginBottom: 6 }}>
                  LINKED MENU ITEM
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#f5efe4" }}>{photo.menu_item.name}</div>
                {photo.menu_item.price && (
                  <div style={{ fontSize: 11, color: "#8b8680", marginTop: 4 }}>
                    ${photo.menu_item.price} · This photo will appear as the hero on Menu Builder.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "#8b8680", marginBottom: 10 }}>
                No menu item linked yet. Linking sets this photo as the hero on Menu Builder.
              </div>
            )}
            <button data-testid="dg-link-menu" onClick={() => setLinkOpen("menu")}
              style={{ ...primaryBtn("#60a5fa"), marginTop: 10 }}>
              🍽 {photo.menu_item ? "Change menu item" : "Link menu item"}
            </button>
          </div>
        )}

        {tab === "waste" && (
          <div>
            {photo.waste_event ? (
              <div data-testid="dg-rail-waste" style={{
                padding: 14, borderRadius: 8,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)",
              }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#ef4444", fontWeight: 700, marginBottom: 6 }}>
                  LINKED WASTE EVENT
                </div>
                <div style={{ fontSize: 13, color: "#f5efe4" }}>
                  {photo.waste_event.kind || "Waste event"}
                </div>
                <div style={{ fontSize: 10, color: "#8b8680", marginTop: 4 }}>
                  {photo.waste_event.created_at?.slice(0, 16)}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "#8b8680" }}>
                Waste linking helps Echo's recognizer learn what NOT to send out.
              </div>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div>
            {(photo.notes || []).map((n: any) => (
              <div key={n.id} data-testid={`dg-rail-note-${n.id}`} style={{
                padding: 12, marginBottom: 8, borderRadius: 6,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 12, color: "#cbc5b9", lineHeight: 1.4 }}>{n.text}</div>
                <div style={{ fontSize: 9, color: "#5a554d", marginTop: 6 }}>
                  — {n.author_id} · {n.created_at?.slice(0, 16)}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input data-testid="dg-rail-note-input" value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Pairing, plating cue, costing tweak…"
                style={{ ...inputStyle, flex: 1 }} />
              <button data-testid="dg-rail-note-save" onClick={addNote} style={primaryBtn(ACCENT)}>SAVE</button>
            </div>
          </div>
        )}
      </div>

      {linkOpen && (
        <DesktopLinkPicker mode={linkOpen}
          onPick={(id) => pick(linkOpen, id)}
          onClose={() => setLinkOpen(null)} />
      )}
    </aside>
  );
}


function DesktopLinkPicker({ mode, onPick, onClose }: {
  mode: "recipe" | "menu";
  onPick: (id: string) => void;
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
    <div data-testid={`dg-rail-picker-${mode}`} onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 500, maxHeight: "70vh", background: "#0a0a0a",
        borderRadius: 10, padding: 18, display: "flex", flexDirection: "column",
        border: `1px solid ${mode === "recipe" ? "rgba(212,175,55,0.4)" : "rgba(96,165,250,0.4)"}`,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3,
                        color: mode === "recipe" ? ACCENT : "#60a5fa",
                        fontWeight: 700, marginBottom: 12 }}>
          {mode === "recipe" ? "📖 LINK A RECIPE" : "🍽 LINK A MENU ITEM"}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
          placeholder="Search…" style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {rows.map((r) => (
            <button key={r.id} data-testid={`dg-rail-pick-${mode}-${r.id}`}
              onClick={() => onPick(r.id)}
              style={{
                width: "100%", padding: 12, marginBottom: 4, borderRadius: 6,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                color: "#f5efe4", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
              {(r.category || r.yield) && (
                <div style={{ fontSize: 10, color: "#8b8680", marginTop: 2 }}>
                  {r.category || r.yield}{r.price && ` · $${r.price}`}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


function Field({ label, children, testid }: { label: string; children: React.ReactNode; testid?: string }) {
  return (
    <div style={{ marginBottom: 16 }} data-testid={testid}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#8b8680",
                      fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Pill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 8, letterSpacing: 1.5, padding: "2px 6px", borderRadius: 3,
      background: bg, color, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.5)",
    }}>{children}</span>
  );
}


const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 6,
  background: "rgba(255,255,255,0.04)", color: "#f5efe4",
  border: "1px solid rgba(255,255,255,0.08)", fontSize: 12,
  fontFamily: "inherit", outline: "none",
};

function primaryBtn(color: string): React.CSSProperties {
  return {
    width: "100%", padding: "10px 14px", borderRadius: 6,
    background: `${color}1a`, border: `1px solid ${color}66`, color,
    fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
    cursor: "pointer", fontFamily: "inherit",
  };
}

const recoBtn: React.CSSProperties = {
  display: "block", width: "100%", padding: "8px 10px", marginBottom: 4,
  background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)",
  color: "#cbc5b9", fontSize: 11, borderRadius: 4, textAlign: "left",
  cursor: "pointer", fontFamily: "inherit",
};
