/** * Recipe Quick Add Modal * * Modal for quickly linking recipes to BEO menu items. * Supports drag-drop from recipe library and manual search. */ import React, {
  useState,
  useMemo,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X } from "lucide-react";
export interface Recipe {
  id: string;
  title: string;
  image?: string;
  course?: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
}
interface RecipeQuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItemId: string;
  menuItemName: string;
  availableRecipes: Recipe[];
  onRecipeSelect: (recipe: Recipe) => void;
  isLoading?: boolean;
}
export function RecipeQuickAddModal({
  open,
  onOpenChange,
  menuItemId,
  menuItemName,
  availableRecipes,
  onRecipeSelect,
  isLoading = false,
}: RecipeQuickAddModalProps) {
  const [search, setSearch] = useState("");
  const [draggedRecipeId, setDraggedRecipeId] = useState<string | null>(null);
  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return availableRecipes;
    const lower = search.toLowerCase();
    return availableRecipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(lower) ||
        recipe.description?.toLowerCase().includes(lower) ||
        recipe.course?.toLowerCase().includes(lower),
    );
  }, [availableRecipes, search]);
  const handleRecipeSelect = (recipe: Recipe) => {
    onRecipeSelect(recipe);
    onOpenChange(false);
  };
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    recipe: Recipe,
  ) => {
    setDraggedRecipeId(recipe.id);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "recipe",
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        source: "beo.modal",
      }),
    );
    const img = new Image();
    img.src =
      recipe.image ||
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23f59e0b' rx='6'/%3E%3Ctext x='24' y='30' text-anchor='middle' font-size='18' fill='white'%3E%F0%9F%8D%BD%EF%B8%8F%3C/text%3E%3C/svg%3E";
    e.dataTransfer.setDragImage(img, 24, 24);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="max-w-2xl max-h-[80vh] bg-slate-800 border-border">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle className="text-white">
            {" "}
            Link Recipe to {menuItemName}{" "}
          </DialogTitle>{" "}
        </DialogHeader>{" "}
        <div className="space-y-4">
          {" "}
          {/* Search */}{" "}
          <div className="relative">
            {" "}
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />{" "}
            <Input
              placeholder="Search recipes by name, course, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-surface border-border text-white placeholder-slate-500"
            />{" "}
          </div>{" "}
          {/* Recipe List */}{" "}
          <ScrollArea className="h-[400px] w-full rounded-md border border-border bg-surface p-4">
            {" "}
            {filteredRecipes.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">
                {" "}
                No recipes found matching your search{" "}
              </p>
            ) : (
              <div className="space-y-2">
                {" "}
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, recipe)}
                    onDragEnd={() => setDraggedRecipeId(null)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-move transition-colors ${draggedRecipeId === recipe.id ? "bg-blue-900 border-primary opacity-60" : "bg-slate-800 border-border hover:border-slate-600 hover:bg-slate-700/50"}`}
                  >
                    {" "}
                    {/* Recipe Image */}{" "}
                    <div className="flex-shrink-0">
                      {" "}
                      <img
                        src={
                          recipe.image ||
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' fill='%23f59e0b' rx='6'/%3E%3Ctext x='28' y='35' text-anchor='middle' font-size='20' fill='white'%3E%F0%9F%8D%BD%EF%B8%8F%3C/text%3E%3C/svg%3E"
                        }
                        alt={recipe.title}
                        className="h-14 w-14 rounded object-cover"
                      />{" "}
                    </div>{" "}
                    {/* Recipe Info */}{" "}
                    <div className="flex-1 min-w-0">
                      {" "}
                      <h4 className="font-semibold text-white text-sm">
                        {" "}
                        {recipe.title}{" "}
                      </h4>{" "}
                      {recipe.course && (
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {" "}
                          {recipe.course}{" "}
                        </Badge>
                      )}{" "}
                      {recipe.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {" "}
                          {recipe.description}{" "}
                        </p>
                      )}{" "}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        {" "}
                        {recipe.prepTime && (
                          <span>⏱ {recipe.prepTime}m prep</span>
                        )}{" "}
                        {recipe.cookTime && (
                          <span>🔥 {recipe.cookTime}m cook</span>
                        )}{" "}
                        {recipe.servings && (
                          <span>👥 {recipe.servings}x</span>
                        )}{" "}
                      </div>{" "}
                    </div>{" "}
                    {/* Action Button */}{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRecipeSelect(recipe)}
                      disabled={isLoading}
                      className="flex-shrink-0 text-xs h-8 px-3"
                    >
                      {" "}
                      <Plus className="h-3 w-3 mr-1" /> Link{" "}
                    </Button>{" "}
                  </div>
                ))}{" "}
              </div>
            )}{" "}
          </ScrollArea>{" "}
          {/* Hint */}{" "}
          <p className="text-xs text-slate-400 text-center">
            {" "}
            💡 You can also drag recipes directly from the library{" "}
          </p>{" "}
        </div>{" "}
        <DialogFooter>
          {" "}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            {" "}
            Close{" "}
          </Button>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
