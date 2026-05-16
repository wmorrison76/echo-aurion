import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Settings, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { extractLeadingQuantity } from "@/lib/recipe-scaling";
import { defaultSelection, type TaxonomySelection } from "@/lib/taxonomy";
import TopTabs from "@/components/TopTabs";
import SubtleBottomGlow from "@/components/SubtleBottomGlow";
import CornerBrand from "@/components/CornerBrand";
import TronBackdrop from "@/components/TronBackdrop";
import RightSidebar from "@/pages/sections/RightSidebar";
import { useAppData } from "@/context/AppDataContext";
import { useToast } from "@/hooks/use-toast";
import { GalleryImagePicker } from "@/components/GalleryImagePicker";
import { RecipeEditorCostingPanel } from "@/components/RecipeEditorCostingPanel";
import type { RecipeNutrition } from "@shared/recipes";

function Labeled({ label, id, children }: { label: string; id?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const nutritionFieldConfig: Array<{
  key: keyof RecipeNutrition;
  label: string;
  unit: string;
}> = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "sugars", label: "Sugars", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg" },
];

type NutritionValuesState = Record<keyof RecipeNutrition, string>;

const createEmptyNutritionValues = (): NutritionValuesState => ({
  calories: "",
  fat: "",
  carbs: "",
  protein: "",
  fiber: "",
  sugars: "",
  sodium: "",
  cholesterol: "",
});

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const UNIT_KEYWORDS = new Set(
  [
    "g",
    "gram",
    "grams",
    "kg",
    "kilogram",
    "kilograms",
    "mg",
    "milligram",
    "milligrams",
    "lb",
    "lbs",
    "pound",
    "pounds",
    "oz",
    "ounce",
    "ounces",
    "ml",
    "l",
    "liter",
    "liters",
    "litre",
    "litres",
    "cl",
    "dl",
    "qt",
    "pt",
    "cup",
    "cups",
    "tbsp",
    "tablespoon",
    "tablespoons",
    "tbs",
    "tsp",
    "teaspoon",
    "teaspoons",
    "gal",
    "gallon",
    "gallons",
    "each",
    "ea",
    "dozen",
    "stick",
    "sticks",
    "sheet",
    "sheets",
    "piece",
    "pieces",
    "clove",
    "cloves",
    "can",
    "cans",
    "bag",
    "bags",
    "sprig",
    "sprigs",
    "bunch",
    "bunches",
    "head",
    "heads",
    "slice",
    "slices",
    "pinch",
    "pinches",
    "dash",
    "dashes",
  ].map((token) => token.toLowerCase()),
);

const normalizeUnitToken = (token: string): string => token.toLowerCase().replace(/[^a-z%]/g, "");

const isLikelyUnit = (token: string): boolean => {
  const normalized = normalizeUnitToken(token);
  if (!normalized) return false;
  if (UNIT_KEYWORDS.has(normalized)) return true;
  if (/^[a-z]{1,3}$/.test(normalized)) return true;
  if (/^[a-z]+%$/.test(normalized)) return true;
  return false;
};

const splitItemAndPrep = (text: string): { item: string; prep: string } => {
  const trimmed = text.trim();
  if (!trimmed) return { item: "", prep: "" };
  const parenMatch = trimmed.match(/^(.*?)[\s]*\(([^)]*)\)\s*$/);
  if (parenMatch) {
    return {
      item: parenMatch[1].trim().replace(/,\s*$/, ""),
      prep: parenMatch[2].trim(),
    };
  }
  const [itemPart, ...rest] = trimmed.split(",");
  if (rest.length === 0) {
    return { item: trimmed, prep: "" };
  }
  return { item: itemPart.trim(), prep: rest.join(",").trim() };
};

const formatYieldValue = (input: unknown): string => {
  if (input === null || input === undefined) return "";
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return "";
    if (input >= 0 && input <= 1) {
      return `${Math.round(input * 100)}%`;
    }
    if (input > 1 && input < 100 && Number.isInteger(input)) {
      return `${input}%`;
    }
    if (input > 1 && input < 100 && !Number.isInteger(input)) {
      return `${Number(input.toFixed(2))}%`;
    }
    return `${input}`;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return "";
    if (trimmed.endsWith("%")) return trimmed;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      if (numeric >= 0 && numeric <= 1) {
        return `${Math.round(numeric * 100)}%`;
      }
      return `${trimmed}`;
    }
    return trimmed;
  }
  return "";
};

