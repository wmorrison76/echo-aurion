/**
 * Shared utilities for both Culinary and Pastry modules
 * Prevents circular dependencies
 */

export interface Recipe {
  id: string;
  name: string;
  category: 'culinary' | 'pastry';
  ingredients: string[];
  steps: string[];
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost: number;
}

export function calculateRecipeCost(ingredients: Ingredient[]): number {
  return ingredients.reduce((sum, ing) => sum + ing.cost, 0);
}

export function formatRecipeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
