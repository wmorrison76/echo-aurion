import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { Button } from "@/components/ui/button";
import { ScaleRecipeDialog } from "@/components/ScaleRecipeDialog";
import {
  applyScaleToIngredients,
  deriveScaledValue,
  formatQuantity,
} from "@/lib/recipe-scaling";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="tracking-widest text-sm font-semibold text-gray-700">
      {children}
    </div>
  );
}

export default function RecipeTemplate() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getRecipeById } = useAppData();
  const recipeFromCtx = useMemo(
    () => (id ? getRecipeById(id) : undefined),
    [id, getRecipeById],
  );
  const [recipe, setRecipe] = useState<any | undefined>(recipeFromCtx);

  useEffect(() => {
    setRecipe(recipeFromCtx);
  }, [recipeFromCtx]);
  useEffect(() => {
    if (recipe) return;
    try {
      const raw = localStorage.getItem("app.recipes.v1");
      if (raw && id) {
        const list = JSON.parse(raw);
        const found = Array.isArray(list)
          ? list.find((r: any) => r.id === id)
          : undefined;
        if (found) setRecipe(found);
      }
    } catch {}
  }, [id, recipe]);

  const [nutrition, setNutrition] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedScale, setAppliedScale] = useState(1);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const previousScaleRef = useRef<number | null>(null);

  const handleBackClick = useCallback(() => {
    // Use browser history to go back to where we came from
    if (typeof window !== "undefined" && window.history.length > 1) {
      nav(-1);
      return;
    }
    // Fallback to editor if no history
    if (recipe?.id) {
      nav(`/recipe/${recipe.id}`);
      return;
    }
    // Fall back to home
    nav("/");
  }, [nav, recipe?.id]);

  useEffect(() => {
    setAppliedScale(1);
    setScaleDialogOpen(false);
  }, [recipe?.id]);

  useEffect(() => {
    const run = async () => {
      if (!recipe?.ingredients?.length) return;
      try {
        setLoading(true);
        const res = await fetch("/api/nutrition/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: recipe.title,
            ingr: recipe.ingredients,
          }),
        });
        if (res.ok) setNutrition(await res.json());
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [recipe?.id]);

  const instructions = useMemo(() => {
    if (!recipe) return [];
    if (Array.isArray(recipe.instructions)) {
      return (recipe.instructions as any[]).map(String);
    }
    const source = (recipe as any)?.instructions;
    if (source == null) return [];
    return String(source)
      .split(/\r?\n|\u2028|\u2029/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [recipe]);

  const ingredients = useMemo(() => {
    if (!recipe) return [];
    if (Array.isArray(recipe.ingredients)) {
      return (recipe.ingredients as any[]).map(String);
    }
    return [];
  }, [recipe]);

  const scaledIngredients = useMemo(
    () => applyScaleToIngredients(ingredients, appliedScale),
    [ingredients, appliedScale],
  );

  if (!recipe) {
    return (
      <div className="p-6">
        <div className="mb-3 text-sm text-muted-foreground">
          Recipe not found.
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => nav("/")}>Back</Button>
          <a href="/" className="text-sm underline">
            Home
          </a>
        </div>
      </div>
    );
  }

  const cover = recipe.imageDataUrls?.[0];

  const pickNumber = (...values: unknown[]): number | undefined => {
    for (const value of values) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
    return undefined;
  };
  const pickString = (...values: unknown[]): string | undefined => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value;
    }
    return undefined;
  };

  const extra = ((recipe as any)?.extra ?? {}) as Record<string, any>;
  const serverNotes = (extra?.serverNotes ?? extra?.recipe ?? {}) as Record<
    string,
    any
  >;

  const basePortionCount = pickNumber(
    serverNotes?.portionCount,
    serverNotes?.portion_count,
    serverNotes?.portioncount,
    extra?.portionCount,
  );
  const portionUnit = pickString(
    serverNotes?.portionUnit,
    serverNotes?.portion_unit,
    serverNotes?.portionunit,
    extra?.portionUnit,
  );
  const portionUnitLabel = portionUnit?.trim();

  const baseYieldQty = pickNumber(
    serverNotes?.yieldQty,
    serverNotes?.yield_qty,
    extra?.yieldQty,
  );
  const yieldUnit = pickString(
    serverNotes?.yieldUnit,
    serverNotes?.yield_unit,
    extra?.yieldUnit,
  );
  const yieldUnitLabel = yieldUnit?.trim();

  const scaledPortionCount = deriveScaledValue(basePortionCount, appliedScale);
  const scaledYieldQty = deriveScaledValue(baseYieldQty, appliedScale);

  const formatFactorLabel = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "1×";
    if (Math.abs(value - Math.round(value)) < 1e-6) {
      return `${Math.round(value)}×`;
    }
    return `${value.toFixed(2).replace(/\.00$/, "")}×`;
  };

  const displayQuantity = (value?: number) =>
    Number.isFinite(value) ? formatQuantity(value as number) : undefined;

  type MacroTotals = {
    calories?: number;
    fat?: number;
    carbs?: number;
    protein?: number;
    fiber?: number;
    sugars?: number;
    sodium?: number;
    cholesterol?: number;
  };

  type NutritionAnalysis = MacroTotals & {
    perServing?: MacroTotals;
    totals?: MacroTotals;
  };

  const Nut = nutrition as NutritionAnalysis | null;
  const labelPortion: MacroTotals | null = (() => {
    if (!Nut) return null;
    if (
      Nut.perServing &&
      Number.isFinite(basePortionCount) &&
      (basePortionCount ?? 0) > 0
    ) {
      return Nut.perServing;
    }
    return Nut.totals;
  })();
  const cal =
    labelPortion?.calories ?? (recipe as any)?.extra?.nutrition?.calories ?? "";
  const fat = labelPortion?.fat ?? (recipe as any)?.extra?.nutrition?.fat ?? "";
  const carbs =
    labelPortion?.carbs ?? (recipe as any)?.extra?.nutrition?.carbs ?? "";
  const protein =
    labelPortion?.protein ?? (recipe as any)?.extra?.nutrition?.protein ?? "";

  const sanitizeScale = (value: number) =>
    Number.isFinite(value) && value > 0 ? value : 1;

  const openScaleDialog = () => {
    setScaleDialogOpen(true);
  };

  const commitScale = (value: number) => {
    previousScaleRef.current = null;
    setAppliedScale(sanitizeScale(value));
  };

  const handleApplyScale = (value: number) => {
    commitScale(value);
    setScaleDialogOpen(false);
  };

  const handleScaleAndPrint = (value: number) => {
    const previousScale = appliedScale;
    commitScale(value);
    setScaleDialogOpen(false);
    if (typeof window !== "undefined") {
      previousScaleRef.current = previousScale;
      const handleAfterPrint = () => {
        if (previousScaleRef.current != null) {
          commitScale(previousScaleRef.current);
          previousScaleRef.current = null;
        }
      };
      window.addEventListener("afterprint", handleAfterPrint, { once: true });
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  const handleResetScale = () => {
    commitScale(1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-6 print:px-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="secondary" onClick={handleBackClick}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            {appliedScale !== 1 && (
              <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {formatFactorLabel(appliedScale)}
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => nav(`/recipe/${recipe.id}`)}
            >
              Edit
            </Button>
            <Button variant="outline" onClick={openScaleDialog}>
              Scale
            </Button>
            <Button onClick={openScaleDialog}>Print</Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border print:shadow-none shadow-md p-8 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-serif tracking-widest">
              {recipe.title}
            </h1>
            <div className="mt-3 h-px bg-black/60" />
          </div>

          {cover && (
            <div className="mt-6 flex items-center justify-center">
              <img
                src={cover}
                alt={recipe.title}
                className="w-full max-w-xl rounded-xl shadow object-cover print:max-h-48 print:w-[70%]"
              />
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <SectionTitle>INGREDIENTS</SectionTitle>
              <ul className="mt-2 space-y-1 leading-7">
                {scaledIngredients.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span>•</span>
                    <span className="flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <SectionTitle>DIRECTIONS</SectionTitle>
              <ol className="mt-2 space-y-3 list-decimal pl-6 leading-7">
                {instructions.map((x, i) => {
                  const md = x.match(/^!\[[^\]]*\]\((.*?)\)$/);
                  const tag = x.startsWith("IMG:") ? x.slice(4) : "";
                  const src = md ? md[1] : tag || "";
                  return (
                    <li key={i} className="space-y-2">
                      {src ? (
                        <img
                          src={src}
                          alt={`step ${i + 1}`}
                          className="max-w-full rounded-md border"
                          style={{ maxWidth: 720 }}
                        />
                      ) : (
                        <span>{x}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 items-start gap-6">
            <div className="md:col-span-2">
              <SectionTitle>NUTRITION</SectionTitle>
              <div className="mt-2 rounded-lg border p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Calories</div>
                  <div className="text-lg font-semibold">
                    {cal ? Math.round(cal) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Carbs</div>
                  <div className="text-lg font-semibold">
                    {carbs ? (carbs.toFixed ? carbs.toFixed(1) : carbs) : "—"} g
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fat</div>
                  <div className="text-lg font-semibold">
                    {fat ? (fat.toFixed ? fat.toFixed(1) : fat) : "—"} g
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Protein</div>
                  <div className="text-lg font-semibold">
                    {protein
                      ? protein.toFixed
                        ? protein.toFixed(1)
                        : protein
                      : "—"}{" "}
                    g
                  </div>
                </div>
              </div>
              {loading && (
                <div className="text-xs text-muted-foreground mt-1">
                  Calculating nutrition…
                </div>
              )}
            </div>
            <div className="space-y-2">
              {Number.isFinite(baseYieldQty) && (
                <div>
                  <span className="font-semibold">Yield:</span>{" "}
                  {displayQuantity(scaledYieldQty ?? baseYieldQty)}
                  {yieldUnitLabel ? ` ${yieldUnitLabel}` : ""}
                  {appliedScale !== 1 && Number.isFinite(baseYieldQty) && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (original {displayQuantity(baseYieldQty)})
                    </span>
                  )}
                </div>
              )}
              {Number.isFinite(basePortionCount) && (
                <div>
                  <span className="font-semibold">Portions:</span>{" "}
                  {displayQuantity(scaledPortionCount ?? basePortionCount)}
                  {portionUnitLabel ? ` ${portionUnitLabel}` : ""}
                  {appliedScale !== 1 && Number.isFinite(basePortionCount) && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (original {displayQuantity(basePortionCount)})
                    </span>
                  )}
                </div>
              )}
              {(recipe as any)?.extra?.cookTime && (
                <div>
                  <span className="font-semibold">Cook:</span>{" "}
                  {(recipe as any).extra.cookTime}
                </div>
              )}
              {(recipe as any)?.extra?.prepTime && (
                <div>
                  <span className="font-semibold">Prep:</span>{" "}
                  {(recipe as any).extra.prepTime}
                </div>
              )}
              {(recipe as any)?.extra?.allergens && (
                <div>
                  <span className="font-semibold">Allergens:</span>{" "}
                  {(recipe as any).extra.allergens}
                </div>
              )}
            </div>
          </div>
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Faccc7891edf04665961a321335d9540b%2Fc559ee72f28d41e3b77cf18c85d92bba?format=webp&width=200"
            alt="LUCCCA"
            className="absolute right-4 select-none print:hidden"
            style={{ opacity: 0.75, width: 120, height: "auto", bottom: 0 }}
          />
        </div>
      </div>
      <ScaleRecipeDialog
        open={scaleDialogOpen}
        onOpenChange={setScaleDialogOpen}
        initialFactor={appliedScale}
        onApply={handleApplyScale}
        onPrint={handleScaleAndPrint}
        onReset={handleResetScale}
        basePortionCount={basePortionCount}
        portionUnit={portionUnitLabel}
        baseYieldQty={baseYieldQty}
        yieldUnit={yieldUnitLabel}
      />
    </div>
  );
}
