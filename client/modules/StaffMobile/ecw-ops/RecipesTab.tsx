/** iter228 · Recipes tab — standard format + URL import + Echo Chef.
 *
 * William's asks:
 *  - Standard format (title · yield · allergens · calories · ingredients · method) matching desktop
 *  - Import from URL (Paprika-style) via /api/ecw-ops/recipes/import-url
 *  - Echo Chef "create in my style" with flavor-signature preservation
 *  - Allergens + calories on every recipe
 */
import React from "react";
import { API } from "@/lib/api-url";

type RecipeDetail = any;
type Mode = "list" | "detail" | "import" | "echo-chef" | "drafts";

export function RecipesTab({ outletId }: { outletId: string }) {
  const [mode, setMode] = React.useState<Mode>("list");
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState<RecipeDetail | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const q = query ? `&q=${encodeURIComponent(query)}` : "";
      fetch(`${API()}/api/ecw-ops/recipes?outlet_id=${outletId}${q}`)
        .then((r) => r.json()).then((d) => setRows(d?.rows || []));
    }, 200);
    return () => clearTimeout(t);
  }, [query, outletId]);

  if (open) return <RecipeDetailView recipe={open} onBack={() => setOpen(null)} />;
  if (mode === "import") return <ImportUrlView outletId={outletId} onDone={() => setMode("list")} />;
  if (mode === "echo-chef") return <EchoChefView outletId={outletId} onDone={() => setMode("drafts")} />;
  if (mode === "drafts") return <DraftsView onBack={() => setMode("list")} />;

  return (
    <div data-testid="recipes-root" style={{ padding: 16 }}>
      {/* Action buttons row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
        <ActionBtn testid="recipes-import-btn" onClick={() => setMode("import")}
          icon="🔗" label="From URL" />
        <ActionBtn testid="recipes-echo-chef-btn" onClick={() => setMode("echo-chef")}
          icon="👨‍🍳" label="Echo Chef" />
        <ActionBtn testid="recipes-drafts-btn" onClick={() => setMode("drafts")}
          icon="📝" label="Drafts" />
      </div>

      <input data-testid="recipes-search" placeholder="Search recipes…"
        value={query} onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8,
          color: "#f5efe4", fontSize: 14, marginBottom: 14,
        }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.length === 0 && (
          <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: 24 }}>
            No recipes match. Try Echo Chef to generate one in your style.
          </div>
        )}
        {rows.map((r) => {
          const photo = r.image || r.photo_url || r.hero_image || r.thumbnail_url;
          const fcPct = r.food_cost_pct;
          const fcColor = fcPct == null ? "#94a3b8"
            : fcPct <= 28 ? "#34d399" : fcPct <= 34 ? "#fbbf24" : "#fca5a5";
          return (
            <button key={r.id} data-testid={`recipe-${r.id}`} onClick={() => setOpen(r)}
              style={{
                padding: 10, background: "rgba(200,169,126,0.04)",
                border: "1px solid rgba(200,169,126,0.15)", borderRadius: 6,
                color: "#f5efe4", textAlign: "left", fontSize: 14, cursor: "pointer",
                display: "flex", gap: 10, alignItems: "center",
              }}>
              {/* Thumbnail (Paprika style) */}
              <div data-testid={`recipe-thumb-${r.id}`} style={{
                width: 54, height: 54, flex: "0 0 54px", borderRadius: 4,
                background: photo ? `url(${photo}) center/cover` : "linear-gradient(135deg, rgba(200,169,126,0.2), rgba(139,115,80,0.2))",
                border: "1px solid rgba(200,169,126,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: "rgba(200,169,126,0.5)",
              }}>
                {!photo && "📖"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 500 }}>{r.item_name || r.title || r.name || "Untitled recipe"}</span>
                  {r.published_from === "mobile" && (
                    <span data-testid={`mobile-authored-${r.id}`}
                      style={{ fontSize: 8, letterSpacing: 1.5, padding: "1px 5px",
                                background: "rgba(94,234,212,0.12)",
                                border: "1px solid rgba(94,234,212,0.35)",
                                color: "#5eead4", borderRadius: 3, textTransform: "uppercase" }}>
                      📱
                    </span>
                  )}
                  {r.pos_mapped && (
                    <span data-testid={`pos-mapped-${r.id}`}
                      style={{ fontSize: 9, color: "#34d399" }}>✓</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {r.menu_price > 0 && <span style={{ color: "#d4af37" }}>${(+r.menu_price).toFixed(2)}</span>}
                  {fcPct != null && <span style={{ color: fcColor }}>{fcPct}% F/C</span>}
                  {r.station_id && <span>· {r.station_id}</span>}
                  {r.yield_qty && <span>· y{r.yield_qty} {r.yield_unit}</span>}
                </div>
              </div>
              <span style={{ color: "#c8a97e", fontSize: 11 }}>→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


function ActionBtn({ testid, icon, label, onClick }: {
  testid: string; icon: string; label: string; onClick: () => void;
}) {
  return (
    <button data-testid={testid} onClick={onClick}
      style={{
        padding: "10px 6px", background: "rgba(200,169,126,0.08)",
        border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6,
        color: "#c8a97e", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
    </button>
  );
}


// ── Standard Recipe Detail — EchoBook editorial book style (iter234) ────
function RecipeDetailView({ recipe, onBack }: { recipe: any; onBack: () => void }) {
  const [smsPhone, setSmsPhone] = React.useState("");
  const [smsMsg, setSmsMsg] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"ingredients" | "directions">("ingredients");

  async function sendSms() {
    if (!smsPhone) { alert("Enter cook's phone first (+1...)"); return; }
    const r = await fetch(`${API()}/api/ecw-ops/recipes/sms`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe_id: recipe.id, phone: smsPhone }),
    }).then((r) => r.json());
    setSmsMsg(r.ok ? `✓ ${r.mode === "sms_sent" ? "Sent" : "Queued (Twilio pending)"}` : "✗ Failed");
    setTimeout(() => setSmsMsg(null), 4000);
  }

  const allergens = recipe.allergens || [];
  const calories = recipe.calories_per_serving;
  const ingredients = recipe.ingredients || recipe.components || [];
  const steps = recipe.prep_steps || recipe.instructions || [];

  // EchoBook editorial book styling — editorial serif, wide margins, small caps
  const SERIF = 'Georgia, "Cormorant Garamond", "Libre Caslon Text", serif';

  return (
    <div data-testid="recipe-detail-root" style={{
      padding: "18px 20px 24px",
      background: "linear-gradient(180deg, #f5efe4 0%, #ebe2d1 100%)",
      color: "#1a1710",
      minHeight: "calc(100vh - 180px)",
      fontFamily: SERIF,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <button data-testid="recipe-back" onClick={onBack}
          style={{ fontSize: 10, letterSpacing: 2, color: "#6b5b3d",
                    background: "none", border: "1px solid rgba(107,91,61,0.3)",
                    padding: "4px 10px", borderRadius: 2, cursor: "pointer",
                    textTransform: "uppercase", fontFamily: "inherit" }}>
          ← Back to recipes
        </button>
        <button data-testid="recipe-edit-pencil"
          onClick={() => window.dispatchEvent(new CustomEvent("echo:edit-recipe", { detail: { recipe } }))}
          style={{ fontSize: 14, color: "#8b7350",
                    background: "rgba(139,115,80,0.08)", border: "1px solid rgba(139,115,80,0.25)",
                    padding: "4px 10px", borderRadius: 2, cursor: "pointer" }}>
          ✏️
        </button>
      </div>

      {/* ── Title block — editorial ─────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 9, letterSpacing: 6, color: "#8b7350",
                        textTransform: "uppercase", marginBottom: 10 }}>
          — {recipe.station_name || recipe.station_id || recipe.category || "Main"}
          {recipe.pos_mapped && <span style={{ color: "#2e7a3d", marginLeft: 10 }}>✓ POS MAPPED</span>}
          {" —"}
        </div>
        <h1 style={{ fontSize: 26, lineHeight: 1.15, margin: "0 0 4px",
                       fontWeight: 400, fontStyle: "italic",
                       color: "#0a0804" }}>
          {recipe.item_name}
        </h1>
        <div style={{ fontSize: 11, color: "#6b5b3d", letterSpacing: 1,
                        textTransform: "uppercase" }}>
          Serves {recipe.yield_qty} {recipe.yield_unit}
          {recipe.cost != null && recipe.cost > 0 && ` · Food cost $${(+recipe.cost).toFixed(2)}`}
          {recipe.menu_price && recipe.menu_price > 0 && ` · Menu $${(+recipe.menu_price).toFixed(2)}`}
        </div>
        {recipe.food_cost_pct != null && recipe.menu_price > 0 && (
          <div style={{ marginTop: 6 }}>
            <span data-testid="recipe-food-cost-pct" style={{
              display: "inline-block", padding: "3px 12px", fontSize: 10, letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 700,
              color: recipe.food_cost_pct <= 28 ? "#2e7a3d" :
                       recipe.food_cost_pct <= 34 ? "#9a7a15" : "#9a1f1f",
              background: recipe.food_cost_pct <= 28 ? "rgba(46,122,61,0.10)" :
                            recipe.food_cost_pct <= 34 ? "rgba(154,122,21,0.10)" : "rgba(154,31,31,0.10)",
              border: `1px solid ${recipe.food_cost_pct <= 28 ? "rgba(46,122,61,0.3)" :
                                      recipe.food_cost_pct <= 34 ? "rgba(154,122,21,0.3)" : "rgba(154,31,31,0.3)"}`,
            }}>
              F/C {recipe.food_cost_pct}%
            </span>
          </div>
        )}
      </div>

      {/* Hero photo (from imported URL or uploaded) */}
      {(recipe.image || recipe.photo_url || recipe.hero_image) && (
        <div style={{ margin: "18px auto 10px", maxWidth: 320, textAlign: "center" }}>
          <img src={recipe.image || recipe.photo_url || recipe.hero_image}
            alt={recipe.item_name} data-testid="recipe-hero-photo"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            style={{ maxWidth: "100%", borderRadius: 4, border: "1px solid rgba(139,115,80,0.35)",
                      maxHeight: 240, objectFit: "cover" }} />
        </div>
      )}

      {/* Source URL pill (if imported) */}
      {recipe.source_url && (
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <a data-testid="recipe-source-url" href={recipe.source_url} target="_blank" rel="noreferrer"
            style={{ fontSize: 10, letterSpacing: 2, color: "#8b7350",
                      textTransform: "uppercase", textDecoration: "none",
                      borderBottom: "1px dotted #8b7350", paddingBottom: 1 }}>
            Imported · {new URL(recipe.source_url).hostname.replace("www.", "")}
          </a>
        </div>
      )}

      {/* Ornamental rule */}
      <div style={{ textAlign: "center", margin: "16px 0 14px" }}>
        <span style={{ color: "#8b7350", fontSize: 18, letterSpacing: 8 }}>· · ·</span>
      </div>

      {/* Nutrition + allergen chips — top 9 + vegan/veg/alcohol markers */}
      {(() => {
        // Collect all allergens: recipe-level + per-ingredient
        const ingAllergens = (recipe.ingredients || []).flatMap((i: any) => i.allergens || []);
        const combined = Array.from(new Set([...(allergens as string[]), ...ingAllergens]
          .map((a: string) => (a || "").toLowerCase())));
        const MARKERS: Record<string, { code: string; label: string; bg: string; fg: string }> = {
          "vegan":     { code: "Ve", label: "Vegan",     bg: "rgba(46,122,61,0.1)",  fg: "#2e7a3d" },
          "vegetarian":{ code: "V",  label: "Vegetarian",bg: "rgba(46,122,61,0.08)", fg: "#3d8a2e" },
          "dairy":     { code: "D",  label: "Dairy",     bg: "rgba(96,100,200,0.1)", fg: "#4858b8" },
          "milk":      { code: "D",  label: "Dairy",     bg: "rgba(96,100,200,0.1)", fg: "#4858b8" },
          "gluten":    { code: "G",  label: "Gluten",    bg: "rgba(154,122,21,0.1)", fg: "#8a6812" },
          "wheat":     { code: "G",  label: "Gluten",    bg: "rgba(154,122,21,0.1)", fg: "#8a6812" },
          "shellfish": { code: "S",  label: "Shellfish", bg: "rgba(160,20,60,0.1)",  fg: "#8a1f3a" },
          "fish":      { code: "F",  label: "Fish",      bg: "rgba(60,120,160,0.1)", fg: "#2a5a78" },
          "nuts":      { code: "N",  label: "Nuts",      bg: "rgba(140,70,10,0.1)",  fg: "#744010" },
          "tree-nut":  { code: "N",  label: "Tree nut",  bg: "rgba(140,70,10,0.1)",  fg: "#744010" },
          "peanut":    { code: "P",  label: "Peanut",    bg: "rgba(140,50,10,0.1)",  fg: "#743810" },
          "egg":       { code: "E",  label: "Egg",       bg: "rgba(200,160,40,0.1)", fg: "#8a7018" },
          "soy":       { code: "So", label: "Soy",       bg: "rgba(154,122,21,0.1)", fg: "#8a6812" },
          "sesame":    { code: "Se", label: "Sesame",    bg: "rgba(140,100,40,0.1)", fg: "#785a28" },
        };
        const shown = combined.filter((k) => MARKERS[k]).map((k) => MARKERS[k]);
        const hasAlcohol = (recipe.has_alcohol) || combined.includes("alcohol") ||
          (recipe.ingredients || []).some((i: any) => /wine|beer|vodka|whisk|rum|gin|bourbon|liqueur|spirit/i.test(i.name || ""));
        return (calories != null || shown.length > 0 || hasAlcohol) ? (
          <div data-testid="recipe-markers" style={{
            display: "flex", gap: 5, marginBottom: 18, flexWrap: "wrap",
            justifyContent: "center",
          }}>
            {calories != null && (
              <span style={{ padding: "3px 10px", fontSize: 9, letterSpacing: 2,
                              border: "1px solid #5a7a4a", color: "#3d5a2e",
                              textTransform: "uppercase", fontFamily: SERIF }}>
                {calories} cal
              </span>
            )}
            {shown.map((m, idx) => (
              <span key={m.code + idx} data-testid={`allergen-${m.code}`} title={m.label}
                style={{ padding: "3px 8px", fontSize: 10, letterSpacing: 1, fontWeight: 700,
                          border: `1px solid ${m.fg}`, color: m.fg, background: m.bg,
                          borderRadius: 3 }}>
                {m.code}
              </span>
            ))}
            {hasAlcohol && (
              <span data-testid="marker-alcohol"
                style={{ padding: "3px 10px", fontSize: 13,
                          border: "1px solid #a06a1f", background: "rgba(160,106,31,0.1)",
                          borderRadius: 3 }}>
                🥂
              </span>
            )}
          </div>
        ) : null;
      })()}

      {/* Ingredients / Directions tab switcher */}
      <div data-testid="recipe-tabs" style={{
        display: "flex", borderBottom: "1px solid rgba(139,115,80,0.3)",
        marginBottom: 18,
      }}>
        {(["ingredients", "directions"] as const).map((t) => (
          <button key={t} data-testid={`recipe-tab-${t}`} onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px 0", background: "none",
              border: "none", cursor: "pointer",
              fontFamily: SERIF, fontSize: 13,
              letterSpacing: 2, textTransform: "uppercase",
              color: tab === t ? "#8a2a2a" : "#6b5b3d",
              borderBottom: tab === t ? "2px solid #8a2a2a" : "2px solid transparent",
              marginBottom: -1, fontWeight: tab === t ? 600 : 400,
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "ingredients" && (
        ingredients.length === 0 ? (
          <em style={{ color: "#6b5b3d", fontSize: 12 }}>Ingredients to be noted.</em>
        ) : (
          <div data-testid="recipe-ingredients-panel" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {ingredients.map((ing: any, i: number) => {
              const name = typeof ing === "string"
                ? ing
                : (ing.name || ing.ingredient || ing.item_name || ing.label
                    || ing.ingredient_name || ing.ingredient_id || "—");
              const qty = typeof ing === "object" ? (ing.quantity || ing.quantity_g || ing.amount) : null;
              const unit = typeof ing === "object" ? (ing.unit || (ing.quantity_g ? "g" : "")) : "";
              const lineCost = typeof ing === "object" ? ing.line_cost : null;
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "95px 1fr auto",
                  gap: 14, fontSize: 13, lineHeight: 1.6,
                  borderBottom: i < ingredients.length - 1 ? "1px dotted rgba(139,115,80,0.25)" : "none",
                  padding: "5px 0",
                }}>
                  <span style={{ color: "#6b5b3d", fontStyle: "italic", textAlign: "right", fontWeight: 600 }}>
                    {qty ? `${qty} ${unit}`.trim() : ""}
                  </span>
                  <span style={{ color: "#1a1710" }}>{name}</span>
                  {lineCost != null && lineCost > 0 && (
                    <span style={{ color: "#8b7350", fontSize: 11, fontFamily: "monospace" }}>
                      ${(+lineCost).toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "directions" && (
        steps.length === 0 ? (
          <em style={{ color: "#6b5b3d", fontSize: 12 }}>Directions to be noted.</em>
        ) : (
          <ol data-testid="recipe-directions-panel" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {steps.map((s: any, i: number) => (
              <li key={i} style={{
                marginBottom: 14, paddingLeft: 32, position: "relative",
                fontSize: 14, lineHeight: 1.7, color: "#1a1710",
              }}>
                <span style={{
                  position: "absolute", left: 0, top: 0,
                  fontSize: 20, fontStyle: "italic", color: "#8b7350",
                  fontWeight: 400, lineHeight: 1.2,
                }}>{i + 1}.</span>
                {typeof s === "string" ? s : (s.instruction || s.step || JSON.stringify(s))}
              </li>
            ))}
          </ol>
        )
      )}

      {recipe.plating && (
        <Section title="To finish">
          <div style={{ fontStyle: "italic", fontSize: 14, color: "#1a1710", lineHeight: 1.7 }}>
            {recipe.plating}
          </div>
        </Section>
      )}

      {recipe.notes && (
        <div style={{ marginTop: 20, padding: 14,
                       borderTop: "1px solid rgba(139,115,80,0.3)",
                       borderBottom: "1px solid rgba(139,115,80,0.3)" }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: "#8b7350",
                          textTransform: "uppercase", marginBottom: 6 }}>
            Chef's Note
          </div>
          <div style={{ fontSize: 13, color: "#3d342a", fontStyle: "italic", lineHeight: 1.6 }}>
            {recipe.notes}
          </div>
        </div>
      )}

      {/* Ornamental close */}
      <div style={{ textAlign: "center", margin: "22px 0 18px" }}>
        <span style={{ color: "#8b7350", fontSize: 18, letterSpacing: 8 }}>· · ·</span>
      </div>

      {/* SMS (admin action — small footer card, off-style intentionally) */}
      <details data-testid="recipe-sms-details" style={{
        padding: 10, background: "rgba(10,14,26,0.04)",
        border: "1px solid rgba(139,115,80,0.3)", borderRadius: 4,
        fontFamily: "-apple-system, sans-serif",
      }}>
        <summary style={{ fontSize: 10, color: "#6b5b3d", letterSpacing: 2,
                            textTransform: "uppercase", cursor: "pointer" }}>
          📱 Send to cook
        </summary>
        <div style={{ marginTop: 8 }}>
          <input data-testid="recipe-sms-phone" type="tel" placeholder="+15551234567"
            value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", background: "#fff",
                      border: "1px solid #c8b894", borderRadius: 3,
                      color: "#1a1710", fontSize: 12, marginBottom: 6,
                      fontFamily: "inherit" }} />
          <button data-testid="recipe-sms-send" onClick={() => void sendSms()}
            style={{ width: "100%", padding: 8, background: "#6b5b3d",
                      border: "none", borderRadius: 3,
                      color: "#f5efe4", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      letterSpacing: 1 }}>
            Send via SMS
          </button>
          {smsMsg && (
            <div data-testid="recipe-sms-result"
              style={{ marginTop: 6, fontSize: 10, color: smsMsg.startsWith("✓") ? "#3d5a2e" : "#8a2a2a" }}>
              {smsMsg}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20, marginBottom: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: 5, color: "#8b7350",
                      textTransform: "uppercase", fontWeight: 600,
                      marginBottom: 12, textAlign: "center",
                      fontFamily: 'Georgia, "Cormorant Garamond", serif' }}>
        {title}
      </div>
      {children}
    </div>
  );
}


function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: "3px 8px", fontSize: 10, borderRadius: 3,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      letterSpacing: 0.5,
    }}>{label}</span>
  );
}


// ── Import From URL (editable preview with Paste + Search) ─────────────
function ImportUrlView({ outletId, onDone }: { outletId: string; onDone: () => void }) {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<any>(null);
  const [draftId, setDraftId] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editIngredients, setEditIngredients] = React.useState<string[]>([]);
  const [editDirections, setEditDirections] = React.useState<string[]>([]);
  const [dropSource, setDropSource] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function doImport() {
    if (!url.trim()) return;
    setLoading(true);
    setErr(null);
    setSaved(false);
    try {
      const r = await fetch(`${API()}/api/ecw-ops/recipes/import-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({ url: url.trim(), outlet_id: outletId }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.detail || "Import failed"); return; }
      // Unwrap nested structure from /api/recipe/import → { recipe: {...}, source: "..." }
      const recipeNode = (d?.recipe && typeof d.recipe === "object" && "recipe" in d.recipe)
        ? d.recipe.recipe
        : d?.recipe;
      setPreview(recipeNode || {});
      setDraftId(d?.draft_id || null);
      setEditTitle(recipeNode?.title || recipeNode?.name || "");
      setEditIngredients((recipeNode?.ingredients || []).map((ing: any) =>
        typeof ing === "string" ? ing : `${ing.quantity || ""} ${ing.unit || ""} ${ing.name || ing.ingredient || ""}`.trim()
      ));
      setEditDirections((recipeNode?.instructions || []).map((s: any) =>
        typeof s === "string" ? s : (s.instruction || s.text || "")
      ));
      setDropSource(false);
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveRecipe() {
    if (!editTitle.trim()) { setErr("Recipe name is required"); return; }
    setLoading(true);
    setErr(null);
    try {
      const payload = {
        title: editTitle.trim(),
        ingredients: editIngredients.filter((x) => x.trim()),
        instructions: editDirections.filter((x) => x.trim()),
        image: preview?.image || preview?.photo_url || null,
        source_url: dropSource ? null : (preview?.source_url || url.trim()),
        outlet_id: outletId,
        draft_id: draftId,
      };
      const r = await fetch(`${API()}/api/ecw-ops/recipes/save-imported`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.detail || "Save failed"); return; }
      setSaved(true);
      setTimeout(onDone, 1200);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch { /* permission denied */ }
  }

  return (
    <div data-testid="recipe-import-root" style={{ padding: 16 }}>
      <button onClick={onDone} data-testid="recipe-import-back"
        style={{ fontSize: 11, color: "#94a3b8", background: "none",
                  border: "1px solid rgba(148,163,184,0.2)", padding: "4px 10px",
                  borderRadius: 4, cursor: "pointer", marginBottom: 12 }}>
        ← Back
      </button>

      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Add Recipe</h2>
      <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
        Paste a recipe URL or search the web for a dish. We'll import it into
        the EchoBook editorial layout. Edit anything before saving.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input data-testid="recipe-import-url" value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          placeholder="Paste URL or search 'bread pudding recipe'"
          style={{ flex: 1, padding: "12px 14px", background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6,
                    color: "#f5efe4", fontSize: 13 }} />
        <button data-testid="recipe-import-paste" onClick={() => void pasteFromClipboard()}
          style={{ padding: "0 12px", background: "rgba(200,169,126,0.1)",
                    border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6,
                    color: "#c8a97e", fontSize: 11, cursor: "pointer" }}>
          📋
        </button>
      </div>

      <button data-testid="recipe-import-submit" onClick={() => void doImport()}
        disabled={loading || !url.trim()}
        style={{ width: "100%", padding: 12, background: "rgba(200,169,126,0.15)",
                  border: "1px solid rgba(200,169,126,0.4)", borderRadius: 6,
                  color: "#c8a97e", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  opacity: loading ? 0.5 : 1 }}>
        {loading ? "Fetching…" : url.startsWith("http") ? "🔗 Import from URL" : "🔎 Search the web"}
      </button>

      {err && <div data-testid="recipe-import-err" style={{ marginTop: 10, padding: 10,
                     background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)",
                     borderRadius: 4, color: "#fca5a5", fontSize: 11 }}>{err}</div>}

      {preview && (
        <div data-testid="recipe-import-preview" style={{ marginTop: 14, padding: 14,
                     background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.25)",
                     borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: "#10b981", letterSpacing: 2, marginBottom: 8 }}>✓ IMPORTED · EDIT BEFORE SAVING</div>

          {(preview.image || preview.photo_url) && (
            <img src={preview.image || preview.photo_url} alt=""
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              style={{ width: "100%", maxHeight: 180, objectFit: "cover",
                        borderRadius: 4, marginBottom: 10 }} />
          )}

          <Label>Recipe name</Label>
          <input data-testid="edit-recipe-title" value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={inputStyle} />

          <Label>Ingredients (one per line)</Label>
          <textarea data-testid="edit-recipe-ingredients" rows={6}
            value={editIngredients.join("\n")}
            onChange={(e) => setEditIngredients(e.target.value.split("\n"))}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />

          <Label>Directions (one step per line)</Label>
          <textarea data-testid="edit-recipe-directions" rows={8}
            value={editDirections.join("\n\n")}
            onChange={(e) => setEditDirections(e.target.value.split(/\n\n+/))}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />

          {(preview.source_url || url) && (
            <label data-testid="edit-recipe-drop-source" style={{
              display: "flex", alignItems: "center", gap: 6, marginTop: 10,
              fontSize: 11, color: "#94a3b8", cursor: "pointer",
            }}>
              <input type="checkbox" checked={dropSource}
                onChange={(e) => setDropSource(e.target.checked)} />
              Remove source URL (hide "imported from …" pill)
            </label>
          )}

          <button data-testid="save-imported-recipe" onClick={() => void saveRecipe()}
            disabled={loading || !editTitle.trim()}
            style={{
              width: "100%", marginTop: 14, padding: 12,
              background: saved ? "rgba(16,185,129,0.25)" : "rgba(200,169,126,0.15)",
              border: `1px solid ${saved ? "rgba(16,185,129,0.5)" : "rgba(200,169,126,0.4)"}`,
              borderRadius: 6, color: saved ? "#34d399" : "#c8a97e",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
            {saved ? "✓ Saved" : loading ? "Saving…" : "💾 Save to recipes"}
          </button>
        </div>
      )}
    </div>
  );
}


// ── Echo Chef — flavor-preserving recipe generation ─────────────────────
function EchoChefView({ outletId: _outletId, onDone }: { outletId: string; onDone: () => void }) {
  const [menuName, setMenuName] = React.useState("");
  const [refName, setRefName] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [servings, setServings] = React.useState(4);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function generate() {
    if (!menuName.trim()) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const r = await fetch(`${API()}/api/ecw-ops/echo-chef/mimic-style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_item_name: menuName.trim(),
          chef_id: "chef-william",
          reference_recipe_name: refName.trim() || null,
          instructions: instructions.trim() || null,
          servings,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.detail || "AI generation failed"); return; }
      setResult(d);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="echo-chef-root" style={{ padding: 16 }}>
      <button onClick={onDone} data-testid="echo-chef-back"
        style={{ fontSize: 11, color: "#94a3b8", background: "none",
                  border: "1px solid rgba(148,163,184,0.2)", padding: "4px 10px",
                  borderRadius: 4, cursor: "pointer", marginBottom: 12 }}>
        ← Back
      </button>

      <h2 style={{ fontSize: 16, fontWeight: 500 }}>👨‍🍳 Echo Chef</h2>
      <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
        Creates a recipe in your style. If you've made this dish before, Echo
        analyses those recipes' flavor signature (10 dims: sweet · salty · sour
        · bitter · umami · spicy · herbaceous · earthy · floral · smoky) and
        preserves it while honoring your new instructions.
      </p>

      <Label>What to make</Label>
      <input data-testid="echo-chef-name" value={menuName}
        onChange={(e) => setMenuName(e.target.value)}
        placeholder="Crab cakes"
        style={inputStyle} />

      <Label>Reference prior dish (optional)</Label>
      <input data-testid="echo-chef-ref" value={refName}
        onChange={(e) => setRefName(e.target.value)}
        placeholder="crab cake"
        style={inputStyle} />

      <Label>Your instructions / style</Label>
      <textarea data-testid="echo-chef-instructions" rows={4} value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Maryland style, Old Bay heavy, jumbo lump only, panko coat, pan-seared never fried"
        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />

      <Label>Servings</Label>
      <input data-testid="echo-chef-servings" type="number" value={servings}
        onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 4))}
        style={inputStyle} />

      <button data-testid="echo-chef-generate" onClick={() => void generate()}
        disabled={loading || !menuName.trim()}
        style={{
          width: "100%", marginTop: 10, padding: 12,
          background: "rgba(200,169,126,0.15)",
          border: "1px solid rgba(200,169,126,0.4)", borderRadius: 6,
          color: "#c8a97e", fontSize: 13, fontWeight: 600, cursor: "pointer",
          opacity: loading ? 0.5 : 1,
        }}>
        {loading ? "Generating…" : "✨ Create in my style"}
      </button>

      {err && <div style={{ marginTop: 10, padding: 10,
                     background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)",
                     borderRadius: 4, color: "#fca5a5", fontSize: 11 }}>{err}</div>}

      {result && <EchoChefResult result={result} />}
    </div>
  );
}


