/**
 * Mixology R&D Lab
 * Recipe development workspace with real-time costing and version control
 */

import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecipeWorkspace } from "./pages/RecipeWorkspace";
import { RecipeVersions } from "./pages/RecipeVersions";
import { CostingCalculator } from "./pages/CostingCalculator";
import { PerformanceAnalytics } from "./pages/PerformanceAnalytics";
import { IngredientLibrary } from "./pages/IngredientLibrary";
import { RecipeList } from "./pages/RecipeList";
import { useRecipeStore } from "./stores/recipeStore";
// OSBus re-export - allows proper module resolution
import { osBus } from "./lib/os-bus";
import "./styles/rd-lab.css";

const queryClient = new QueryClient();

export function MixologyRDLabApp() {
  const navigate = useNavigate();
  const { loadRecipes } = useRecipeStore();

  useEffect(() => {
    // Load recipes on mount
    loadRecipes();

    // Listen for inventory updates via OS Bus
    // When inventory items are updated, recalculate recipe costs
    const handleInventoryUpdate = (payload: {
      locationId: string;
      item: {
        itemKey?: string;
        id?: string;
        cost?: number;
      };
      ledger: any;
    }) => {
      // Extract item ID from payload
      const itemId = payload.item.itemKey || payload.item.id;
      if (itemId) {
        // Recalculate all recipes using this ingredient
        useRecipeStore.getState().recalculateCostsForIngredient(itemId);
      }
    };

    const unsubscribe = osBus.on("inventory:updated", handleInventoryUpdate);

    return () => {
      unsubscribe();
    };
  }, [loadRecipes]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="luccca-theme mixology-rd-lab">
        <Routes>
          <Route path="/" element={<RecipeList />} />
          <Route path="/workspace/:recipeId?" element={<RecipeWorkspace />} />
          <Route path="/versions/:recipeId" element={<RecipeVersions />} />
          <Route path="/costing/:recipeId" element={<CostingCalculator />} />
          <Route
            path="/analytics/:recipeId"
            element={<PerformanceAnalytics />}
          />
          <Route path="/ingredients" element={<IngredientLibrary />} />
        </Routes>
      </div>
    </QueryClientProvider>
  );
}

export default MixologyRDLabApp;
