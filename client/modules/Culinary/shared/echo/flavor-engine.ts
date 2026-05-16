/** * EchoAi³ Flavor Engine – Flattened Core Module * * This file defines the core data structures and logic for LUCCCA's flavor system. * It is intentionally"flattened" (no external imports) so Builder.io can consume * it as a single module, and EchoAi³ can be wired in later at the marked extension points. * * Responsibilities: * 1. Represent flavor as structured vectors ("Flavor Fingerprints"). * 2. Model a Multi-Bite Pleasure Curve over the course of eating a dish. * 3. Build an ingredient network graph for FlavorGraph-style visualizations. * 4. Generate human-readable suggestions for improving a recipe's flavor balance. * * This is NOT a full AI model by itself. It is the"spine" that EchoAi³ and * Builder.io can connect to – the common language for flavor, texture, and craving. */ /* ------------------------------------------ * 1. Core Types & Structures * ----------------------------------------*/ /** * Base taste & sensation attributes. * These become axes on radar charts ("flavor fingerprint"). */
export type FlavorAttributeId =
  | "sweet"
  | "sour"
  | "salty"
  | "bitter"
  | "umami"
  | "fat"
  | "astringent"
  | "spicy"
  | "smoky"
  | "fruity"
  | "herbal"
  | "floral"
  | "earthy"
  | "roasted"
  | "fermented"
  | "fresh"
  | "caramelized"
  | "mineral"; /** One axis value on the radar chart (0–1). */
export interface FlavorAttribute {
  id: FlavorAttributeId;
  label: string;
  /** Normalized intensity 0.0 – 1.0 */ intensity: number;
} /** Simplified ingredient structure coming in from Builder / Echo UI. */
export interface IngredientInput {
  name: string;
  /** grams, ml, etc – normalized on the client if needed */ amount: number;
  /** Optional: pH for that ingredient or component */ pH?: number | null;
  /** Optional: fat %, sugar %, etc. These enrich the feature vector. */ fatPercent?:
    | number
    | null;
  sugarPercent?: number | null;
  saltPercent?: number | null;
  /** Optional: tags like"acid","aromatic","protein","starch","spice" */ tags?: string[];
} /** Techniques that impact texture, Maillard, moisture, etc. */
export type CookingTechniqueId =
  | "raw"
  | "seared"
  | "roasted"
  | "grilled"
  | "fried"
  | "braised"
  | "sous_vide"
  | "steamed"
  | "poached"
  | "smoked"
  | "fermented"
  | "pickled"
  | "spherified"
  | "gelified"
  | "foamed"
  | "frozen"
  | "caramelized"; /** A simple representation of a step that affects flavor & texture. */
