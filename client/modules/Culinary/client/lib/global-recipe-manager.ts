import type { RecipeType } from "@/lib/validation-schemas";

/**
 * Global Recipe Management System
 * Handles sharing recipes across outlets with approval workflows
 */

export interface GlobalRecipeMetadata {
  isGlobal: boolean;
  createdBy: string; // User name who created the global recipe
  globalSourceId?: string; // Reference to original global recipe (for copies)
  lastModifiedBy?: string; // Last person to modify
  lastModifiedAt?: number; // Last modification timestamp
  requiresChefApproval: boolean; // Needs approval if sharing back to global
  pendingApprovalFrom?: string | null; // Outlet/chef waiting to approve
}

/**
 * Create a recipe as global (marks it for all outlets)
 */
export function makeRecipeGlobal(
  recipe: RecipeType,
  createdBy: string
): RecipeType {
  return {
    ...recipe,
    isGlobal: true,
    createdBy,
    lastModifiedBy: createdBy,
    lastModifiedAt: Date.now(),
    requiresChefApproval: false,
  };
}

/**
 * Create a local copy from a global recipe
 * Allows the outlet to edit independently
 */
export function copyGlobalRecipeLocally(
  globalRecipe: RecipeType,
  userId: string
): Omit<RecipeType, "id" | "createdAt"> {
  return {
    ...globalRecipe,
    isGlobal: false,
    globalSourceId: globalRecipe.id,
    createdBy: userId,
    lastModifiedBy: userId,
    lastModifiedAt: Date.now(),
    requiresChefApproval: false,
  };
}

/**
 * Mark a local recipe as pending chef approval for sharing back to global
 */
export function requestGlobalApproval(
  recipe: RecipeType,
  chefName: string
): RecipeType {
  return {
    ...recipe,
    requiresChefApproval: true,
    pendingApprovalFrom: chefName,
    lastModifiedAt: Date.now(),
  };
}

/**
 * Approve a recipe for sharing to global
 */
export function approveForGlobal(
  recipe: RecipeType,
  approverName: string
): RecipeType {
  return {
    ...recipe,
    isGlobal: true,
    requiresChefApproval: false,
    pendingApprovalFrom: null,
    lastModifiedBy: approverName,
    lastModifiedAt: Date.now(),
  };
}

/**
 * Filter recipes to get only global ones
 */
export function filterGlobalRecipes(recipes: RecipeType[]): RecipeType[] {
  return recipes.filter((recipe) => recipe.isGlobal === true);
}

/**
 * Filter recipes to get only local ones (not global)
 */
export function filterLocalRecipes(recipes: RecipeType[]): RecipeType[] {
  return recipes.filter((recipe) => recipe.isGlobal !== true);
}

/**
 * Find recipes pending approval
 */
export function findPendingApprovals(recipes: RecipeType[]): RecipeType[] {
  return recipes.filter((recipe) => recipe.requiresChefApproval === true);
}

/**
 * Check if a recipe is a copy of a global recipe
 */
export function isLocalCopyOfGlobal(recipe: RecipeType): boolean {
  return !recipe.isGlobal && !!recipe.globalSourceId;
}

/**
 * Format recipe creator info for display
 */
export function formatRecipeCreator(
  createdBy?: string,
  createdAt?: number
): string {
  if (!createdBy) return "Unknown";
  const date = createdAt ? new Date(createdAt).toLocaleDateString() : "";
  return date ? `${createdBy} • ${date}` : createdBy;
}

/**
 * Format last modified info for display
 */
export function formatLastModified(
  lastModifiedBy?: string,
  lastModifiedAt?: number
): string {
  if (!lastModifiedBy || !lastModifiedAt) return "Never";
  const date = new Date(lastModifiedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  let timeStr: string;
  if (diffMins < 1) {
    timeStr = "just now";
  } else if (diffMins < 60) {
    timeStr = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    timeStr = `${diffHours}h ago`;
  } else if (diffDays < 7) {
    timeStr = `${diffDays}d ago`;
  } else {
    timeStr = date.toLocaleDateString();
  }

  return `${lastModifiedBy} • ${timeStr}`;
}

/**
 * Get the recipe's origin (whether it's global, local copy, or local original)
 */
export function getRecipeOrigin(recipe: RecipeType): "global" | "local-copy" | "local-original" {
  if (recipe.isGlobal) return "global";
  if (recipe.globalSourceId) return "local-copy";
  return "local-original";
}
