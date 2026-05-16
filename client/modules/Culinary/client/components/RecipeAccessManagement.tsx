import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { format } from "date-fns";

export interface RecipeAccess {
  id: string;
  recipe_id: string;
  recipe_name: string;
  confirmed_by?: string;
  confirmed_at?: string;
  is_active: boolean;
  access_level: "all" | "chef" | "department";
  allowed_departments?: string[];
  updated_at: string;
}

interface Props {
  recipes: RecipeAccess[];
  onConfirm: (recipeId: string) => Promise<void>;
  onToggleAccess: (recipeId: string, isActive: boolean) => Promise<void>;
}

export function RecipeAccessManagement({
  recipes,
  onConfirm,
  onToggleAccess,
}: Props) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleConfirm = useCallback(
    async (recipeId: string) => {
      setConfirming(recipeId);
      try {
        await onConfirm(recipeId);
      } finally {
        setConfirming(null);
      }
    },
    [onConfirm],
  );

  const handleToggle = useCallback(
    async (recipeId: string, isActive: boolean) => {
      setToggling(recipeId);
      try {
        await onToggleAccess(recipeId, isActive);
      } finally {
        setToggling(null);
      }
    },
    [onToggleAccess],
  );

  if (recipes.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-semibold">No recipes configured</p>
        <p className="text-sm text-gray-500 mt-1">
          Recipes will appear here as they are added to your menu
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recipes.map((recipe) => (
        <div
          key={recipe.id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {recipe.recipe_name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                ID: {recipe.recipe_id}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggle(recipe.recipe_id, recipe.is_active)}
                disabled={toggling === recipe.recipe_id}
                className={`px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                  recipe.is_active
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {recipe.is_active ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    Active
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Inactive
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-600">Access Level: </span>
              <span className="font-semibold text-gray-900 capitalize">
                {recipe.access_level}
              </span>
            </div>
            {recipe.allowed_departments &&
              recipe.allowed_departments.length > 0 && (
                <div>
                  <span className="text-gray-600">Departments: </span>
                  <span className="font-semibold text-gray-900">
                    {recipe.allowed_departments.join(", ")}
                  </span>
                </div>
              )}
          </div>

          <div className="bg-gray-50 rounded p-3 mb-4">
            {recipe.confirmed_at ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <span className="font-semibold">Recipe confirmed</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {format(new Date(recipe.confirmed_at), "MMM d, yyyy")}
                  </span>
                  {recipe.confirmed_by && (
                    <span className="text-sm text-gray-600 ml-2">
                      by {recipe.confirmed_by}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">
                  Awaiting confirmation from Chef
                </span>
              </div>
            )}
          </div>

          {!recipe.confirmed_at && (
            <Button
              onClick={() => handleConfirm(recipe.recipe_id)}
              disabled={confirming === recipe.recipe_id}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {confirming === recipe.recipe_id
                ? "Confirming..."
                : "Confirm Recipe Accuracy"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