export interface TechniqueStep {
  technique: CookingTechniqueId;
  /** Seconds at target temp (rough; Echo can refine later). */ durationSeconds?: number;
  /** Approximate temperature in °C, if known. */ temperatureC?: number;
} /** Recipe payload expected from Builder.io. */
export interface RecipeAnalysisInput {
  id?: string;
  name: string;
  servings: number;
  /** Ingredient list (already scaled to batch). */ ingredients: IngredientInput[];
  /** Key steps that impact chemistry / texture. */ techniqueSteps: TechniqueStep[];
  /** Overall target pH if known (e.g., sauces, pickles). */ targetPH?:
    | number
    | null;
  /** Richness scale 0–1 (fat, sugar, density); can be estimated client-side. */ richness?:
    | number
    | null;
  /** Volatility / aromatic lift (0–1). */ aromaticLift?: number | null;
} /** * A"flavor fingerprint": the core representation for a recipe. * This is what drives radar charts and similarity search. */
export interface FlavorFingerprint {
  recipeId?: string;
  recipeName: string;
  attributes: FlavorAttribute[];
  /** Optional high-level labels like"bright","comforting","bold". */ descriptors: string[];
} /** * One point on the Multi-Bite Pleasure Curve. * t = relative point from 0 (first bite) to 1 (last bite). * pleasure = predicted enjoyment / craving at that time (0–1). */
export interface PleasureCurvePoint {
  t: number;
  pleasure: number;
} /** * Output used for plotting the curve and understanding fatigue. */
export interface PleasureCurve {
  points: PleasureCurvePoint[];
  /** Peak pleasure value (0–1). */ peak: number;
  /** t index where peak occurs (0–1). */ peakAt: number;
  /** Whether the dish likely causes palate fatigue. */ likelyFatigue: boolean;
  /** Qualitative label for the curve shape. */ pattern:
    | "early_peak"
    | "balanced"
    | "fatigue"
    | "creeps_up";
} /** Node + Edge model for ingredient network graphs. */
export interface IngredientNode {
  id: string;
  label: string;
  /** 0–1: how dominant this ingredient is in the dish. */ weight: number;
  /** Optional high-level category:"acid","aromatic", etc. */ role?: string;
}
export interface IngredientEdge {
  from: string;
  to: string;
  /** * 0–1 similarity or complementarity score. * 0.0 = unrelated, 1.0 = highly synergistic. */ strength: number;
}
export interface IngredientNetwork {
  nodes: IngredientNode[];
  edges: IngredientEdge[];
} /** * Complete analysis result that Builder.io can use to render: * - radar charts * - pleasure curve line graph * - ingredient network / FlavorGraph-style visualization * - AI flavor suggestions */
export interface FlavorAnalysisResult {
  fingerprint: FlavorFingerprint;
  pleasureCurve: PleasureCurve;
  ingredientNetwork: IngredientNetwork;
  suggestions: string[];
} /* ------------------------------------------ * 2. Baseline Attribute Definitions * ----------------------------------------*/ /** * Master list of attributes used for radar charts. * Intensities will be filled in by computeFlavorFingerprint. */
const BASE_ATTRIBUTES: { id: FlavorAttributeId; label: string }[] = [
  { id: "sweet", label: "Sweet" },
  { id: "sour", label: "Sour" },
  { id: "salty", label: "Salty" },
  { id: "bitter", label: "Bitter" },
  { id: "umami", label: "Umami" },
  { id: "fat", label: "Rich/Fat" },
  { id: "astringent", label: "Astringent" },
  { id: "spicy", label: "Spicy/Heat" },
  { id: "smoky", label: "Smoky" },
  { id: "fruity", label: "Fruity" },
  { id: "herbal", label: "Herbal" },
  { id: "floral", label: "Floral" },
  { id: "earthy", label: "Earthy" },
  { id: "roasted", label: "Roasted" },
  { id: "fermented", label: "Fermented" },
  { id: "fresh", label: "Fresh/Bright" },
  { id: "caramelized", label: "Caramelized" },
  { id: "mineral", label: "Mineral/Savory" },
]; /* ------------------------------------------ * 3. Simple Heuristics / Utility Functions * ----------------------------------------*/ /** * Very small ingredient knowledge base so we can infer some attributes * without any external data. EchoAi³ can later override this with a * trained embedding model. */
const INGREDIENT_ATTRIBUTE_HINTS: Record<
  string,
  Partial<Record<FlavorAttributeId, number>>
