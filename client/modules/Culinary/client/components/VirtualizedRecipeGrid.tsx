import React from "react";
import { RecipeCard } from "./RecipeCard";

interface VirtualizedRecipeGridProps {
  recipes: any[];
  inTrash: boolean;
  onPreview: (recipe: any) => void;
  onFav: (id: string) => void;
  onRate: (id: string, n: number) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onTrash: (recipe: any) => void;
  onDestroy: (id: string) => void;
  selectMode: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleGlobal: (id: string, isGlobal: boolean) => void;
}

/**
 * Responsive recipe grid using CSS Grid (no virtualization)
 * Automatically responsive with Tailwind classes
 */
export function VirtualizedRecipeGrid({
  recipes,
  inTrash,
  onPreview,
  onFav,
  onRate,
  onUpdateTags,
  onTrash,
  onDestroy,
  selectMode,
  selectedIds,
  onToggleSelect,
  onToggleGlobal,
}: VirtualizedRecipeGridProps) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {recipes.map((r) => (
        <RecipeCard
          key={r.id}
          r={r}
          inTrash={inTrash}
          onPreview={() => onPreview(r)}
          onFav={() => onFav(r.id)}
          onRate={(n) => onRate(r.id, n)}
          onUpdateTags={(tags) => onUpdateTags(r.id, tags)}
          onTrash={() => onTrash(r)}
          onDestroy={() => onDestroy(r.id)}
          selectMode={selectMode}
          selected={selectedIds.includes(r.id)}
          onToggleSelect={() => onToggleSelect(r.id)}
          onToggleGlobal={(isGlobal) => onToggleGlobal(r.id, isGlobal)}
        />
      ))}
    </div>
  );
}
