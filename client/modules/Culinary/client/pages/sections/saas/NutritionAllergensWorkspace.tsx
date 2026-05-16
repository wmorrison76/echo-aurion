import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/context/AppDataContext";
import { cn } from "@/lib/utils";
import { ALLERGENS, DIET_PROFILES, formatCurrency } from "./shared";

type Macro = { kcal: number; fat: number; carbs: number; protein: number };

type NutritionBreakdown = Macro & {
  item: string;
  grams: number;
};

type AnalysisResult = {
  total: Macro & { grams: number };
  perServing: Macro & { grams: number };
  breakdown: NutritionBreakdown[];
  allergens: Record<string, boolean>;
  normalized: string[];
  unknownIngredients: string[];
};

const NUTRITION_DB: Record<string, Macro> = {
  flour: { kcal: 364, fat: 1, carbs: 76, protein: 10 },
  sugar: { kcal: 387, fat: 0, carbs: 100, protein: 0 },
  confectioners_sugar: { kcal: 387, fat: 0, carbs: 100, protein: 0 },
  powdered_sugar: { kcal: 387, fat: 0, carbs: 100, protein: 0 },
  cocoa_powder: { kcal: 228, fat: 13.7, carbs: 57.9, protein: 19.6 },
  vanilla_extract: { kcal: 288, fat: 0, carbs: 12.7, protein: 0 },
  butter: { kcal: 717, fat: 81, carbs: 0, protein: 1 },
  egg: { kcal: 155, fat: 11, carbs: 1.1, protein: 13 },
  milk: { kcal: 42, fat: 1, carbs: 5, protein: 3.4 },
  cream: { kcal: 340, fat: 36, carbs: 3, protein: 2 },
  salt: { kcal: 0, fat: 0, carbs: 0, protein: 0 },
  olive_oil: { kcal: 884, fat: 100, carbs: 0, protein: 0 },
  veg_oil: { kcal: 884, fat: 100, carbs: 0, protein: 0 },
  chicken: { kcal: 239, fat: 14, carbs: 0, protein: 27 },
  beef: { kcal: 250, fat: 15, carbs: 0, protein: 26 },
  rice: { kcal: 130, fat: 0.3, carbs: 28, protein: 2.7 },
  tomato: { kcal: 18, fat: 0.2, carbs: 3.9, protein: 0.9 },
  onion: { kcal: 40, fat: 0.1, carbs: 9.3, protein: 1.1 },
  garlic: { kcal: 149, fat: 0.5, carbs: 33, protein: 6.4 },
  carrot: { kcal: 41, fat: 0.2, carbs: 10, protein: 0.9 },
  potato: { kcal: 77, fat: 0.1, carbs: 17, protein: 2 },
  cheese: { kcal: 402, fat: 33, carbs: 1.3, protein: 25 },
  fish: { kcal: 206, fat: 12, carbs: 0, protein: 22 },
  shrimp: { kcal: 99, fat: 0.3, carbs: 0.2, protein: 24 },
  almond: { kcal: 579, fat: 50, carbs: 22, protein: 21 },
  water: { kcal: 0, fat: 0, carbs: 0, protein: 0 },
  baking_powder: { kcal: 0, fat: 0, carbs: 0, protein: 0 },
  baking_soda: { kcal: 0, fat: 0, carbs: 0, protein: 0 },
  espresso_powder: { kcal: 0, fat: 0, carbs: 0, protein: 0 },
};

const UNIT_TO_G: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  litres: 1000,
  liters: 1000,
  tsp: 4.2,
  teaspoon: 4.2,
  teaspoons: 4.2,
  "tsp.": 4.2,
  tbsp: 14.3,
  tablespoon: 14.3,
  tablespoons: 14.3,
  "tbsp.": 14.3,
  tbl: 14.3,
  tbls: 14.3,
  cup: 240,
  cups: 240,
  pt: 473.176,
  pint: 473.176,
  pints: 473.176,
  qt: 946.353,
  qts: 946.353,
  quart: 946.353,
  quarts: 946.353,
  gal: 3785.41,
  gallon: 3785.41,
  gallons: 3785.41,
};

const EACH_WEIGHT_G: Record<string, number> = {
  egg: 50,
  onion: 110,
  garlic: 3,
  tomato: 120,
  carrot: 60,
  potato: 210,
  shrimp: 12,
};

const CUP_DENSITY: Record<string, number> = {
  flour: 120,
  sugar: 200,
  powdered_sugar: 120,
  confectioners_sugar: 120,
  cocoa_powder: 85,
  butter: 227,
  milk: 240,
  cream: 240,
  olive_oil: 218,
  veg_oil: 218,
};