export default function RecipeEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getRecipeById, updateRecipe } = useAppData();
  const { toast } = useToast();
  const recipe = useMemo(() => (id ? getRecipeById(id) : undefined), [id, getRecipeById]);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      nav(-1);
      return;
    }
    nav("/?tab=search");
  }, [nav]);

  const [localTitle, setLocalTitle] = useState<string>("");
  const [allergens, setAllergens] = useState<string>("");
  const [selectedAllergenList, setSelectedAllergenList] = useState<string[]>([]);
  const [cookTime, setCookTime] = useState<string>("");
  const [cookTemp, setCookTemp] = useState<string>("");
  const [directionsText, setDirectionsText] = useState<string>("");
  const [directionImages, setDirectionImages] = useState<string[]>([]);
  const [nutritionValues, setNutritionValues] = useState<NutritionValuesState>(createEmptyNutritionValues);
  const [coverPreview, setCoverPreview] = useState<string | undefined>(undefined);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [selectedNationality, setSelectedNationality] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedRecipeType, setSelectedRecipeType] = useState<string[]>([]);
  const [selectedPrepMethod, setSelectedPrepMethod] = useState<string[]>([]);
  const [selectedCookingEquipment, setSelectedCookingEquipment] = useState<string[]>([]);
  const [selectedRecipeAccess, setSelectedRecipeAccess] = useState<string[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomySelection>({ ...defaultSelection });
  const [isRightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);

  const directionImageInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!recipe) return;
    const extra = (recipe.extra ?? {}) as Record<string, unknown>;
    const serverNotes = extra.serverNotes as
      | ({
          allergens?: string[];
          modifiers?: Partial<Record<string, string[]>>;
          access?: string[];
          cookTime?: string;
          cookTemp?: string;
          directions?: string;
        } & Record<string, unknown>)
      | undefined;

    setLocalTitle(recipe.title ?? "");

    const inferredAllergens = (() => {
      if (Array.isArray(extra.allergenList)) return extra.allergenList.map(String);
      if (Array.isArray(serverNotes?.allergens)) return serverNotes!.allergens.map(String);
      if (typeof extra.allergens === "string") {
        return extra.allergens
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [] as string[];
    })();
    setSelectedAllergenList(inferredAllergens);
    if (inferredAllergens.length) {
      setAllergens(inferredAllergens.join(", "));
    } else {
      setAllergens(String(extra.allergens ?? ""));
    }

    const derivedCookTime = String(extra.cookTime ?? serverNotes?.cookTime ?? recipe.cookTime ?? "");
    const derivedCookTemp = String(extra.cookTemp ?? serverNotes?.cookTemp ?? "");
    setCookTime(derivedCookTime);
    setCookTemp(derivedCookTemp);

    const rawDirections = String(
      extra.directions ?? serverNotes?.directions ?? (recipe.instructions ?? []).join("\n") ?? "",
    );
    const lines = rawDirections
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const imageLines = lines.filter((line) => line.startsWith("IMG:"));
    const plainLines = lines.filter((line) => !line.startsWith("IMG:"));
    setDirectionsText(plainLines.join("\n"));
    setDirectionImages(
      imageLines
        .map((line) => line.slice(4))
        .filter((src) => typeof src === "string" && src.length > 0),
    );

    const nutritionSource = (extra.nutrition as RecipeNutrition | undefined) ?? recipe.nutrition ?? null;
    const nextNutrition = createEmptyNutritionValues();
    if (nutritionSource) {
      for (const { key } of nutritionFieldConfig) {
        const value = nutritionSource[key];
        if (value !== undefined && value !== null) {
          nextNutrition[key] = String(value);
        }
      }
    }
    setNutritionValues(nextNutrition);

    const classification = (extra.classification ?? {}) as Record<string, unknown>;
    const modifiers = (serverNotes?.modifiers ?? {}) as Partial<Record<string, unknown>>;

    const extractArray = (value: unknown): string[] => {
      if (Array.isArray(value)) return value.map(String);
      if (typeof value === "string")
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      return [];
    };

    setSelectedNationality(extractArray(classification.nationality ?? modifiers.nationality));
    setSelectedCourses(extractArray(classification.courses ?? modifiers.courses));
    setSelectedRecipeType(extractArray(classification.recipeType ?? modifiers.recipeType));
    setSelectedPrepMethod(extractArray(classification.prepMethod ?? modifiers.prepMethod));
    setSelectedCookingEquipment(extractArray(classification.equipment ?? modifiers.equipment));
    setSelectedRecipeAccess(extractArray(classification.recipeAccess ?? serverNotes?.access));

    const storedTaxonomy = (extra.taxonomy as Partial<TaxonomySelection> | undefined) ?? undefined;
    setTaxonomy({ ...defaultSelection, ...(storedTaxonomy ?? {}) });

    setCoverPreview(recipe.imageDataUrls?.[0] ?? recipe.image ?? undefined);
  }, [recipe]);

  const allergenList = selectedAllergenList;

  const handleAllergensInputChange = useCallback((value: string) => {
    setAllergens(value);
    const next = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setSelectedAllergenList(next);
  }, []);

  const handleSidebarAllergensChange = useCallback((values: string[]) => {
    setSelectedAllergenList(values);
    setAllergens(values.join(", "));
  }, []);

  const handleDirectionImageFiles = useCallback(async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    try {
      const dataUrls = await Promise.all(files.map((file) => fileToDataUrl(file)));
      setDirectionImages((prev) => [...prev, ...dataUrls]);
    } catch (error) {
      console.error("Failed to read direction images", error);
    }
  }, []);

  const handleCoverFileChange = useCallback(async (list: FileList | null) => {
    if (!list?.length) return;
    try {
      const dataUrl = await fileToDataUrl(list[0]!);
      setCoverPreview(dataUrl);
    } catch (error) {
      console.error("Failed to read cover image", error);
    }
  }, []);

  const handleFinalize = useCallback(() => {
    if (!recipe) return;

    const directionLines = directionsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const combinedDirections = [...directionLines, ...directionImages.map((src) => `IMG:${src}`)].join("\n");

    const nutritionEntries = nutritionFieldConfig
      .map(({ key }) => {
        const raw = (nutritionValues as Record<string, string>)[key] ?? "";
        const trimmed = raw.trim();
        if (!trimmed) return null;
        const numeric = Number(trimmed);
        if (!Number.isFinite(numeric)) return null;
        return [key, numeric] as [keyof RecipeNutrition, number];
      })
      .filter((entry): entry is [keyof RecipeNutrition, number] => Array.isArray(entry));

    const nutritionPayload = nutritionEntries.length
      ? (Object.fromEntries(nutritionEntries) as RecipeNutrition)
      : null;

    const existingClassification = ((recipe.extra ?? {}) as { classification?: Record<string, unknown> }).classification ?? {};

    try {
      updateRecipe(recipe.id, {
        title: localTitle.trim() || "Untitled",
        instructions: combinedDirections ? combinedDirections.split(/\r?\n/) : undefined,
        nutrition: nutritionPayload,
        imageDataUrls: coverPreview
          ? [coverPreview, ...(recipe.imageDataUrls ?? []).slice(1)]
          : recipe.imageDataUrls,
        image: coverPreview ?? recipe.image,
        extra: {
          ...(recipe.extra ?? {}),
          allergens,
          allergenList: selectedAllergenList,
          cookTime,
          cookTemp,
          directions: combinedDirections,
          directionImages,
          nutrition: nutritionPayload ?? undefined,
          taxonomy,
          classification: {
            ...existingClassification,
            nationality: selectedNationality,
            courses: selectedCourses,
            recipeType: selectedRecipeType,
            prepMethod: selectedPrepMethod,
            equipment: selectedCookingEquipment,
            recipeAccess: selectedRecipeAccess,
          },
        },
      });

      toast({
        title: "Recipe finalized",
        description: "Saved to your library and cleared for the next entry.",
      });
      nav("/?tab=search");
    } catch (error) {
      console.error("Failed to finalize recipe", error);
      const message =
        error instanceof Error && error.message.trim().length
          ? error.message
          : "Unable to save changes.";
      toast({
        title: "Finalize failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [
    recipe,
    directionsText,
    directionImages,
    nutritionValues,
    localTitle,
    coverPreview,
    allergens,
    selectedAllergenList,
    cookTime,
    cookTemp,
    selectedNationality,
    selectedCourses,
    selectedRecipeType,
    selectedPrepMethod,
    selectedCookingEquipment,
    selectedRecipeAccess,
    taxonomy,
    updateRecipe,
    toast,
    nav,
  ]);

  const modifiers = useMemo(() => {
    const raw = (recipe?.extra ?? {}) as Record<string, unknown>;
    const list = raw.modifiers;
    if (!Array.isArray(list)) return [] as string[];
    return list
      .map((entry) => String(entry))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }, [recipe]);

  const handleAddModifier = useCallback(() => {
    if (!recipe) return;
    const name = window.prompt("Modifier name");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = Array.from(new Set([...modifiers, trimmed]));
    updateRecipe(recipe.id, {
      extra: {
        ...(recipe.extra ?? {}),
        modifiers: next,
      },
    });
  }, [modifiers, recipe, updateRecipe]);

  const handleRemoveModifier = useCallback(
    (index: number) => {
      if (!recipe) return;
      const next = modifiers.filter((_, idx) => idx !== index);
      updateRecipe(recipe.id, {
        extra: {
          ...(recipe.extra ?? {}),
          modifiers: next,
        },
      });
    },
    [modifiers, recipe, updateRecipe],
  );

  if (!recipe) {
    return (
      <div className="p-6">
        <div className="mb-4 text-sm text-muted-foreground">Recipe not found.</div>
        <div className="flex items-center gap-2">
          <Button onClick={handleBack}>Back</Button>
          <a href="/" className="text-sm underline">
            Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        paddingLeft: "calc(var(--sidebar-offset, 116px) + 0.5rem)",
      }}
    >
      <TopTabs />
      <div className="container mx-auto space-y-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Edit Recipe</h1>
            <p className="text-sm text-muted-foreground">
              Update presentation details, directions, and nutrition for this recipe.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleFinalize}>Finalize & Clear</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">General Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Labeled label="Recipe Name" id="recipe-name">
                    <Input
                      id="recipe-name"
                      name="recipe_title"
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      placeholder="House Burger"
                      suggestionScope="recipes"
                      minSuggestionQueryLength={1}
                    />
                  </Labeled>
                  <Labeled label="Allergens" id="recipe-allergens">
                    <Input
                      id="recipe-allergens"
                      name="recipe_allergens"
                      value={allergens}
                      onChange={(e) => handleAllergensInputChange(e.target.value)}
                      placeholder="Gluten, Dairy"
                      suggestionScope="tags"
                      minSuggestionQueryLength={1}
                    />
                  </Labeled>
                  <Labeled label="Cook Time" id="recipe-cook-time">
                    <Input
                      id="recipe-cook-time"
                      name="cook_time"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      placeholder="2:30"
                    />
                  </Labeled>
                  <Labeled label="Cook Temp" id="recipe-cook-temp">
                    <Input
                      id="recipe-cook-temp"
                      name="cook_temp"
                      value={cookTemp}
                      onChange={(e) => setCookTemp(e.target.value)}
                      placeholder="350F"
                    />
                  </Labeled>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Ingredients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recipe.extra && typeof recipe.extra === "object" && "ingredientsTable" in recipe.extra && Array.isArray((recipe.extra as any).ingredientsTable) && (
                  <RecipeEditorCostingPanel
                    ingredients={(recipe.extra as any).ingredientsTable}
                    recipeTitle={recipe.title}
                    servings={1}
                    compact={true}
                  />
                )}
                <IngredientsTable recipeId={recipe.id} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 pb-4">
                <div className="flex w-full items-center justify-between gap-3">
                  <CardTitle className="text-base">Directions</CardTitle>
                  <div className="flex items-center gap-2">
                    <input
                      ref={directionImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(event) => {
                        void handleDirectionImageFiles(event.target.files);
                        if (event.target) event.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => directionImageInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" /> Add photos
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Write step-by-step directions. Photos attach below and will display at the end of the instructions.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={directionsText}
                  onChange={(e) => setDirectionsText(e.target.value)}
                  rows={8}
                  placeholder={"1. Preheat oven to 350F\n2. Toast buns and prep toppings"}
                  className="min-h-[180px]"
                />
                {directionImages.length > 0 && (
                  <div className="space-y-3">
                    <Separator />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {directionImages.map((src, index) => (
                        <div key={`${src.slice(0, 32)}-${index}`} className="group relative overflow-hidden rounded-lg border bg-muted/30">
                          <img src={src} alt={`Step visual ${index + 1}`} className="h-40 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              setDirectionImages((prev) => prev.filter((_, idx) => idx !== index))
                            }
                            className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground shadow hover:text-destructive"
                            aria-label="Remove step photo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Nutrition</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Enter available nutrition facts. Leave fields blank if values are unknown.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {nutritionFieldConfig.map(({ key, label, unit }) => {
                    const fieldId = `nutrition-${key}`;
                    return (
                      <Labeled key={key} label={`${label} (${unit})`} id={fieldId}>
                        <Input
                          id={fieldId}
                          name={`nutrition_${key}`}
                          inputMode="decimal"
                          value={nutritionValues[key]}
                          onChange={(e) =>
                            setNutritionValues((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder="0"
                        />
                      </Labeled>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cover Photo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-lg border bg-muted/20">
                  {coverPreview ? (
                    <img src={coverPreview} alt={recipe.title} className="h-56 w-full object-cover" />
                  ) : (
                    <div className="flex h-56 w-full items-center justify-center text-sm text-muted-foreground">
                      No cover image yet
                    </div>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    void handleCoverFileChange(event.target.files);
                    if (event.target) event.target.value = "";
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {coverPreview ? "Replace Photo" : "Upload Photo"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowGalleryPicker(true)}
                  >
                    From Gallery
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Service Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Allergens</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allergenList.length ? (
                      allergenList.map((item) => (
                        <Badge key={item} variant="secondary">
                          {item}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None listed</span>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Cook Time</div>
                    <div className="font-medium">{cookTime || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Cook Temp</div>
                    <div className="font-medium">{cookTemp || "—"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs uppercase text-muted-foreground">Directions Photos</div>
                    <div className="font-medium">{directionImages.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Modifiers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Add optional modifiers for service teams to reference variations or add-ons.
                </p>
                {modifiers.length ? (
                  <ul className="space-y-2">
                    {modifiers.map((modifier, index) => (
                      <li
                        key={`${modifier}-${index}`}
                        className="flex items-center justify-between rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2"
                      >
                        <span className="font-medium text-foreground">{modifier}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveModifier(index)}
                          className="text-xs font-medium text-muted-foreground transition hover:text-destructive"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2 text-muted-foreground">
                    No modifiers yet.
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleAddModifier}
                >
                  <Plus className="h-4 w-4" /> Add Modifier
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
      <SubtleBottomGlow />
      <CornerBrand />
      <GalleryImagePicker
        open={showGalleryPicker}
        onOpenChange={setShowGalleryPicker}
        onSelectImage={setCoverPreview}
      />
    </div>
  );
}

function IngredientsTable({ recipeId }: { recipeId: string }) {
  const { getRecipeById, updateRecipe } = useAppData();
  const recipe = getRecipeById(recipeId)!;

  type Row = {
    qty: string;
    unit: string;
    item: string;
    prep: string;
    yield: string;
    cost: string;
    subId: string;
  };

  const normalizeValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const createBlankRow = (): Row => ({
    qty: "",
    unit: "",
    item: "",
    prep: "",
    yield: "",
    cost: "",
    subId: "",
  });

  const ingredientLines = useMemo(() => {
    if (!Array.isArray(recipe.ingredients)) return [] as string[];
    return recipe.ingredients.map((item) => String(item ?? ""));
  }, [recipe.ingredients]);

  const serverNoteRows = useMemo(() => {
    const extra = (recipe.extra ?? {}) as Record<string, unknown>;
    const serverNotes = extra?.serverNotes as
      | { ingredients?: Array<Record<string, unknown>> }
      | undefined;
    const ingredients = Array.isArray(serverNotes?.ingredients)
      ? serverNotes!.ingredients
      : [];
    return ingredients.map((entry) => ({
      ...createBlankRow(),
      qty: normalizeValue((entry as any).qty),
      unit: normalizeValue((entry as any).unit),
      item: normalizeValue((entry as any).item),
      prep: normalizeValue((entry as any).prep),
      yield: normalizeValue((entry as any).yield),
      cost: normalizeValue((entry as any).cost),
      subId: normalizeValue((entry as any).subId),
    }));
  }, [recipe.extra]);

  const parseLine = useCallback(
    (line: string): Row => {
      const blank = createBlankRow();
      const trimmed = line.trim();
      if (!trimmed) return blank;

      const extracted = extractLeadingQuantity(trimmed);
      let remainder = trimmed;
      if (extracted) {
        blank.qty = extracted.raw.trim();
        remainder = extracted.remainder.trim();
      }

      const parts = remainder.split(/\s+/).filter(Boolean);
      if (parts.length) {
        const candidate = parts[0];
        if (isLikelyUnit(candidate)) {
          blank.unit = candidate.toUpperCase();
          parts.shift();
        }
      }

      const remainingText = parts.join(" ").trim();
      const { item, prep } = splitItemAndPrep(remainingText);
      blank.item = item;
      blank.prep = prep;
      return blank;
    },
    [],
  );

  const rows = useMemo(() => {
    const extraTable = (recipe.extra as any)?.ingredientsTable as Row[] | undefined;
    let base: Row[];
    if (Array.isArray(extraTable) && extraTable.length > 0) {
      base = extraTable.map((entry) => ({ ...createBlankRow(), ...entry }));
    } else if (serverNoteRows.length > 0) {
      base = serverNoteRows.map((entry) => ({ ...createBlankRow(), ...entry }));
    } else {
      base = ingredientLines.map((line) => parseLine(line));
    }
    const padded = base.map((entry) => ({ ...createBlankRow(), ...entry }));
    const targetLength = Math.max(padded.length, ingredientLines.length, serverNoteRows.length, 12);
    while (padded.length < targetLength) {
      padded.push(createBlankRow());
    }
    return padded;
  }, [ingredientLines, parseLine, serverNoteRows, recipe.extra]);

  const isRowEmpty = (row: Row): boolean => {
    return !row.qty.trim() && !row.unit.trim() && !row.item.trim() && !row.prep.trim() && !row.yield.trim() && !row.cost.trim();
  };

  const setRow = (idx: number, patch: Partial<Row>) => {
    if (!recipe) return;
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)).map((row) => ({
      qty: normalizeValue(row.qty).trim(),
      unit: normalizeValue(row.unit).trim().toUpperCase(),
      item: normalizeValue(row.item).trim(),
      prep: normalizeValue(row.prep).trim(),
      yield: normalizeValue(row.yield).trim(),
      cost: normalizeValue(row.cost).trim(),
      subId: normalizeValue(row.subId).trim(),
    }));

    while (next.length && isRowEmpty(next[next.length - 1]!)) {
      next.pop();
    }

    const ingredientStrings = next
      .filter((row) => !isRowEmpty(row))
      .map((row) => {
        const quantityPart = [row.qty, row.unit, row.item].filter((part) => part.length > 0).join(" ").trim();
        if (row.prep.length > 0) {
          return quantityPart.length > 0 ? `${quantityPart}, ${row.prep}` : row.prep;
        }
        return quantityPart;
      })
      .filter((text) => text.length > 0);

    updateRecipe(recipeId, {
      ingredients: ingredientStrings.length ? ingredientStrings : recipe.ingredients,
      extra: {
        ...(recipe.extra ?? {}),
        ingredientsTable: next,
      },
    });
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
            <tr key={`ingredient-row-${i}`} className="border-t">
              <td className="p-1">
                <input
                  id={`ingredient-qty-${i}`}
                  name={`ingredient_qty_${i}`}
                  value={r.qty}
                  onChange={(e) => setRow(i, { qty: e.target.value })}
                  className="w-20 rounded border bg-background px-2 py-1"
                  data-fuzzy="off"
                />
              </td>
              <td className="p-1">
                <input
                  id={`ingredient-unit-${i}`}
                  name={`ingredient_unit_${i}`}
                  value={r.unit.toUpperCase()}
                  onChange={(e) => setRow(i, { unit: e.target.value.toUpperCase() })}
                  className="w-24 rounded border bg-background px-2 py-1 uppercase"
                  data-fuzzy-scope="tags"
                  data-fuzzy-min="1"
                />
              </td>
              <td className="p-1">
                <input
                  id={`ingredient-item-${i}`}
                  name={`ingredient_item_${i}`}
                  value={r.item}
                  onChange={(e) => setRow(i, { item: e.target.value })}
                  className="w-full rounded border bg-background px-2 py-1"
                  data-fuzzy-scope="ingredients"
                  data-fuzzy-min="1"
                />
              </td>
              <td className="p-1">
                <input
                  id={`ingredient-prep-${i}`}
                  name={`ingredient_prep_${i}`}
                  value={r.prep}
                  onChange={(e) => setRow(i, { prep: e.target.value })}
                  className="w-32 rounded border bg-background px-2 py-1"
                  data-fuzzy-scope="ingredients"
                  data-fuzzy-min="1"
                />
              </td>
              <td className="p-1">
                <input
                  id={`ingredient-yield-${i}`}
                  name={`ingredient_yield_${i}`}
                  value={r.yield}
                  onChange={(e) => setRow(i, { yield: e.target.value })}
                  className="w-24 rounded border bg-background px-2 py-1"
                  data-fuzzy="off"
                />
              </td>
              <td className="p-1">
                <input
                  id={`ingredient-cost-${i}`}
                  name={`ingredient_cost_${i}`}
                  value={r.cost}
                  onChange={(e) => setRow(i, { cost: e.target.value })}
                  className="w-24 rounded border bg-background px-2 py-1"
                  data-fuzzy="off"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
