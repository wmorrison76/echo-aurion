import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wine, Search, GlassWater, Beaker, FlaskConical, BarChart3,
  DollarSign, Droplets, Thermometer, ChevronDown, Flame, Leaf,
  RefreshCw, Info, Zap, CircleDot, Pipette,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/mixology-rd${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/mixology-rd${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const RD_COLOR = "#a855f7";

type Tab = "recipes" | "taste-search" | "builder" | "ingredients" | "science";

const TASTE_LABELS = ["sweet", "sour", "bitter", "salty", "umami"];
const TASTE_COLORS: Record<string, string> = {
  sweet: "#f59e0b", sour: "#22c55e", bitter: "#a855f7", salty: "#3b82f6", umami: "#ef4444",
};

function TasteWheel({ profile, size = 100 }: { profile: Record<string, number>; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const angles = TASTE_LABELS.map((_, i) => (Math.PI * 2 * i) / 5 - Math.PI / 2);
  const points = TASTE_LABELS.map((t, i) => {
    const val = (profile[t] || 0) / 5;
    return { x: cx + r * val * Math.cos(angles[i]), y: cy + r * val * Math.sin(angles[i]) };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {[1, 2, 3, 4, 5].map(level => {
        const lpoints = angles.map(a => ({
          x: cx + r * (level / 5) * Math.cos(a),
          y: cy + r * (level / 5) * Math.sin(a),
        }));
        return (
          <polygon key={level}
            points={lpoints.map(p => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
        );
      })}
      {/* Axes */}
      {angles.map((a, i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
            stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
          <text x={cx + (r + 10) * Math.cos(a)} y={cy + (r + 10) * Math.sin(a)}
            textAnchor="middle" dominantBaseline="central"
            fill={TASTE_COLORS[TASTE_LABELS[i]]} fontSize={7} fontWeight={600}>
            {TASTE_LABELS[i].charAt(0).toUpperCase() + TASTE_LABELS[i].slice(1)}
          </text>
        </g>
      ))}
      {/* Value polygon */}
      <polygon points={points.map(p => `${p.x},${p.y}`).join(" ")}
        fill="rgba(168,85,247,0.15)" stroke={RD_COLOR} strokeWidth={1.5} />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5}
          fill={TASTE_COLORS[TASTE_LABELS[i]]} stroke="#000" strokeWidth={0.5} />
      ))}
    </svg>
  );
}

function RecipeCard({ recipe, onSelect }: { recipe: any; onSelect: () => void }) {
  return (
    <div onClick={onSelect} className="cursor-pointer rounded-lg p-3 transition-all hover:scale-[1.01]"
      data-testid={`recipe-card-${recipe.name.toLowerCase().replace(/\s+/g, '-')}`}
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start gap-3">
        <TasteWheel profile={recipe.taste_profile} size={70} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-white">{recipe.name}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full uppercase"
              style={{ background: recipe.type === "alcoholic" ? "rgba(168,85,247,0.1)" : "rgba(34,197,94,0.1)",
                color: recipe.type === "alcoholic" ? RD_COLOR : "#22c55e",
                border: `1px solid ${recipe.type === "alcoholic" ? "rgba(168,85,247,0.2)" : "rgba(34,197,94,0.2)"}` }}>
              {recipe.type === "alcoholic" ? `${recipe.abv_pct}% ABV` : "NA"}
            </span>
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>
            {recipe.method} | {recipe.glass} | {recipe.ice}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] font-medium" style={{ ...MONO, color: ACCENT }}>
              ${recipe.menu_price.toFixed(0)}
            </span>
            <span className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
              Cost: ${recipe.total_cost.toFixed(2)}
            </span>
            <span className="text-[9px] font-medium"
              style={{ ...MONO, color: recipe.margin_pct > 85 ? "#22c55e" : "#f59e0b" }}>
              {recipe.margin_pct}% margin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MixologyRDLabPanel() {
  const [tab, setTab] = useState<Tab>("recipes");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any>({});
  const [tasteMap, setTasteMap] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  // Taste search
  const [sweetSlider, setSweetSlider] = useState(3);
  const [sourSlider, setSourSlider] = useState(3);
  const [bitterSlider, setBitterSlider] = useState(2);
  const [tasteResults, setTasteResults] = useState<any[]>([]);
  // Builder
  const [builderIngredients, setBuilderIngredients] = useState<any[]>([]);
  const [builderName, setBuilderName] = useState("Custom Cocktail");
  const [builderPrice, setBuilderPrice] = useState(24);
  const [builderResult, setBuilderResult] = useState<any>(null);

  useEffect(() => {
    GET("/recipes").then(d => { setRecipes(d.recipes || []); setSummary(d.summary); });
    GET("/ingredients").then(d => setIngredients(d.ingredients || {}));
    GET("/taste-map").then(d => setTasteMap(d));
  }, []);

  const filteredRecipes = useMemo(() => {
    let r = recipes;
    if (typeFilter) r = r.filter(x => x.type === typeFilter);
    if (categoryFilter) r = r.filter(x => x.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(x => x.name.toLowerCase().includes(q) || x.category.toLowerCase().includes(q));
    }
    return r;
  }, [recipes, typeFilter, categoryFilter, searchQuery]);

  const categories = useMemo(() => [...new Set(recipes.map(r => r.category))].sort(), [recipes]);

  const searchByTaste = useCallback(() => {
    GET(`/search/by-taste?sweet=${sweetSlider}&sour=${sourSlider}&bitter=${bitterSlider}`)
      .then(d => setTasteResults(d.matches || []));
  }, [sweetSlider, sourSlider, bitterSlider]);

  useEffect(() => { if (tab === "taste-search") searchByTaste(); }, [tab, sweetSlider, sourSlider, bitterSlider]);

  const analyzeBuilder = useCallback(async () => {
    if (builderIngredients.length === 0) return;
    const result = await POST("/recipes/analyze", {
      name: builderName,
      menu_price: builderPrice,
      ingredients: builderIngredients,
    });
    setBuilderResult(result);
  }, [builderName, builderPrice, builderIngredients]);

  const addBuilderIngredient = useCallback((id: string) => {
    const spec = ingredients[id];
    if (!spec) return;
    setBuilderIngredients(prev => [...prev, {
      ingredient_id: id,
      quantity: spec.unit === "dash" ? 2 : spec.unit === "each" ? 1 : 1.5,
      unit: spec.unit || "oz",
    }]);
  }, [ingredients]);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "recipes", label: "Recipe Lab", icon: Wine },
    { id: "taste-search", label: "Taste Search", icon: Droplets },
    { id: "builder", label: "Recipe Builder", icon: FlaskConical },
    { id: "ingredients", label: "Ingredients", icon: Beaker },
    { id: "science", label: "Taste Science", icon: CircleDot },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="mixology-rd-panel">
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
              <FlaskConical className="w-4 h-4" style={{ color: RD_COLOR }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">MIXOLOGY R&D LAB</div>
              <div className="text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: "rgba(168,85,247,0.5)" }}>
                Flavor Science | Recipe Builder | Taste Profiling
              </div>
            </div>
          </div>
          {summary && (
            <div className="flex items-center gap-4 ml-4">
              <Stat label="Recipes" value={summary.alcoholic + summary.non_alcoholic} color={RD_COLOR} />
              <Stat label="Avg Margin" value={`${summary.avg_margin_pct}%`} color="#22c55e" />
              <Stat label="Avg Price" value={`$${summary.avg_price}`} color={ACCENT} />
            </div>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} data-testid={`rd-tab-${t.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: tab === t.id ? "rgba(168,85,247,0.08)" : "transparent",
                  color: tab === t.id ? RD_COLOR : "rgba(148,163,184,0.5)",
                  border: tab === t.id ? "1px solid rgba(168,85,247,0.15)" : "1px solid transparent",
                }}>
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "recipes" && (
          <div className="p-4">
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md flex-1 max-w-xs"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <Search className="w-3 h-3" style={{ color: "rgba(148,163,184,0.4)" }} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search recipes..." className="flex-1 bg-transparent text-[11px] outline-none text-white placeholder:text-gray-600"
                  data-testid="recipe-search" />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-2 py-1.5 rounded-md text-[10px] bg-transparent outline-none"
                data-testid="type-filter"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.7)" }}>
                <option value="">All Types</option>
                <option value="alcoholic">Alcoholic</option>
                <option value="non_alcoholic">Non-Alcoholic</option>
              </select>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="px-2 py-1.5 rounded-md text-[10px] bg-transparent outline-none"
                data-testid="category-filter"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.7)" }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Recipe detail */}
            {selectedRecipe && (
              <div className="mb-4 p-4 rounded-lg" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.1)" }}
                data-testid="recipe-detail">
                <div className="flex items-start gap-4">
                  <TasteWheel profile={selectedRecipe.taste_profile} size={120} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-semibold text-white">{selectedRecipe.name}</span>
                      <button onClick={() => setSelectedRecipe(null)} className="text-[9px] px-2 py-0.5 rounded ml-auto"
                        style={{ background: SURFACE, color: "rgba(148,163,184,0.5)", border: `1px solid ${BORDER}` }}>
                        Close
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div><div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>Method</div><div className="text-[11px] text-white">{selectedRecipe.method}</div></div>
                      <div><div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>Glass</div><div className="text-[11px] text-white">{selectedRecipe.glass}</div></div>
                      <div><div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>ABV</div><div className="text-[11px] text-white">{selectedRecipe.abv_pct}%</div></div>
                      <div><div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>GL Account</div><div className="text-[11px] text-white">{selectedRecipe.gl_account}</div></div>
                    </div>
                    <div className="text-[9px] font-semibold mb-1" style={{ color: "rgba(148,163,184,0.5)" }}>INGREDIENTS</div>
                    <div className="grid grid-cols-2 gap-1">
                      {selectedRecipe.ingredients.map((ing: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded"
                          style={{ background: SURFACE }}>
                          <span className="text-white">{ing.ingredient} <span style={{ color: "rgba(148,163,184,0.4)" }}>({ing.quantity}{ing.unit})</span></span>
                          <span style={{ ...MONO, color: ACCENT }}>${ing.cost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                      <span className="text-[11px]" style={{ ...MONO, color: ACCENT }}>Price: ${selectedRecipe.menu_price}</span>
                      <span className="text-[11px]" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>Cost: ${selectedRecipe.total_cost}</span>
                      <span className="text-[11px] font-semibold" style={{ ...MONO, color: "#22c55e" }}>Margin: {selectedRecipe.margin_pct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Recipe grid */}
            <div className="grid grid-cols-2 gap-2">
              {filteredRecipes.map(r => (
                <RecipeCard key={r.name} recipe={r} onSelect={() => setSelectedRecipe(r)} />
              ))}
            </div>
          </div>
        )}

        {tab === "taste-search" && (
          <div className="p-4">
            <div className="text-[11px] font-semibold mb-3 text-white">Find Cocktails by Taste Profile</div>
            <div className="flex items-center gap-6 mb-4 p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              data-testid="taste-sliders">
              {[
                { label: "Sweet", value: sweetSlider, set: setSweetSlider, color: TASTE_COLORS.sweet },
                { label: "Sour", value: sourSlider, set: setSourSlider, color: TASTE_COLORS.sour },
                { label: "Bitter", value: bitterSlider, set: setBitterSlider, color: TASTE_COLORS.bitter },
              ].map(s => (
                <div key={s.label} className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium" style={{ color: s.color }}>{s.label}</span>
                    <span className="text-[10px] font-semibold" style={{ ...MONO, color: s.color }}>{s.value}/5</span>
                  </div>
                  <input type="range" min={0} max={5} value={s.value} onChange={e => s.set(parseInt(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    data-testid={`slider-${s.label.toLowerCase()}`}
                    style={{ accentColor: s.color, background: `linear-gradient(to right, ${s.color}40, ${s.color})` }} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {tasteResults.map((match: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <span className="text-[10px] font-bold w-5 text-center" style={{ color: i < 3 ? ACCENT : "rgba(148,163,184,0.4)" }}>
                    #{i + 1}
                  </span>
                  <TasteWheel profile={match.recipe.taste_profile} size={50} />
                  <div className="flex-1">
                    <div className="text-[11px] font-medium text-white">{match.recipe.name}</div>
                    <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                      {match.recipe.category} | {match.recipe.method} | Distance: {match.taste_distance}
                    </div>
                  </div>
                  <div className="text-[11px] font-medium" style={{ ...MONO, color: ACCENT }}>
                    ${match.recipe.menu_price}
                  </div>
                  <div className="text-[10px]" style={{ ...MONO, color: "#22c55e" }}>
                    {match.recipe.margin_pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "builder" && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Build */}
              <div>
                <div className="text-[11px] font-semibold mb-2 text-white">Recipe Builder</div>
                <div className="flex items-center gap-2 mb-3">
                  <input value={builderName} onChange={e => setBuilderName(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-md text-[11px] bg-transparent outline-none text-white"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    placeholder="Cocktail name" data-testid="builder-name" />
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-md" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                    <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>$</span>
                    <input type="number" value={builderPrice} onChange={e => setBuilderPrice(parseFloat(e.target.value) || 0)}
                      className="w-12 bg-transparent text-[11px] text-white outline-none" data-testid="builder-price" />
                  </div>
                </div>
                <div className="text-[9px] font-semibold mb-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>ADD INGREDIENTS</div>
                <FuzzyIngredientSearch onSelect={addBuilderIngredient} ingredients={ingredients} />
                <div className="text-[9px] font-semibold mb-1.5 mt-3" style={{ color: "rgba(148,163,184,0.5)" }}>CURRENT MIX</div>
                <div className="space-y-1 mb-3">
                  {builderIngredients.map((ing, i) => {
                    const spec = ingredients[ing.ingredient_id] || {};
                    return (
                      <div key={i} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                        <span className="text-[10px] flex-1 text-white">{spec.name || ing.ingredient_id}</span>
                        <input type="number" step={0.25} value={ing.quantity}
                          onChange={e => {
                            const newIngs = [...builderIngredients];
                            newIngs[i] = { ...newIngs[i], quantity: parseFloat(e.target.value) || 0 };
                            setBuilderIngredients(newIngs);
                          }}
                          className="w-12 bg-transparent text-[10px] text-center text-white outline-none" style={{ ...MONO }} />
                        <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>{ing.unit}</span>
                        <button onClick={() => setBuilderIngredients(prev => prev.filter((_, j) => j !== i))}
                          className="text-[10px] text-red-400 hover:text-red-300 px-1">x</button>
                      </div>
                    );
                  })}
                </div>
                <button onClick={analyzeBuilder} data-testid="analyze-btn"
                  className="w-full py-2 rounded-md text-[11px] font-medium transition-colors"
                  style={{ background: "rgba(168,85,247,0.1)", color: RD_COLOR, border: "1px solid rgba(168,85,247,0.2)" }}>
                  Analyze Recipe
                </button>
              </div>
              {/* Right: Results */}
              <div>
                {builderResult ? (
                  <div data-testid="builder-result">
                    <div className="text-[11px] font-semibold mb-2 text-white">{builderResult.name} — Analysis</div>
                    <TasteWheel profile={{
                      sweet: builderResult.chemistry.sweetness === "sweet" ? 5 : builderResult.chemistry.sweetness === "medium" ? 3 : 1,
                      sour: Math.min(5, builderResult.chemistry.acid_g_per_l / 5),
                      bitter: Math.min(5, builderResult.chemistry.bitterness_index / 8),
                      salty: 0, umami: 0,
                    }} size={150} />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <StatBox label="ABV" value={`${builderResult.chemistry.abv_pct}%`} />
                      <StatBox label="Volume" value={`${builderResult.chemistry.total_volume_ml}ml`} />
                      <StatBox label="Sugar" value={`${builderResult.chemistry.sugar_g_per_l}g/L`} />
                      <StatBox label="Acid" value={`${builderResult.chemistry.acid_g_per_l}g/L`} />
                      <StatBox label="Balance" value={`${builderResult.balance_score}/100`} />
                      <StatBox label="Sweetness" value={builderResult.chemistry.sweetness} />
                    </div>
                    <div className="mt-3 p-2 rounded" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                      <div className="text-[9px] font-semibold mb-1" style={{ color: "rgba(148,163,184,0.5)" }}>COSTING</div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: "rgba(148,163,184,0.5)" }}>Cost</span>
                        <span style={{ ...MONO, color: "rgba(255,255,255,0.7)" }}>${builderResult.costing.total_cost}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: "rgba(148,163,184,0.5)" }}>Price</span>
                        <span style={{ ...MONO, color: ACCENT }}>${builderResult.costing.menu_price}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <span style={{ color: "#22c55e" }}>Margin</span>
                        <span style={{ ...MONO, color: "#22c55e" }}>{builderResult.costing.margin_pct}%</span>
                      </div>
                      <div className="text-[9px] mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>
                        GL: {builderResult.gl_account}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-[11px]" style={{ color: "rgba(148,163,184,0.3)" }}>
                    <FlaskConical className="w-8 h-8 mb-3 opacity-30" />
                    <div>Add ingredients and click Analyze</div>
                    <div className="text-[9px] mt-1">ABV, sugar/acid chemistry, balance score, and costing</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "ingredients" && (
          <div className="p-4">
            <div className="text-[11px] font-semibold mb-3 text-white">Ingredient Library ({Object.keys(ingredients).length} items)</div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ingredients).map(([id, spec]: [string, any]) => (
                <div key={id} className="p-2.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  data-testid={`ingredient-${id}`}>
                  <div className="text-[11px] font-medium text-white">{spec.name}</div>
                  <div className="text-[9px] mt-0.5 uppercase" style={{ color: RD_COLOR }}>{spec.category}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {spec.abv > 0 && <span className="text-[9px]" style={{ ...MONO, color: "rgba(255,255,255,0.5)" }}>{spec.abv}% ABV</span>}
                    <span className="text-[9px]" style={{ ...MONO, color: ACCENT }}>
                      ${spec.cost_per_oz?.toFixed(2) || spec.cost_per_dash?.toFixed(2) || spec.cost_each?.toFixed(2) || '?'}/{spec.unit || 'oz'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(spec.flavor_tags || []).slice(0, 4).map((t: string) => (
                      <span key={t} className="text-[7px] px-1 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.08)", color: "rgba(168,85,247,0.6)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "science" && tasteMap && (
          <div className="p-4 max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold mb-3 text-white">Taste Bud Science</div>
            <div className="space-y-3">
              {Object.entries(tasteMap.taste_buds).map(([taste, data]: [string, any]) => (
                <div key={taste} className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <CircleDot className="w-3.5 h-3.5" style={{ color: TASTE_COLORS[taste] }} />
                    <span className="text-[12px] font-semibold uppercase" style={{ color: TASTE_COLORS[taste] }}>{taste}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>Receptors: {data.receptors}</div>
                  <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>Threshold: {data.threshold}</div>
                  <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>In cocktails: {data.in_cocktails}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="text-[11px] font-semibold mb-2 text-white">Balance Rules</div>
              {tasteMap.balance_rules?.map((rule: any, i: number) => (
                <div key={i} className="p-2 rounded-lg mb-1.5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="text-[11px] font-medium" style={{ color: ACCENT }}>{rule.rule}</div>
                  <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>{rule.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>{label}:</span>
      <span className="text-[11px] font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.04)` }}>
      <div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>{label}</div>
      <div className="text-[11px] font-medium text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
    </div>
  );
}

function FuzzyIngredientSearch({ onSelect, ingredients }: { onSelect: (id: string) => void; ingredients: any }) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [yieldResults, setYieldResults] = React.useState<any[]>([]);
  const [showDropdown, setShowDropdown] = React.useState(false);

  React.useEffect(() => {
    if (query.length < 2) { setResults([]); setYieldResults([]); return; }
    // Search local ingredients
    const q = query.toLowerCase();
    const local = Object.entries(ingredients)
      .filter(([_, spec]: [string, any]) => spec.name.toLowerCase().includes(q))
      .map(([id, spec]: [string, any]) => ({ id, name: spec.name, source: "mixology", cost: spec.cost_per_oz || spec.cost_per_dash || 0 }))
      .slice(0, 8);
    setResults(local);
    // Search yield database
    fetch(`${API}/api/yields/search?q=${encodeURIComponent(query)}&limit=8`)
      .then(r => r.json()).then(d => setYieldResults(d.results || []));
  }, [query, ingredients]);

  return (
    <div className="relative">
      <input value={query} onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Type ingredient name... (fuzzy search)"
        className="w-full px-2.5 py-1.5 rounded-md text-[11px] bg-transparent outline-none text-white placeholder:text-gray-600"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
        data-testid="fuzzy-ingredient-search" />
      {showDropdown && (results.length > 0 || yieldResults.length > 0) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md overflow-hidden max-h-60 overflow-y-auto"
          style={{ background: "rgba(10,12,20,0.98)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {results.length > 0 && (
            <div className="px-2 py-1 text-[8px] font-semibold uppercase" style={{ color: "rgba(168,85,247,0.5)", background: "rgba(168,85,247,0.03)" }}>Bar Ingredients</div>
          )}
          {results.map(r => (
            <button key={r.id} onClick={() => { onSelect(r.id); setQuery(""); setShowDropdown(false); }}
              className="w-full text-left px-2.5 py-1.5 hover:bg-white/5 transition flex items-center gap-2"
              data-testid={`fuzzy-result-${r.id}`}>
              <span className="text-[10px] text-white flex-1">{r.name}</span>
              <span className="text-[8px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#c8a97e" }}>${r.cost}/oz</span>
            </button>
          ))}
          {yieldResults.length > 0 && (
            <div className="px-2 py-1 text-[8px] font-semibold uppercase" style={{ color: "rgba(34,197,94,0.5)", background: "rgba(34,197,94,0.03)" }}>Kitchen Yields</div>
          )}
          {yieldResults.map((r, i) => (
            <button key={i} className="w-full text-left px-2.5 py-1.5 hover:bg-white/5 transition flex items-center gap-2"
              onClick={() => { setQuery(""); setShowDropdown(false); }}>
              <span className="text-[10px] text-white flex-1">{r.name}</span>
              <span className="text-[8px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#22c55e" }}>Yield:{r.yield_pct}%</span>
              <span className="text-[8px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#c8a97e" }}>EP:${r.ep_cost_lb}/lb</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