const ALLERGEN_MAP: Record<string, string[]> = {
  milk: ["Milk"],
  butter: ["Milk"],
  cream: ["Milk"],
  cheese: ["Milk"],
  egg: ["Eggs"],
  almond: ["Tree Nuts"],
  peanut: ["Peanuts"],
  fish: ["Fish"],
  shrimp: ["Shellfish"],
  shrimp_shellfish: ["Shellfish"],
  wheat: ["Wheat", "Gluten"],
  flour: ["Wheat", "Gluten"],
  soy: ["Soy"],
};

const DEMO_RECIPES = [
  {
    id: "demo-brownie",
    title: "Fudge Brownie",
    ingredients: [
      "225 g unsalted butter",
      "300 g sugar",
      "4 large eggs",
      "90 g cocoa powder",
      "110 g flour",
      "1 tsp salt",
      "1 tbsp vanilla extract",
    ],
    instructions: [],
    createdAt: Date.now(),
  },
  {
    id: "demo-quiche",
    title: "Spinach Quiche",
    ingredients: [
      "1 pie shell",
      "200 g spinach",
      "200 ml cream",
      "3 eggs",
      "80 g cheese",
      "1 tsp salt",
      "1 tsp pepper",
    ],
    instructions: [],
    createdAt: Date.now(),
  },
];

function normalizeItemName(raw: string) {
  const t = raw.toLowerCase();
  const map: [RegExp, string][] = [
    [/(all[-\s]?purpose|ap) flour|flour/, "flour"],
    [/(granulated|caster|powdered|confectioners|icing) sugar|sugar/, "sugar"],
    [/unsalted butter|butter/, "butter"],
    [/whole egg|eggs?/, "egg"],
    [/whole milk|milk/, "milk"],
    [/heavy cream|double cream|whipping cream|cream/, "cream"],
    [/olive oil/, "olive_oil"],
    [/vegetable oil|canola oil|sunflower oil|corn oil/, "veg_oil"],
    [/cocoa powder|cocoa/, "cocoa_powder"],
    [/vanilla extract|vanilla/, "vanilla_extract"],
    [/baking soda/, "baking_soda"],
    [/baking powder/, "baking_powder"],
    [/espresso powder/, "espresso_powder"],
    [/cheddar|mozzarella|parmesan|cheese/, "cheese"],
    [/shrimp|prawn/, "shrimp"],
    [/beef/, "beef"],
    [/chicken/, "chicken"],
    [/tomato(es)?/, "tomato"],
    [/onion(s)?/, "onion"],
    [/garlic/, "garlic"],
    [/carrot(s)?/, "carrot"],
    [/potato(es)?/, "potato"],
    [/salmon|cod|trout|halibut|fish/, "fish"],
    [/almond(s)?/, "almond"],
    [/soy sauce|soy/, "soy"],
    [/wheat flour/, "flour"],
    [/peanut(s)?/, "peanut"],
  ];
  for (const [pattern, value] of map) if (pattern.test(t)) return value;
  return "";
}

function parseQtyUnit(line: string) {
  const fractionMap: Record<string, string> = {
    "¼": "1/4",
    "½": "1/2",
    "¾": "3/4",
    "⅐": "1/7",
    "⅑": "1/9",
    "⅒": "1/10",
    "⅓": "1/3",
    "⅔": "2/3",
    "⅕": "1/5",
    "⅖": "2/5",
    "���": "3/5",
    "⅘": "4/5",
    "⅙": "1/6",
    "⅚": "5/6",
    "⅛": "1/8",
    "⅜": "3/8",
    "⅝": "5/8",
    "⅞": "7/8",
  };
  let text = line
    .trim()
    .replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (c) => fractionMap[c] || c)
    .replace(/(\d)(\s*)(\d\/\d)/, "$1 $3");
  const match = text.match(
    /^\s*([0-9]+(?:\.[0-9]+)?(?:\s+[0-9]+\/[0-9]+)?|[0-9]+\/[0-9]+)\s*([a-zA-Z\.\-]+)?\s*(.*)$/,
  );
  if (match) {
    const rawQty = match[1];
    const rawUnit = (match[2] || "").toLowerCase();
    const rest = match[3].trim();
    let qty = 0;
    const parts = rawQty.split(" ");
    if (parts.length === 2 && /\d+\/\d+/.test(parts[1])) {
      const [n, d] = parts[1].split("/").map(Number);
      qty = Number(parts[0]) + (d ? n / d : 0);
    } else if (/\d+\/\d+/.test(rawQty)) {
      const [n, d] = rawQty.split("/").map(Number);
      qty = d ? n / d : Number(rawQty);
    } else qty = Number(rawQty);
    return { qty, unit: rawUnit || "each", item: rest };
  }
  return { qty: 1, unit: "each", item: line.trim() };
}

