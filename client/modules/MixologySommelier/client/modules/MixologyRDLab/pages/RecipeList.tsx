/** * Recipe List Page * Displays all cocktail recipes with filtering and search */ import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Grid, List } from "lucide-react";
import { useRecipeStore } from "../stores/recipeStore";
import type { CocktailRecipe } from "../types/recipe";
export function RecipeList() {
  const navigate = useNavigate();
  const { recipes, loading, loadRecipes } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    const matchesStatus =
      statusFilter === "all" || recipe.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  return (
    <div className="h-full flex flex-col p-6">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between mb-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-foreground">
            Recipe Library
          </h1>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {" "}
            Manage and develop cocktail recipes{" "}
          </p>{" "}
        </div>{" "}
        <button
          onClick={() => navigate("/workspace")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {" "}
          <Plus size={18} /> New Recipe{" "}
        </button>{" "}
      </div>{" "}
      {/* Filters */}{" "}
      <div className="flex items-center gap-4 mb-6">
        {" "}
        <div className="flex-1 relative">
          {" "}
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />{" "}
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />{" "}
        </div>{" "}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {" "}
          <option value="all">All Status</option>{" "}
          <option value="draft">Draft</option>{" "}
          <option value="testing">Testing</option>{" "}
          <option value="active">Active</option>{" "}
          <option value="archived">Archived</option>{" "}
        </select>{" "}
        <div className="flex gap-2 border border-border rounded-lg p-1">
          {" "}
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {" "}
            <Grid size={18} />{" "}
          </button>{" "}
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {" "}
            <List size={18} />{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Recipe List */}{" "}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          {" "}
          <div className="text-center">
            {" "}
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>{" "}
            <p className="text-muted-foreground">Loading recipes...</p>{" "}
          </div>{" "}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          {" "}
          <div className="text-center">
            {" "}
            <p className="text-lg font-semibold text-foreground mb-2">
              No recipes found
            </p>{" "}
            <p className="text-sm text-muted-foreground mb-4">
              {" "}
              {searchQuery
                ? "Try a different search term"
                : "Create your first recipe to get started"}{" "}
            </p>{" "}
            {!searchQuery && (
              <button
                onClick={() => navigate("/workspace")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                {" "}
                Create Recipe{" "}
              </button>
            )}{" "}
          </div>{" "}
        </div>
      ) : (
        <div
          className={`flex-1 overflow-y-auto ${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}`}
        >
          {" "}
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} viewMode={viewMode} />
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
}
function RecipeCard({
  recipe,
  viewMode,
}: {
  recipe: CocktailRecipe;
  viewMode: "grid" | "list";
}) {
  const navigate = useNavigate();
  if (viewMode === "list") {
    return (
      <div
        onClick={() => navigate(`/workspace/${recipe.id}`)}
        className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary cursor-pointer transition-colors"
      >
        {" "}
        <div className="flex-1">
          {" "}
          <div className="flex items-center gap-2 mb-1">
            {" "}
            <h3 className="font-semibold text-foreground">
              {recipe.name}
            </h3>{" "}
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {" "}
              v{recipe.version}{" "}
            </span>{" "}
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${recipe.status === "active" ? "bg-green-500/20 text-green-500" : recipe.status === "testing" ? "bg-yellow-500/20 text-yellow-500" : recipe.status === "draft" ? "bg-surface/20 text-muted-foreground" : "bg-red-500/20 text-red-500"}`}
            >
              {" "}
              {recipe.status}{" "}
            </span>{" "}
          </div>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            {recipe.ingredients.length} ingredients • $
            {recipe.costing.totalCost.toFixed(2)} cost{" "}
          </p>{" "}
        </div>{" "}
        <div className="text-right">
          {" "}
          <p className="text-sm font-semibold text-foreground">
            {" "}
            ${recipe.costing.sellingPrice.toFixed(2)}{" "}
          </p>{" "}
          <p className="text-xs text-muted-foreground">
            {" "}
            {recipe.costing.marginPercent.toFixed(1)}% margin{" "}
          </p>{" "}
        </div>{" "}
      </div>
    );
  }
  return (
    <div
      onClick={() => navigate(`/workspace/${recipe.id}`)}
      className="p-4 bg-card border border-border rounded-lg hover:border-primary cursor-pointer transition-colors"
    >
      {" "}
      <div className="flex items-start justify-between mb-3">
        {" "}
        <div>
          {" "}
          <h3 className="font-semibold text-foreground mb-1">
            {recipe.name}
          </h3>{" "}
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {" "}
            v{recipe.version}{" "}
          </span>{" "}
        </div>{" "}
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${recipe.status === "active" ? "bg-green-500/20 text-green-500" : recipe.status === "testing" ? "bg-yellow-500/20 text-yellow-500" : recipe.status === "draft" ? "bg-surface/20 text-muted-foreground" : "bg-red-500/20 text-red-500"}`}
        >
          {" "}
          {recipe.status}{" "}
        </span>{" "}
      </div>{" "}
      <div className="space-y-2 text-sm">
        {" "}
        <div className="flex justify-between">
          {" "}
          <span className="text-muted-foreground">Ingredients:</span>{" "}
          <span className="text-foreground">
            {recipe.ingredients.length}
          </span>{" "}
        </div>{" "}
        <div className="flex justify-between">
          {" "}
          <span className="text-muted-foreground">Cost:</span>{" "}
          <span className="text-foreground">
            ${recipe.costing.totalCost.toFixed(2)}
          </span>{" "}
        </div>{" "}
        <div className="flex justify-between">
          {" "}
          <span className="text-muted-foreground">Price:</span>{" "}
          <span className="font-semibold text-foreground">
            {" "}
            ${recipe.costing.sellingPrice.toFixed(2)}{" "}
          </span>{" "}
        </div>{" "}
        <div className="flex justify-between">
          {" "}
          <span className="text-muted-foreground">Margin:</span>{" "}
          <span className="text-foreground">
            {recipe.costing.marginPercent.toFixed(1)}%
          </span>{" "}
        </div>{" "}
      </div>{" "}
      {recipe.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {" "}
          {recipe.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-muted/50 rounded text-muted-foreground"
            >
              {" "}
              {tag}{" "}
            </span>
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
}
