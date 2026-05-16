import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { Button } from "@/components/ui/button";

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
  const instructions: string[] = Array.isArray(recipe.instructions)
    ? (recipe.instructions as any).map(String)
    : String((recipe as any).instructions || "")
        .split(/\r?\n|\u2028|\u2029/)
        .map((s) => s.trim())
        .filter(Boolean);
  const ingredients: string[] = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map(String)
    : [];

  const Nut = nutrition;
  const cal =
    Nut?.calories ?? (recipe as any)?.extra?.nutrition?.calories ?? "";
  const fat = Nut?.totalNutrients?.FAT?.quantity ?? "";
  const carbs = Nut?.totalNutrients?.CHOCDF?.quantity ?? "";
  const protein = Nut?.totalNutrients?.PROCNT?.quantity ?? "";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-6 print:px-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="secondary" onClick={() => nav(-1)}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => nav(`/recipe/${recipe.id}`)}
            >
              Edit
            </Button>
            <Button onClick={() => window.print()}>Print</Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-md p-8 relative">
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
                className="w-full max-w-xl rounded-xl shadow object-cover"
              />
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <SectionTitle>INGREDIENTS</SectionTitle>
              <ul className="mt-2 space-y-1 leading-7">
                {ingredients.map((x, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span className="flex-1">{x}</span>
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
            className="absolute right-4 select-none"
            style={{ opacity: 0.75, width: 120, height: "auto", bottom: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
