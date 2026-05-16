import * as React from "react";

import { AlertCircle, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ALLERGENS = [
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat",
  "Soy",
  "Sesame",
  "Gluten",
];

type NutritionEstimate = {
  servings: number;
  kcalPerServing: number;
  proteinGPerServing: number;
  carbsGPerServing: number;
  fatGPerServing: number;
};

function estimateNutrition(ingredientsText: string, servings: number): NutritionEstimate {
  const lines = ingredientsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Very lightweight estimate: weights keywords rather than full USDA parsing.
  const weights = lines.reduce(
    (acc, line) => {
      const t = line.toLowerCase();
      if (t.includes("butter") || t.includes("cream") || t.includes("oil")) acc.fat += 1;
      if (t.includes("flour") || t.includes("sugar") || t.includes("chocolate") || t.includes("fruit")) acc.carbs += 1;
      if (t.includes("egg") || t.includes("yogurt") || t.includes("cheese") || t.includes("nuts")) acc.protein += 1;
      return acc;
    },
    { fat: 0, carbs: 0, protein: 0 },
  );

  const totalUnits = weights.fat + weights.carbs + weights.protein;
  const normalized = totalUnits > 0 ? totalUnits : 1;

  const kcalTotal = weights.fat * 220 + weights.carbs * 160 + weights.protein * 120;
  const kcalPerServing = kcalTotal / (servings || 1);

  return {
    servings,
    kcalPerServing,
    proteinGPerServing: (weights.protein * 18) / normalized,
    carbsGPerServing: (weights.carbs * 35) / normalized,
    fatGPerServing: (weights.fat * 15) / normalized,
  };
}

function detectAllergens(ingredientsText: string) {
  const t = ingredientsText.toLowerCase();
  const detected: Record<string, boolean> = {};

  const checks: Array<[string, RegExp]> = [
    ["Milk", /(milk|butter|cream|cheese|yogurt)/i],
    ["Eggs", /\begg(s)?\b/i],
    ["Fish", /\b(salmon|cod|fish)\b/i],
    ["Shellfish", /\b(shrimp|prawn|lobster|crab|shellfish)\b/i],
    ["Tree Nuts", /\b(almond|hazelnut|walnut|pecan|cashew|pistachio)\b/i],
    ["Peanuts", /\bpeanut(s)?\b/i],
    ["Wheat", /\b(flour|wheat)\b/i],
    ["Soy", /\bsoy\b/i],
    ["Sesame", /\bsesame\b/i],
    ["Gluten", /\b(gluten|flour|wheat|barley|rye)\b/i],
  ];

  for (const [allergen, re] of checks) detected[allergen] = re.test(t);

  return detected;
}

export default function NutritionAllergensWorkspace() {
  const [servings, setServings] = React.useState(12);
  const [recipeName, setRecipeName] = React.useState("Fudge Brownie");
  const [ingredients, setIngredients] = React.useState(
    "225 g unsalted butter\n300 g sugar\n4 large eggs\n90 g cocoa powder\n110 g flour\n1 tsp salt\n1 tbsp vanilla extract",
  );

  const detected = React.useMemo(() => detectAllergens(ingredients), [ingredients]);
  const [verified, setVerified] = React.useState<Record<string, boolean>>(() => ({}));

  React.useEffect(() => {
    // keep verified in sync with new detections, but don't override explicit toggles
    setVerified((prev) => {
      const next = { ...prev };
      for (const allergen of ALLERGENS) {
        if (typeof next[allergen] === "undefined") next[allergen] = detected[allergen] ?? false;
      }
      return next;
    });
  }, [detected]);

  const estimate = React.useMemo(() => estimateNutrition(ingredients, servings), [ingredients, servings]);

  const verifiedList = React.useMemo(() => {
    return ALLERGENS.filter((a) => verified[a]);
  }, [verified]);

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Nutrition & allergens</CardTitle>
          <CardDescription>
            Quick analysis panel for label draft + allergen disclosure verification.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">Recipe name</span>
              <Input value={recipeName} onChange={(e) => setRecipeName(e.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Servings</span>
              <Input
                inputMode="numeric"
                value={String(servings)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setServings(Number.isFinite(n) && n > 0 ? Math.floor(n) : 1);
                }}
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Ingredients (one per line)</span>
            <Textarea rows={7} value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
          </label>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Estimated per-serving macros</CardTitle>
                <CardDescription>Approximate values for drafts and internal review.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-muted-foreground">Calories</span>
                  <span className="font-semibold">{Math.round(estimate.kcalPerServing)} kcal</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-muted-foreground">Protein</span>
                  <span className="font-semibold">{estimate.proteinGPerServing.toFixed(1)} g</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-muted-foreground">Carbs</span>
                  <span className="font-semibold">{estimate.carbsGPerServing.toFixed(1)} g</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-muted-foreground">Fat</span>
                  <span className="font-semibold">{estimate.fatGPerServing.toFixed(1)} g</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  This estimator intentionally avoids heavy parsing; connect to your nutrition source of truth when ready.
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Allergen verification
                </CardTitle>
                <CardDescription>Detected allergens from ingredient keywords with manual overrides.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  {ALLERGENS.map((a) => {
                    const present = detected[a] ?? false;
                    const checked = verified[a] ?? false;
                    return (
                      <label
                        key={a}
                        className={
                          "flex items-center justify-between gap-3 rounded-lg border p-3 text-sm " +
                          (present ? "border-destructive bg-destructive/10" : "bg-muted/30")
                        }
                      >
                        <div>
                          <div className="font-medium">{a}</div>
                          <div className="text-xs text-muted-foreground">
                            {present ? "Detected" : "Not detected"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setVerified((prev) => ({ ...prev, [a]: Boolean(next) }))
                            }
                          />
                          <span className="text-xs">Verify</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Verified disclosure</div>
                  {verifiedList.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {verifiedList.map((a) => (
                        <Badge key={a} variant="secondary">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      No allergens verified.
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(
                        `Recipe: ${recipeName}\nServings: ${servings}\nVerified allergens: ${verifiedList.join(", ") || "None"}`,
                      )
                      .catch(() => {});
                  }}
                >
                  Copy summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
