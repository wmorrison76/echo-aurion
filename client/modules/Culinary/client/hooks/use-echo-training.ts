import { useCallback, useState } from "react";
import { mapImportedRecipeToCodex } from "../lib/recipe-codex-mapper";

interface TrainingRecipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  sourceBook: string;
  sourcePage: number;
  cuisine?: string;
  course?: string;
  difficulty?: string;
  prepTime?: string;
  cookTime?: string;
  yield?: string;
  tags?: string[];
}

interface TrainingResult {
  success: number;
  failed: number;
  results: Array<{
    recipeId: string;
    title: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Hook to train EchoAi³ with recipes from PDF/textbook imports
 * Automatically enriches recipes with codex metadata before storage
 */
export function useEchoTraining() {
  const [isTraining, setIsTraining] = useState(false);
  const [showTrainingResult, setShowTrainingResult] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState<string>("");
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);

  const trainWithRecipes = useCallback(
    async (
      recipes: TrainingRecipe[],
      bookName: string,
    ): Promise<TrainingResult> => {
      setIsTraining(true);
      setTrainingProgress(
        `Preparing to train Echo with ${recipes.length} recipes from ${bookName}...`,
      );

      const results: TrainingResult = {
        success: 0,
        failed: 0,
        results: [],
      };

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        setTrainingProgress(
          `Training ${i + 1}/${recipes.length}: ${recipe.title}`,
        );

        try {
          // Enrich recipe with codex metadata
          const codexMetadata = mapImportedRecipeToCodex(recipe);

          // Call backend to store in Pinecone with enriched metadata
          const response = await fetch("/api/echo-training/store-recipe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipe,
              codexMetadata,
              bookName,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            results.results.push({
              recipeId: recipe.id,
              title: recipe.title,
              success: false,
              error: `Failed: ${error}`,
            });
            results.failed++;
            continue;
          }

          const data = await response.json();

          if (data.success) {
            results.results.push({
              recipeId: recipe.id,
              title: recipe.title,
              success: true,
            });
            results.success++;
          } else {
            results.results.push({
              recipeId: recipe.id,
              title: recipe.title,
              success: false,
              error: data.error || "Unknown error",
            });
            results.failed++;
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          results.results.push({
            recipeId: recipe.id,
            title: recipe.title,
            success: false,
            error: errorMsg,
          });
          results.failed++;
        }
      }

      setTrainingProgress(
        `Training complete: ${results.success} stored, ${results.failed} failed`,
      );
      setTrainingResult(results);
      setIsTraining(false);
      setShowTrainingResult(true);

      // Auto-dismiss after 8 seconds if successful
      if (results.failed === 0) {
        setTimeout(() => {
          setShowTrainingResult(false);
        }, 8000);
      }

      return results;
    },
    [],
  );

  const dismissTrainingResult = () => {
    setShowTrainingResult(false);
    setTrainingResult(null);
  };

  return {
    isTraining,
    showTrainingResult,
    trainingProgress,
    trainingResult,
    trainWithRecipes,
    dismissTrainingResult,
  };
}
