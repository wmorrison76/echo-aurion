import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Recipe with outlet-level permissions
 */
interface Recipe {
  id: string;
  name: string;
  description?: string;
  category: string;
  ingredients: Ingredient[];
  instructions: string[];
  
  // Multi-outlet support
  outletId: string;
  isGlobal: boolean;
  sharedWithOutlets: string[];
  
  // Commissary support
  canTransferFrom: string[];
  transferCostMarkup: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
}

interface Outlet {
  id: string;
  name: string;
  type: 'restaurant' | 'commissary' | 'both';
  canSupplyOutlets: string[];
}

interface RecipeContextValue {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  currentOutletId: string | null;
  setCurrentOutlet: (outletId: string) => void;
  outlets: Outlet[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  makeRecipeGlobal: (recipeId: string) => Promise<void>;
  shareRecipeWithOutlet: (recipeId: string, outletId: string) => Promise<void>;
  unshareRecipeFromOutlet: (recipeId: string, outletId: string) => Promise<void>;
  setupCommissary: (outletId: string, canSupplyOutlets: string[]) => Promise<void>;
  transferRecipe: (recipeId: string, fromOutlet: string, toOutlet: string) => Promise<void>;
  canAccessRecipe: (recipeId: string, outletId: string) => boolean;
  canEditRecipe: (recipeId: string, outletId: string) => boolean;
}

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [currentOutletId, setCurrentOutletId] = useState<string | null>(null);
  
  const filteredRecipes = useMemo(() => {
    if (!currentOutletId) return [];
    return recipes.filter(recipe => 
      recipe.isGlobal || 
      recipe.outletId === currentOutletId || 
      recipe.sharedWithOutlets.includes(currentOutletId)
    );
  }, [recipes, currentOutletId]);
  
  const canAccessRecipe = useCallback((recipeId: string, outletId: string): boolean => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return false;
    return (
      recipe.isGlobal ||
      recipe.outletId === outletId ||
      recipe.sharedWithOutlets.includes(outletId)
    );
  }, [recipes]);
  
  const canEditRecipe = useCallback((recipeId: string, outletId: string): boolean => {
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.outletId === outletId : false;
  }, [recipes]);
  
  const addRecipe = useCallback(async (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecipe)
    });
    
    if (response.ok) {
      const savedRecipe = await response.json();
      setRecipes(prev => [...prev, savedRecipe]);
    }
  }, []);
  
  const updateRecipe = useCallback(async (id: string, updates: Partial<Recipe>) => {
    if (!currentOutletId || !canEditRecipe(id, currentOutletId)) {
      throw new Error('No permission to edit this recipe');
    }
    
    setRecipes(prev => prev.map(r => 
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    ));
    
    try {
      await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update recipe', error);
    }
  }, [currentOutletId, canEditRecipe]);
  
  const deleteRecipe = useCallback(async (id: string) => {
    if (!currentOutletId || !canEditRecipe(id, currentOutletId)) {
      throw new Error('No permission to delete this recipe');
    }
    
    setRecipes(prev => prev.filter(r => r.id !== id));
    
    try {
      await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete recipe', error);
    }
  }, [currentOutletId, canEditRecipe]);
  
  const makeRecipeGlobal = useCallback(async (recipeId: string) => {
    await updateRecipe(recipeId, { 
      isGlobal: true,
      sharedWithOutlets: []
    });
  }, [updateRecipe]);
  
  const shareRecipeWithOutlet = useCallback(async (recipeId: string, outletId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const updatedSharedWith = [...new Set([...recipe.sharedWithOutlets, outletId])];
    await updateRecipe(recipeId, { sharedWithOutlets: updatedSharedWith });
  }, [recipes, updateRecipe]);
  
  const unshareRecipeFromOutlet = useCallback(async (recipeId: string, outletId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const updatedSharedWith = recipe.sharedWithOutlets.filter(id => id !== outletId);
    await updateRecipe(recipeId, { sharedWithOutlets: updatedSharedWith });
  }, [recipes, updateRecipe]);
  
  const setupCommissary = useCallback(async (outletId: string, canSupplyOutlets: string[]) => {
    const response = await fetch(`/api/outlets/${outletId}/commissary`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canSupplyOutlets })
    });
    
    if (response.ok) {
      setOutlets(prev => prev.map(o => 
        o.id === outletId 
          ? { ...o, type: 'commissary', canSupplyOutlets }
          : o
      ));
    }
  }, []);
  
  const transferRecipe = useCallback(async (
    recipeId: string,
    fromOutlet: string,
    toOutlet: string
  ) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const fromOutletData = outlets.find(o => o.id === fromOutlet);
    if (!fromOutletData?.canSupplyOutlets.includes(toOutlet)) {
      throw new Error('This outlet cannot supply to the target outlet');
    }
    
    const transferCost = recipe.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const finalCost = transferCost * (1 + recipe.transferCostMarkup / 100);
    
    await fetch('/api/recipes/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeId,
        fromOutlet,
        toOutlet,
        originalCost: transferCost,
        transferCost: finalCost,
        markup: recipe.transferCostMarkup
      })
    });
  }, [recipes, outlets]);
  
  return (
    <RecipeContext.Provider value={{
      recipes,
      filteredRecipes,
      currentOutletId,
      setCurrentOutlet: setCurrentOutletId,
      outlets,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      makeRecipeGlobal,
      shareRecipeWithOutlet,
      unshareRecipeFromOutlet,
      setupCommissary,
      transferRecipe,
      canAccessRecipe,
      canEditRecipe
    }}>
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipe() {
  const context = useContext(RecipeContext);
  if (!context) throw new Error('useRecipe must be used within RecipeProvider');
  return context;
}