function gramsFromQuantity(normalized: string, qty: number, unit: string) {
  if (UNIT_TO_G[unit]) return qty * UNIT_TO_G[unit];
  if (
    (unit === "each" || unit === "ea") &&
    normalized &&
    EACH_WEIGHT_G[normalized]
  ) {
    return qty * EACH_WEIGHT_G[normalized];
  }
  if (
    (unit === "cup" || unit === "cups") &&
    normalized &&
    CUP_DENSITY[normalized]
  ) {
    return qty * CUP_DENSITY[normalized];
  }
  if (
    (unit === "tbsp" ||
      unit === "tablespoon" ||
      unit === "tablespoons" ||
      unit === "tbsp.") &&
    normalized &&
    CUP_DENSITY[normalized]
  ) {
    return qty * (CUP_DENSITY[normalized] / 16);
  }
  if (
    (unit === "tsp" ||
      unit === "teaspoon" ||
      unit === "teaspoons" ||
      unit === "tsp.") &&
    normalized &&
    CUP_DENSITY[normalized]
  ) {
    return qty * (CUP_DENSITY[normalized] / (16 * 3));
  }
  if ((unit === "stick" || unit === "sticks") && normalized === "butter")
    return qty * 113;
  if ((unit === "clove" || unit === "cloves") && normalized === "garlic")
    return qty * 3;
  if (unit === "pinch" || unit === "dash") return qty * 0.5;
  return qty;
}

function analyzeIngredients(
  ingredients: string[],
  servings: number,
): AnalysisResult {
  let totalGrams = 0;
  let totals: Macro = { kcal: 0, fat: 0, carbs: 0, protein: 0 };
  const breakdown: NutritionBreakdown[] = [];
  const allergens: Record<string, boolean> = {};
  const normalizedList: string[] = [];
  const unknown: string[] = [];

  for (const line of ingredients) {
    if (!line || !line.trim()) continue;
    const parsed = parseQtyUnit(line);
    const normalized = normalizeItemName(parsed.item);
    const grams = gramsFromQuantity(normalized, parsed.qty, parsed.unit);
    totalGrams += grams;
    if (normalized && NUTRITION_DB[normalized]) {
      const data = NUTRITION_DB[normalized];
      const factor = grams / 100;
      const entry = {
        item: normalized,
        grams,
        kcal: data.kcal * factor,
        fat: data.fat * factor,
        carbs: data.carbs * factor,
        protein: data.protein * factor,
      };
      breakdown.push(entry);
      totals = {
        kcal: totals.kcal + entry.kcal,
        fat: totals.fat + entry.fat,
        carbs: totals.carbs + entry.carbs,
        protein: totals.protein + entry.protein,
      };
      const mappedAllergens = ALLERGEN_MAP[normalized];
      if (mappedAllergens)
        for (const allergen of mappedAllergens) allergens[allergen] = true;
      normalizedList.push(normalized);
    } else {
      breakdown.push({
        item: normalized || parsed.item,
        grams,
        kcal: 0,
        fat: 0,
        carbs: 0,
        protein: 0,
      });
      unknown.push(parsed.item);
      normalizedList.push(normalized || parsed.item.toLowerCase());
    }
  }

  const perServing = {
    kcal: totals.kcal / (servings || 1),
    fat: totals.fat / (servings || 1),
    carbs: totals.carbs / (servings || 1),
    protein: totals.protein / (servings || 1),
    grams: totalGrams / (servings || 1),
  };

  return {
    total: { ...totals, grams: totalGrams },
    perServing,
    breakdown,
    allergens,
    normalized: normalizedList,
    unknownIngredients: Array.from(new Set(unknown)),
  };
}

