import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Recipe, RecipeIngredient } from '../types/beo';
import { useInventoryStore } from './inventoryStore';

export interface RecipeState {
  recipes: Record<string, Recipe>;
  addRecipe: (r: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  removeRecipe: (id: string) => void;
  getRecipe: (id: string) => Recipe | undefined;
  computeIngredientDemand: (recipeId: string, servings: number) => { name: string; unit: string; qty: number; inventoryItemId?: string }[];
}

const SAMPLE: Record<string, Recipe> = {
  'demi-glace': {
    id: 'demi-glace',
    name: 'Demi-Glace',
    yield: 16, // quarts per batch (example)
    prepTimeMinutes: 90,
    cookTimeMinutes: 18 * 60, // 18 hours
    complexity: 5,
    prepDaysAdvance: 1,
    storageRequirements: ['refrigerated', 'frozen'],
    dependsOn: [],
    ingredients: [
      { id: 'veal-bones', name: 'Veal Bones', amount: 60, unit: 'lb', critical: true },
      { id: 'mirepoix', name: 'Mirepoix', amount: 15, unit: 'lb' },
      { id: 'tomato-paste', name: 'Tomato Paste', amount: 2, unit: 'lb' },
      { id: 'red-wine', name: 'Red Wine', amount: 2, unit: 'bottle' },
      { id: 'water', name: 'Water', amount: 25, unit: 'gal' },
    ],
    steps: [
      { id: 'roast-bones', order: 1, instruction: 'Roast veal bones until deep brown', timeMinutes: 90, equipment: ['oven'], canParallelize: false },
      { id: 'simmer', order: 2, instruction: 'Simmer with mirepoix and water 18-24h', timeMinutes: 18*60, equipment: ['stock_pot'], canParallelize: false },
      { id: 'reduce', order: 3, instruction: 'Reduce to nappé consistency', timeMinutes: 120, equipment: ['range'] },
    ],
    equipment: ['oven', 'stock_pot', 'range'],
    skillRequired: 4,
    truthStatements: [],
  },
};

export const useRecipeStore = create<RecipeState>()(
  devtools((set, get) => ({
    recipes: SAMPLE,
    addRecipe: (r) => set((s) => ({ recipes: { ...s.recipes, [r.id]: r } }), false, 'addRecipe'),
    updateRecipe: (id, updates) => set((s) => ({ recipes: { ...s.recipes, [id]: { ...s.recipes[id], ...updates } } }), false, 'updateRecipe'),
    removeRecipe: (id) => set((s) => { const cp = { ...s.recipes }; delete cp[id]; return { recipes: cp }; }, false, 'removeRecipe'),
    getRecipe: (id) => get().recipes[id],
    computeIngredientDemand: (recipeId, servings) => {
      const r = get().recipes[recipeId];
      if (!r || !r.ingredients || !r.yield || r.yield <= 0) return [];
      const multiplier = Math.max(1, Math.ceil(servings / r.yield));
      const inv = useInventoryStore.getState();
      const mapFn = (ing: RecipeIngredient) => {
        const qty = (ing.amount || 0) * multiplier;
        const match = inv.items.find(i => i.name.toLowerCase().includes(ing.name.toLowerCase()));
        return { name: ing.name, unit: ing.unit, qty, inventoryItemId: match?.id };
      };
      return r.ingredients.map(mapFn);
    },
  }), { name: 'recipe-store' })
);

export default useRecipeStore;
