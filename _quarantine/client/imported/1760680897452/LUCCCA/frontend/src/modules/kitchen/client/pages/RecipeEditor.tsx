import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TopTabs from "@/components/TopTabs";
import SubtleBottomGlow from "@/components/SubtleBottomGlow";
import CornerBrand from "@/components/CornerBrand";
import { useAppData } from "@/context/AppDataContext";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export default function RecipeEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getRecipeById, updateRecipe, images, attachImageToRecipeFromGallery } = useAppData();
  const recipe = useMemo(() => (id ? getRecipeById(id) : undefined), [id, getRecipeById]);

  const [localTitle, setLocalTitle] = useState<string>(recipe?.title ?? "");
  const [allergens, setAllergens] = useState<string>(String((recipe?.extra as any)?.allergens ?? ""));
  const [cookTime, setCookTime] = useState<string>(String((recipe?.extra as any)?.cookTime ?? ""));
  const [cookTemp, setCookTemp] = useState<string>(String((recipe?.extra as any)?.cookTemp ?? ""));
  const cover = recipe?.imageDataUrls?.[0];

  if (!recipe) {
    return (
      <div className="p-6">
        <div className="mb-4 text-sm text-muted-foreground">Recipe not found.</div>
        <div className="flex items-center gap-2">
          <Button onClick={() => nav('/')}>Back</Button>
          <a href="/" className="text-sm underline">Home</a>
        </div>
      </div>
    );
  }

  const saveMeta = () => {
    updateRecipe(recipe.id, {
      title: localTitle || "Untitled",
      extra: { ...(recipe.extra ?? {}), allergens, cookTime, cookTemp },
    });
  };

  return (
    <>
      <TopTabs />
      <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Recipe</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => nav(-1)}>Back</Button>
          <Button onClick={saveMeta}>Save</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Labeled label="Recipe Name">
            <input value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" />
          </Labeled>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Labeled label="Cook Time">
              <input value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="2:30" className="w-full rounded-md border bg-background px-3 py-2" />
            </Labeled>
            <Labeled label="Cook Temp">
              <input value={cookTemp} onChange={(e) => setCookTemp(e.target.value)} placeholder="350F" className="w-full rounded-md border bg-background px-3 py-2" />
            </Labeled>
            <Labeled label="Allergens">
              <input value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="None" className="w-full rounded-md border bg-background px-3 py-2" />
            </Labeled>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="font-medium mb-2">Modifiers</div>
            <div className="text-sm text-muted-foreground">No modifiers selected</div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Ingredients</div>
            <IngredientsTable recipeId={recipe.id} />
          </div>
        </div>

        <div className="space-y-4">
          <Labeled label="Recipe Image">
            <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
              {cover ? (
                <img src={cover} alt={recipe.title} className="h-full w-full object-cover" />)
              : (<div className="text-sm text-muted-foreground p-4 text-center">Drop image in Gallery, then attach below</div>)}
            </div>
          </Labeled>

          <div className="space-y-2">
            <div className="text-sm">Attach from Gallery</div>
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-auto">
              {images.map((img) => (
                <button key={img.id} onClick={() => attachImageToRecipeFromGallery(recipe.id, img.name)} className="border rounded overflow-hidden">
                  <img src={img.dataUrl} alt={img.name} className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
      <SubtleBottomGlow />
      <CornerBrand />
    </>
  );
}

function IngredientsTable({ recipeId }: { recipeId: string }) {
  const { getRecipeById, updateRecipe } = useAppData();
  const recipe = getRecipeById(recipeId)!;
  type Row = { qty?: string; unit?: string; item?: string; prep?: string; yieldPct?: string; cost?: string };
  const rows: Row[] = (recipe.extra as any)?.ingredientsTable ?? Array.from({ length: 10 }, () => ({}));

  const setRow = (idx: number, patch: Partial<Row>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    updateRecipe(recipeId, { extra: { ...(recipe.extra ?? {}), ingredientsTable: next } });
  };

  return (
    <div className="w-full overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr className="text-left">
            <th className="p-2">QTY</th>
            <th className="p-2">UNIT</th>
            <th className="p-2">ITEM</th>
            <th className="p-2">PREP</th>
            <th className="p-2">YIELD %</th>
            <th className="p-2">COST</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-1"><input value={r.qty ?? ""} onChange={(e) => setRow(i, { qty: e.target.value })} className="w-20 rounded border bg-background px-2 py-1" /></td>
              <td className="p-1"><input value={r.unit ?? ""} onChange={(e) => setRow(i, { unit: e.target.value })} className="w-24 rounded border bg-background px-2 py-1" /></td>
              <td className="p-1"><input value={r.item ?? ""} onChange={(e) => setRow(i, { item: e.target.value })} className="w-full rounded border bg-background px-2 py-1" /></td>
              <td className="p-1"><input value={r.prep ?? ""} onChange={(e) => setRow(i, { prep: e.target.value })} className="w-32 rounded border bg-background px-2 py-1" /></td>
              <td className="p-1"><input value={r.yieldPct ?? ""} onChange={(e) => setRow(i, { yieldPct: e.target.value })} className="w-24 rounded border bg-background px-2 py-1" /></td>
              <td className="p-1"><input value={r.cost ?? ""} onChange={(e) => setRow(i, { cost: e.target.value })} className="w-24 rounded border bg-background px-2 py-1" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
