import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Leaf, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Allergen = {
  name: string;
  severity: "mild" | "moderate" | "severe";
};

type NutritionInfo = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
};

interface RecipeNutritionAllergenPopupProps {
  allergens?: Allergen[];
  nutrition?: NutritionInfo;
  dietaryRestrictions?: string[];
  onOpenFullEditor?: () => void;
  className?: string;
}

const COMMON_ALLERGENS = [
  "Dairy",
  "Eggs",
  "Peanuts",
  "Tree Nuts",
  "Fish",
  "Shellfish",
  "Soy",
  "Wheat",
  "Sesame",
  "Mustard",
];

const SEVERITY_COLORS = {
  mild: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30",
  moderate:
    "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
  severe: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30",
};

export function RecipeNutritionAllergenPopup({
  allergens = [],
  nutrition,
  dietaryRestrictions = [],
  onOpenFullEditor,
  className,
}: RecipeNutritionAllergenPopupProps) {
  const [openFullModal, setOpenFullModal] = useState(false);

  const hasAllergens = allergens && allergens.length > 0;
  const hasDietary = dietaryRestrictions && dietaryRestrictions.length > 0;
  const hasNutrition = nutrition && Object.values(nutrition).some((v) => v);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2",
              (hasAllergens || hasDietary) && "border-amber-500/50 bg-amber-500/10",
              className
            )}
            title="Nutrition & Allergen Information"
          >
            <Leaf className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">
              {hasAllergens ? `${allergens.length} Allergen${allergens.length !== 1 ? "s" : ""}` : "Allergens"}
            </span>
            {hasAllergens && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/30 text-xs font-semibold">
                {allergens.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-4">
          <div className="space-y-4">
            {/* Allergens Section */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Allergens
              </h3>
              {hasAllergens ? (
                <div className="space-y-2">
                  {allergens.map((allergen, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm border",
                        SEVERITY_COLORS[allergen.severity]
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{allergen.name}</span>
                        <span className="text-xs capitalize opacity-75">
                          {allergen.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No allergens detected
                </p>
              )}
            </div>

            {/* Dietary Restrictions */}
            {hasDietary && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Dietary Restrictions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dietaryRestrictions.map((diet, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-[#c8a97e]/15 text-[#b8976c] dark:text-[#c8a97e] text-xs font-medium border border-[#c8a97e]/80 dark:border-[#c8a97e]/25"
                    >
                      {diet}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition Summary */}
            {hasNutrition && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Nutrition Facts</h3>
                <div className="grid grid-cols-2 gap-3">
                  {nutrition.calories && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                      <div className="text-xs text-muted-foreground">
                        Calories
                      </div>
                      <div className="text-lg font-semibold">
                        {nutrition.calories}
                      </div>
                    </div>
                  )}
                  {nutrition.protein && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                      <div className="text-xs text-muted-foreground">
                        Protein
                      </div>
                      <div className="text-lg font-semibold">
                        {nutrition.protein}g
                      </div>
                    </div>
                  )}
                  {nutrition.carbs && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                      <div className="text-xs text-muted-foreground">Carbs</div>
                      <div className="text-lg font-semibold">
                        {nutrition.carbs}g
                      </div>
                    </div>
                  )}
                  {nutrition.fat && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                      <div className="text-xs text-muted-foreground">Fat</div>
                      <div className="text-lg font-semibold">
                        {nutrition.fat}g
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Open Full Editor Button */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpenFullModal(true);
                  onOpenFullEditor?.();
                }}
                className="w-full gap-2 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                Open Full Editor
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Full Editor Modal Dialog */}
      {onOpenFullEditor && (
        <Dialog open={openFullModal} onOpenChange={setOpenFullModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nutrition & Allergen Details</DialogTitle>
            </DialogHeader>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground text-center py-8">
                Click "Open Full Editor" button in the popup to access the
                complete Nutrition & Allergen management interface.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default RecipeNutritionAllergenPopup;
