import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, Copy, Share2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecipeQuickViewProps {
  recipeId: string;
  title: string;
  cuisine?: string;
  course?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  cost?: number;
  price?: number;
  onClose?: () => void;
  onEdit?: () => void;
  onScale?: () => void;
}

/**
 * Mobile recipe quick view - bottom sheet style
 * Shows recipe details in a space-efficient manner for kitchen workflow
 */
export const MobileRecipeQuickView: React.FC<RecipeQuickViewProps> = ({
  recipeId,
  title,
  cuisine,
  course,
  prepTime,
  cookTime,
  servings,
  ingredients,
  instructions,
  cost,
  price,
  onClose,
  onEdit,
  onScale,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "ingredients" | "instructions">(
    "overview"
  );

  const totalTime = (prepTime || 0) + (cookTime || 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center">
      <Card
        className={cn(
          "w-full rounded-t-2xl md:rounded-lg md:w-96 max-h-[90vh] overflow-hidden flex flex-col",
          "md:max-h-[80vh]",
        )}
      >
        {/* Header - Sticky */}
        <CardHeader className="sticky top-0 bg-background border-b pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg md:text-xl truncate">{title}</CardTitle>
              <div className="flex gap-2 flex-wrap mt-2">
                {cuisine && <Badge variant="outline" className="text-xs">{cuisine}</Badge>}
                {course && <Badge variant="outline" className="text-xs">{course}</Badge>}
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg flex-shrink-0"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
            )}
          </div>
        </CardHeader>

        {/* Content - Scrollable */}
        <CardContent className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Time & Servings */}
              <div className="grid grid-cols-3 gap-3">
                {totalTime > 0 && (
                  <div className="p-3 rounded bg-muted/50">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Time</span>
                    </div>
                    <p className="font-semibold text-sm">{totalTime} min</p>
                  </div>
                )}
                {servings && (
                  <div className="p-3 rounded bg-muted/50">
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Servings</span>
                    </div>
                    <p className="font-semibold text-sm">{servings}</p>
                  </div>
                )}
                {cost && (
                  <div className="p-3 rounded bg-muted/50">
                    <span className="text-xs text-muted-foreground block mb-1">Cost</span>
                    <p className="font-semibold text-sm">${cost.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Economics */}
              {cost && price && (
                <div className="p-3 rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Profit</p>
                      <p className="font-bold text-green-700 dark:text-green-300">
                        ${(price - cost).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Margin</p>
                      <p className="font-bold text-green-700 dark:text-green-300">
                        {Math.round(((price - cost) / price) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground">Ingredients</p>
                  <p className="font-semibold text-base">{ingredients.length}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground">Steps</p>
                  <p className="font-semibold text-base">{instructions.length}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ingredients" && (
            <div className="space-y-2">
              {ingredients.map((ingredient, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded bg-muted/50 border text-sm flex items-start gap-2"
                >
                  <span className="text-muted-foreground flex-shrink-0">✓</span>
                  <span className="flex-1">{ingredient}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "instructions" && (
            <div className="space-y-3">
              {instructions.map((instruction, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    {idx + 1}
                  </div>
                  <p className="text-sm pt-0.5">{instruction}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Tab Navigation - Sticky */}
        <div className="sticky bottom-0 border-t bg-background flex">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex-1 py-3 text-xs font-semibold border-b-2 transition-colors",
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("ingredients")}
            className={cn(
              "flex-1 py-3 text-xs font-semibold border-b-2 transition-colors",
              activeTab === "ingredients"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Ingredients
          </button>
          <button
            onClick={() => setActiveTab("instructions")}
            className={cn(
              "flex-1 py-3 text-xs font-semibold border-b-2 transition-colors",
              activeTab === "instructions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Steps
          </button>
        </div>

        {/* Action Buttons */}
        <div className="border-t p-4 grid grid-cols-2 gap-2">
          {onScale && (
            <Button variant="outline" size="sm" onClick={onScale} className="text-xs">
              Scale
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="text-xs">
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(title)}
            className="text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MobileRecipeQuickView;