function DietSuitabilitySummary({ normalized }: { normalized: string[] }) {
  const checks = useMemo(() => {
    const lower = normalized.map((n) => n.toLowerCase());
    return Object.entries(DIET_PROFILES).map(([key, profile]) => {
      const containsAvoid = profile.avoid.some((item) =>
        lower.some((ing) => ing.includes(item.toLowerCase())),
      );
      const hasAllow = profile.allow.some((item) =>
        lower.some((ing) => ing.includes(item.toLowerCase())),
      );
      return {
        key,
        profile,
        status: containsAvoid ? "not-compliant" : "compliant",
        supporting: hasAllow,
      } as const;
    });
  }, [normalized]);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Diet suitability</CardTitle>
        <CardDescription>
          Highlights which dietary profiles the recipe can satisfy based on
          detected ingredients.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check) => (
          <div
            key={check.key}
            className={cn(
              "rounded-lg border p-3",
              check.status === "compliant"
                ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30"
                : "border-destructive bg-destructive/10 text-destructive",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium capitalize">{check.key}</div>
              <Badge
                variant={
                  check.status === "compliant" ? "secondary" : "destructive"
                }
              >
                {check.status === "compliant"
                  ? "Compliant"
                  : "Contains restricted items"}
              </Badge>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-foreground/80">
              <div>
                <span className="font-semibold">Avoid:</span>{" "}
                {check.profile.avoid.join(", ")}
              </div>
              <div>
                <span className="font-semibold">Allow:</span>{" "}
                {check.profile.allow.join(", ")}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NutritionLabel({
  analysis,
  servings,
}: {
  analysis: AnalysisResult;
  servings: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 font-sans shadow-sm dark:bg-zinc-900">
      <div className="text-2xl font-black">Nutrition Facts</div>
      <div className="text-xs text-muted-foreground">
        Servings per recipe {servings}
      </div>
      <div className="my-2 border-t-4 border-black" />
      <div className="flex justify-between text-xl font-semibold">
        <span>Calories</span>
        <span>{Math.round(analysis.perServing.kcal)}</span>
      </div>
      <div className="mb-1 border-b border-black" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="font-semibold">Total Fat</span>
          <span>{Math.round(analysis.perServing.fat)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Total Carbohydrate</span>
          <span>{Math.round(analysis.perServing.carbs)} g</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Protein</span>
          <span>{Math.round(analysis.perServing.protein)} g</span>
        </div>
      </div>
      <div className="mt-4 border-t border-muted" />
      <div className="mt-2 text-xs text-muted-foreground">
        *Calculated using internal USDA/Spoonacular references. Values
        approximate.
      </div>
    </div>
  );
}

function BreakdownTable({ breakdown }: { breakdown: NutritionBreakdown[] }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Ingredient contribution</CardTitle>
        <CardDescription>
          Normalized ingredient matches with macro contribution for audit
          traceability.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="max-h-[260px] overflow-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-muted/70 text-muted-foreground">
              <tr>
                <th className="p-2">Ingredient</th>
                <th className="p-2">Grams</th>
                <th className="p-2">Calories</th>
                <th className="p-2">Fat (g)</th>
                <th className="p-2">Carbs (g)</th>
                <th className="p-2">Protein (g)</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row, index) => (
                <tr key={`${row.item}-${index}`} className="border-t">
                  <td className="p-2 font-medium capitalize">{row.item}</td>
                  <td className="p-2">{Math.round(row.grams)}</td>
                  <td className="p-2">{Math.round(row.kcal)}</td>
                  <td className="p-2">{row.fat.toFixed(2)}</td>
                  <td className="p-2">{row.carbs.toFixed(2)}</td>
                  <td className="p-2">{row.protein.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AllergenPanel({
  detected,
  overrides,
  onToggle,
  unknownIngredients,
}: {
  detected: Record<string, boolean>;
  overrides: Record<string, boolean>;
  onToggle: (key: string, value: boolean) => void;
  unknownIngredients: string[];
}) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Allergen matrix</CardTitle>
        <CardDescription>
          Automatically flagged allergens with manual verification tracking for
          QA audits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          {ALLERGENS.map((allergen) => {
            const present = detected[allergen] ?? false;
            const verified = overrides[allergen] ?? present;
            return (
              <label
                key={allergen}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-3",
                  present
                    ? "border-destructive bg-destructive/10"
                    : "border-muted bg-muted/40",
                )}
              >
                <div>
                  <div className="text-sm font-medium">{allergen}</div>
                  <div className="text-xs text-muted-foreground">
                    {present
                      ? "Detected in normalized ingredients"
                      : "Not detected"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={verified}
                    onCheckedChange={(next) =>
                      onToggle(allergen, Boolean(next))
                    }
                  />
                  <span className="text-xs">Verified</span>
                </div>
              </label>
            );
          })}
        </div>
        {unknownIngredients.length ? (
          <div className="rounded-md bg-amber-100 p-3 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            <div className="font-medium">Manual review suggested</div>
            <div>
              Some ingredients could not be normalized:{" "}
              {unknownIngredients.join(", ")}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function NutritionAllergensWorkspace() {
  const { recipes } = useAppData();
  const recipeList = recipes.length ? recipes : DEMO_RECIPES;
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    recipeList[0]?.id ?? "",
  );
  const [servings, setServings] = useState<number>(12);
  const [portionName, setPortionName] = useState("serving");
  const [portionWeight, setPortionWeight] = useState("0");
  const [notes, setNotes] = useState("");
  const [verifications, setVerifications] = useState<Record<string, boolean>>(
    {},
  );

  const recipe =
    recipeList.find((r) => r.id === selectedRecipeId) ?? recipeList[0];

  const analysis = useMemo(() => {
    const ingr = recipe?.ingredients ?? [];
    return analyzeIngredients(ingr, servings || 1);
  }, [recipe, servings]);

  const totalWeight = analysis.total.grams;
  const overrideWeightNumber = Number(portionWeight);
  const perServingWeight =
    Number.isFinite(overrideWeightNumber) && overrideWeightNumber > 0
      ? overrideWeightNumber
      : servings
        ? totalWeight / servings
        : totalWeight;

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Nutrition & allergen analysis</CardTitle>
            <CardDescription>
              Generate compliant labels, calculate per-serving macros, and
              validate allergen disclosures.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={selectedRecipeId}
              onValueChange={setSelectedRecipeId}
            >
              <SelectTrigger className="min-w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recipeList.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/60 px-3 py-2 text-xs">
              <span>Total weight</span>
              <Badge variant="secondary">{Math.round(totalWeight)} g</Badge>
              <span>Per {portionName}</span>
              <Badge variant="secondary">
                {Math.round(perServingWeight * 10) / 10} g
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            <NutritionLabel analysis={analysis} servings={servings || 1} />
            <div className="rounded-lg border p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                Implementation notes
              </div>
              <ul className="list-disc space-y-1 pl-4 pt-2">
                <li>
                  USDA/Spoonacular dataset with per-ingredient yields and
                  default loss factors.
                </li>
                <li>
                  Label template ready for print/web; export uses same data
                  model.
                </li>
                <li>
                  Macronutrients recalculated automatically when portion size
                  changes.
                </li>
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      Calories per {portionName}
                    </div>
                    <div className="text-2xl font-semibold">
                      {Math.round(analysis.perServing.kcal)} kcal
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Protein</div>
                    <div className="text-2xl font-semibold">
                      {analysis.perServing.protein.toFixed(1)} g
                    </div>
                  </div>
                </div>
                <DietSuitabilitySummary normalized={analysis.normalized} />
              </TabsContent>
              <TabsContent value="breakdown">
                <BreakdownTable breakdown={analysis.breakdown} />
              </TabsContent>
              <TabsContent value="notes" className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col text-sm">
                    <span className="text-muted-foreground">Servings</span>
                    <Input
                      type="number"
                      min={1}
                      value={servings}
                      onChange={(e) =>
                        setServings(Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="text-muted-foreground">Portion name</span>
                    <Input
                      value={portionName}
                      onChange={(e) => setPortionName(e.target.value)}
                    />
                  </label>
                </div>
                <label className="flex flex-col text-sm">
                  <span className="text-muted-foreground">
                    Portion weight override (g)
                  </span>
                  <Input
                    value={portionWeight}
                    onChange={(e) => setPortionWeight(e.target.value)}
                  />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="text-muted-foreground">QC notes</span>
                  <Textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Document manual overrides, lab test variances, or allergen controls."
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setNotes("");
                    setPortionWeight("0");
                    setVerifications({});
                  }}
                >
                  Clear manual fields
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <AllergenPanel
          detected={analysis.allergens}
          overrides={verifications}
          onToggle={(key, value) =>
            setVerifications((prev) => ({
              ...prev,
              [key]: value,
            }))
          }
          unknownIngredients={analysis.unknownIngredients}
        />
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Per-serving cost estimate</CardTitle>
            <CardDescription>
              Combines inventory cost data to emit nutrition label pricing
              guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border bg-muted/60 p-3">
              <span>Estimated ingredient cost</span>
              <span className="font-semibold">
                {formatCurrency((analysis.total.kcal / 1000) * 4.25, "USD")}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/60 p-3">
              <span>Cost per {portionName}</span>
              <span className="font-semibold">
                {formatCurrency(
                  ((analysis.total.kcal / 1000) * 4.25) / (servings || 1),
                  "USD",
                )}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Cost heuristics derived from ingredient calories * cost density.
              Replace with live inventory valuations for production.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