> = {
  lemon: { sour: 0.9, fresh: 0.8, fruity: 0.4 },
  lime: { sour: 0.9, fresh: 0.8, fruity: 0.4 },
  vinegar: { sour: 0.9, fresh: 0.5 },
  butter: { fat: 0.95, caramelized: 0.2 },
  cream: { fat: 0.9, sweet: 0.2 },
  sugar: { sweet: 1.0 },
  honey: { sweet: 1.0, fruity: 0.2 },
  salt: { salty: 1.0 },
  miso: { umami: 0.9, fermented: 0.7, salty: 0.6 },
  soy_sauce: { umami: 0.8, salty: 0.9, fermented: 0.5 },
  tomato: { fruity: 0.4, sour: 0.4, umami: 0.4, fresh: 0.5 },
  garlic: { herbal: 0.4, roasted: 0.3 },
  onion: { herbal: 0.3, sweet: 0.2, caramelized: 0.4 },
  chili: { spicy: 1.0, fruity: 0.3 },
  black_pepper: { spicy: 0.6, herbal: 0.3 },
}; /** Normalize a value into [0,1] with graceful handling of edge cases. */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const v = (value - min) / (max - min);
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
} /* ------------------------------------------ * 4. Flavor Fingerprint Computation * ----------------------------------------*/ /** * Compute a rough flavor fingerprint from recipe input. * This is the first-pass"physics + heuristics" layer. * * EchoAi³ can later refine this by: * - learning from real guest feedback / ratings * - using embeddings for ingredient names * - incorporating full molecular databases */
export function computeFlavorFingerprint(
  input: RecipeAnalysisInput,
): FlavorFingerprint {
  // Initialize all attribute scores at 0. const scores: Record<FlavorAttributeId, number> = {} as any; BASE_ATTRIBUTES.forEach(({ id }) => { scores[id] = 0; }); // Compute total mass so we can weight contributions. const total = input.ingredients.reduce((sum, ing) => sum + ing.amount, 0.0001); for (const ing of input.ingredients) { const key = ing.name.toLowerCase().replace(/\s+/g,"_"); const hints = INGREDIENT_ATTRIBUTE_HINTS[key] || {}; const weight = ing.amount / total; // Use hints if known. for (const attrId in hints) { const id = attrId as FlavorAttributeId; scores[id] += (hints[id] || 0) * weight; } // Use fat/sugar/salt if given (they map directly). if (ing.fatPercent) { scores.fat += normalize(ing.fatPercent, 0, 100) * weight; } if (ing.sugarPercent) { scores.sweet += normalize(ing.sugarPercent, 0, 100) * weight; } if (ing.saltPercent) { scores.salty += normalize(ing.saltPercent, 0, 20) * weight; } // Simple tag mapping (e.g.,"acid","aromatic"). if (ing.tags) { if (ing.tags.includes("acid")) { scores.sour += 0.6 * weight; scores.fresh += 0.3 * weight; } if (ing.tags.includes("aromatic")) { scores.fruity += 0.3 * weight; scores.herbal += 0.3 * weight; } if (ing.tags.includes("smoke")) { scores.smoky += 0.7 * weight; } if (ing.tags.includes("earthy")) { scores.earthy += 0.7 * weight; } } } // Technique adjustments: roasting, grilling, etc. for (const step of input.techniqueSteps) { switch (step.technique) { case"seared": case"roasted": case"grilled": case"fried": case"caramelized": scores.roasted += 0.2; scores.caramelized += 0.2; break; case"smoked": scores.smoky += 0.4; break; case"fermented": case"pickled": scores.fermented += 0.4; scores.sour += 0.2; break; case"frozen": scores.fresh += 0.2; break; case"spherified": case"gelified": case"foamed": // These affect texture & surprise, not base axes; left for EchoAi³ layer. break; } } // Normalize all scores into [0,1]. let maxScore = 0; BASE_ATTRIBUTES.forEach(({ id }) => { if (scores[id] > maxScore) maxScore = scores[id]; }); const attributes: FlavorAttribute[] = BASE_ATTRIBUTES.map(({ id, label }) => ({ id, label, intensity: maxScore > 0 ? scores[id] / maxScore : 0, })); // Simple descriptor hints based on profile shape. const descriptors: string[] = []; const sweet = scores.sweet; const sour = scores.sour; const fat = scores.fat; const umami = scores.umami; const spicy = scores.spicy; if (sweet > 0.4 && sour > 0.3) descriptors.push("bright"); if (fat > 0.5 || umami > 0.5) descriptors.push("comforting"); if (spicy > 0.4) descriptors.push("bold"); if (scores.fresh > 0.5) descriptors.push("fresh"); if (descriptors.length === 0) descriptors.push("balanced"); return { recipeId: input.id, recipeName: input.name, attributes, descriptors, };
} /* ------------------------------------------ * 5. Multi-Bite Pleasure Curve * ----------------------------------------*/ /** * Compute a simple Multi-Bite Pleasure Curve from the fingerprint and richness. * Later EchoAi³ can refine this with real feedback and advanced models. */
export function computePleasureCurve(
  fingerprint: FlavorFingerprint,
  richness: number | null | undefined,
): PleasureCurve {
  const sweet =
    fingerprint.attributes.find((a) => a.id === "sweet")?.intensity || 0;
  const sour =
    fingerprint.attributes.find((a) => a.id === "sour")?.intensity || 0;
  const fat =
    fingerprint.attributes.find((a) => a.id === "fat")?.intensity || 0;
  const spicy =
    fingerprint.attributes.find((a) => a.id === "spicy")?.intensity || 0;
  const fresh =
    fingerprint.attributes.find((a) => a.id === "fresh")?.intensity || 0;
  const r = richness ?? fat; // fallback to fat intensity const numPoints = 20; const points: PleasureCurvePoint[] = []; for (let i = 0; i < numPoints; i++) { const t = i / (numPoints - 1); // 0..1 // Base enjoyment = flavor impact; we dampen with time via fatigue. const baseFlavorImpact = 0.4 * sweet + 0.4 * umamiLike(fingerprint) + 0.2 * spicy; const richnessPenalty = r * t * 0.7; // richer dishes fatigue faster const acidRefresh = sour * (1 - t) * 0.4 + fresh * (1 - t) * 0.4; let pleasure = baseFlavorImpact + acidRefresh - richnessPenalty; pleasure = Math.max(0, Math.min(1, pleasure)); points.push({ t, pleasure }); } // Analyze curve let peak = 0; let peakIdx = 0; points.forEach((p, i) => { if (p.pleasure > peak) { peak = p.pleasure; peakIdx = i; } }); const end = points[points.length - 1].pleasure; const start = points[0].pleasure; const likelyFatigue = end < start * 0.7 && r > 0.4; let pattern: PleasureCurve["pattern"] ="balanced"; if (peakIdx < numPoints * 0.3 && likelyFatigue) pattern ="early_peak"; else if (likelyFatigue) pattern ="fatigue"; else if (peakIdx > numPoints * 0.7) pattern ="creeps_up"; return { points, peak, peakAt: peakIdx / (numPoints - 1), likelyFatigue, pattern, };
}
function umamiLike(fingerprint: FlavorFingerprint): number {
  const u =
    fingerprint.attributes.find((a) => a.id === "umami")?.intensity || 0;
  const roasted =
    fingerprint.attributes.find((a) => a.id === "roasted")?.intensity || 0;
  return Math.min(1, u + roasted * 0.3);
} /* ------------------------------------------ * 6. Ingredient Network Graph * ----------------------------------------*/ /** * Build a simple ingredient network for visualization. * For now, it uses: * - mass weight * - shared roles (tags) * - attribute hints * * EchoAi³ can later learn similarity using embeddings or FlavorGraph data. */
export function buildIngredientNetwork(
  input: RecipeAnalysisInput,
): IngredientNetwork {
  const total = input.ingredients.reduce((s, i) => s + i.amount, 0.0001);
  const nodes: IngredientNode[] = input.ingredients.map((ing) => {
    const id = ing.name.toLowerCase().replace(/\s+/g, "_");
    let role = "";
    if (ing.tags?.includes("acid")) role = "acid";
    else if (ing.tags?.includes("protein")) role = "protein";
    else if (ing.tags?.includes("starch")) role = "starch";
    else if (ing.tags?.includes("aromatic")) role = "aromatic";
    return {
      id,
      label: ing.name,
      weight: normalize(ing.amount / total, 0, 1),
      role,
    };
  });
  const edges: IngredientEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const sim = computeIngredientSynergy(
        input.ingredients[i],
        input.ingredients[j],
      );
      if (sim > 0.1) {
        edges.push({ from: a.id, to: b.id, strength: sim });
      }
    }
  }
  return { nodes, edges };
} /** * Very simple synergy heuristic: * - shared tags → more synergy * - acid + fat, sweet + acid, umami + fat → boost */
function computeIngredientSynergy(
  a: IngredientInput,
  b: IngredientInput,
): number {
  let score = 0;
  const tagsA = new Set(a.tags || []);
  const tagsB = new Set(b.tags || []); // Shared tags boost synergy. for (const t of tagsA) { if (tagsB.has(t)) score += 0.2; } // Acid + fat synergy const isAcidA = tagsA.has("acid"); const isAcidB = tagsB.has("acid"); const isFatA = (a.fatPercent || 0) > 10; const isFatB = (b.fatPercent || 0) > 10; if ((isAcidA && isFatB) || (isAcidB && isFatA)) { score += 0.4; } // Sweet + acid const isSweetA = (a.sugarPercent || 0) > 10; const isSweetB = (b.sugarPercent || 0) > 10; if ((isSweetA && isAcidB) || (isSweetB && isAcidA)) { score += 0.3; } // Cap and normalize return Math.min(1, score);
} /* ------------------------------------------ * 7. Suggestions Engine * ----------------------------------------*/ /** * Generate human-readable suggestions to bring a dish closer * to a more craveable, balanced profile. * * These suggestions can be surfaced directly in Builder.io's UI * or passed into EchoAi³ as prompts for more specific revisions. */
export function generateFlavorSuggestions(
  fingerprint: FlavorFingerprint,
  pleasureCurve: PleasureCurve,
): string[] {
  const attrs = Object.fromEntries(
    fingerprint.attributes.map((a) => [a.id, a.intensity]),
  ) as Record<FlavorAttributeId, number>;
  const suggestions: string[] = []; // Acid balance if (attrs.fat > 0.6 && attrs.sour < 0.3 && attrs.fresh < 0.3) { suggestions.push("Richness is high but acid is low. Consider adding a bright element (citrus, vinegar, pickled garnish, fresh herbs) to cut through fat and extend enjoyment." ); } // Palate fatigue if (pleasureCurve.likelyFatigue) { suggestions.push("The Multi-Bite Pleasure Curve suggests palate fatigue. Add contrast in texture (crisp vs creamy) or temperature (hot vs cool garnish) to keep the dish engaging." ); } // Lack of aromatic lift if (attrs.fruity < 0.2 && attrs.herbal < 0.2 && attrs.floral < 0.1) { suggestions.push("Aromatic lift is low. Consider finishing with fresh herbs, citrus zest, or a small amount of aromatic oil to increase perceived complexity." ); } // Aggressive spice without support if (attrs.spicy > 0.6 && attrs.sweet < 0.2 && attrs.fat < 0.3) { suggestions.push("Spice intensity is high with little sweetness or fat to buffer it. Consider a small touch of sweetness or richness to make the heat more pleasurable." ); } // Underpowered character const totalImpact = attrs.sweet + attrs.sour + attrs.salty + attrs.umami + attrs.spicy + attrs.fat; if (totalImpact < 1.5) { suggestions.push("Overall flavor impact looks mild. Consider increasing salt slightly, layering umami (stock reduction, miso, aged cheese), or adding a defined aromatic element." ); } if (suggestions.length === 0) { suggestions.push("Flavor fingerprint appears balanced. Focus optimization on presentation, plating geometry, and pacing within the menu sequence." ); } return suggestions;
} /* ------------------------------------------ * 8. High-Level API for Builder / Echo * ----------------------------------------*/ /** * Single entry point for Builder.io or EchoAi³: * Pass in a RecipeAnalysisInput, get back everything needed for: * - radar chart * - pleasure curve chart * - ingredient network * - text suggestions */
export function analyzeRecipeForEcho(
  input: RecipeAnalysisInput,
): FlavorAnalysisResult {
  const fingerprint = computeFlavorFingerprint(input);
  const pleasureCurve = computePleasureCurve(
    fingerprint,
    input.richness ?? null,
  );
  const ingredientNetwork = buildIngredientNetwork(input);
  const suggestions = generateFlavorSuggestions(fingerprint, pleasureCurve);
  return { fingerprint, pleasureCurve, ingredientNetwork, suggestions };
} /** * Placeholder for future integration: * Builder.io can later call an EchoAi³ API route here instead of running * locally, or this module can be wrapped in a serverless function. * * Example: * * export async function analyzeRecipeWithEchoCloud(payload: RecipeAnalysisInput) { * const res = await fetch("/api/echo/flavor-analyze", { * method:"POST", * body: JSON.stringify(payload), * }); * return res.json() as Promise<FlavorAnalysisResult>; * } */