function EchoChefResult({ result }: { result: any }) {
  const r = result.recipe || {};
  if (r.error) {
    return <div data-testid="echo-chef-err" style={{ marginTop: 14, padding: 10,
                     background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)",
                     borderRadius: 4, color: "#fca5a5", fontSize: 11 }}>{r.error}</div>;
  }
  return (
    <div data-testid="echo-chef-result" style={{ marginTop: 14, padding: 12,
                 background: "rgba(200,169,126,0.05)",
                 border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6 }}>
      <div style={{ fontSize: 9, color: "#c8a97e", letterSpacing: 2, marginBottom: 4 }}>
        FLAVOR SIGNATURE ({result.prior_recipe_count} prior recipes)
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 10 }}>
        {(result.dominant || []).map(([d, v]: [string, number]) =>
          `${d} ${Math.round(v * 100)}%`).join(" · ") || "No priors — AI chose balanced profile"}
      </div>

      <div style={{ fontSize: 16, color: "#f5efe4", fontWeight: 500, marginBottom: 2 }}>
        {r.name}
      </div>
      {r.description && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>{r.description}</div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {r.calories_per_serving && <Chip label={`${r.calories_per_serving} cal`} color="#10b981" />}
        {(r.allergens || []).map((a: string) => <Chip key={a} label={`⚠ ${a}`} color="#f59e0b" />)}
        {r.estimated_total_cost && <Chip label={`$${r.estimated_total_cost.toFixed(2)} cost`} color="#c8a97e" />}
      </div>

      {r.flavor_notes && (
        <div style={{ padding: 8, background: "rgba(168,85,247,0.08)",
                       border: "1px solid rgba(168,85,247,0.3)", borderRadius: 4,
                       fontSize: 10, color: "#c4b5fd", marginBottom: 10 }}>
          💭 {r.flavor_notes}
        </div>
      )}

      {(r.ingredients || []).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "#c8a97e", letterSpacing: 2, marginBottom: 4 }}>INGREDIENTS</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: "#f5efe4", fontSize: 12, lineHeight: 1.6 }}>
            {r.ingredients.map((ing: any, i: number) => (
              <li key={i}>{ing.quantity} {ing.unit} {ing.name}</li>
            ))}
          </ul>
        </div>
      )}

      {(r.instructions || []).length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "#c8a97e", letterSpacing: 2, marginBottom: 4 }}>METHOD</div>
          <ol style={{ margin: 0, paddingLeft: 16, color: "#f5efe4", fontSize: 12, lineHeight: 1.6 }}>
            {r.instructions.map((s: any, i: number) => (
              <li key={i}>{s.instruction || s}</li>
            ))}
          </ol>
        </div>
      )}

      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 10 }}>
        Saved as draft {result.draft_id}
      </div>
    </div>
  );
}


// ── Drafts list (Echo Chef + imports) ───────────────────────────────────
function DraftsView({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [publishing, setPublishing] = React.useState<string | null>(null);

  async function reload() {
    const r = await fetch(`${API()}/api/ecw-ops/echo-chef/drafts?chef_id=chef-william`);
    const d = await r.json();
    setRows(d?.rows || []);
  }
  React.useEffect(() => { void reload(); }, []);

  async function publish(draftId: string) {
    setPublishing(draftId);
    try {
      const r = await fetch(`${API()}/api/ecw-ops/echo-chef/drafts/${draftId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({
          outlet_id: localStorage.getItem("ecw_outlet_id") || "outlet-main",
          sell_price: 0,
        }),
      });
      if (r.ok) {
        alert("✓ Published — now visible on desktop Menu Builder + mobile recipes");
        await reload();
      } else {
        const d = await r.json();
        alert(`✗ ${d?.detail || "Publish failed"}`);
      }
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div data-testid="drafts-root" style={{ padding: 16 }}>
      <button onClick={onBack} data-testid="drafts-back"
        style={{ fontSize: 11, color: "#94a3b8", background: "none",
                  border: "1px solid rgba(148,163,184,0.2)", padding: "4px 10px",
                  borderRadius: 4, cursor: "pointer", marginBottom: 12 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Draft recipes</h2>
      <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
        Published drafts join the shared recipe system — visible on desktop Menu Builder.
      </p>
      {rows.length === 0 && (
        <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: 24 }}>
          No drafts yet.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => {
          const isPublished = r.status === "published";
          return (
            <div key={r.id} data-testid={`draft-${r.id}`} style={{
              padding: 12, background: isPublished ? "rgba(16,185,129,0.06)" : "rgba(200,169,126,0.04)",
              border: `1px solid ${isPublished ? "rgba(16,185,129,0.3)" : "rgba(200,169,126,0.15)"}`,
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 13, color: "#f5efe4" }}>
                {r.recipe?.name || r.menu_item_name || r.recipe?.title || "Untitled"}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                {r.status}{isPublished && " ✓"} · {r.source_url ? "imported" : "echo-chef"} · {new Date(r.created_at).toLocaleDateString()}
              </div>
              {!isPublished && !r.recipe?.error && (
                <button data-testid={`draft-publish-${r.id}`} onClick={() => void publish(r.id)}
                  disabled={publishing === r.id}
                  style={{ marginTop: 8, padding: "6px 10px", fontSize: 11,
                            background: "rgba(200,169,126,0.15)",
                            border: "1px solid rgba(200,169,126,0.4)", borderRadius: 4,
                            color: "#c8a97e", cursor: "pointer", fontWeight: 600 }}>
                  {publishing === r.id ? "Publishing…" : "📤 Publish to shared system"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 2, marginTop: 10, marginBottom: 4 }}>
      {children}
    </div>
  );
}


const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6,
  color: "#f5efe4", fontSize: 13,
};
