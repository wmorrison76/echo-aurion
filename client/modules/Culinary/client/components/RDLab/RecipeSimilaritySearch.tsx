import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Search,
  Sparkles,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { type RecipeTrack } from "@/hooks/use-recipe-track";

export interface SimilarRecipeMatch {
  id: string;
  recipeId: string;
  title: string;
  track: RecipeTrack;
  score: number;
  metadata?: {
    cuisine?: string;
    course?: string;
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
    tags?: string[];
  };
}

interface RecipeSimilaritySearchProps {
  recipeText: string;
  userTrack: RecipeTrack;
  chefId: string;
  organizationId: string;
  onSelectRecipe?: (recipe: SimilarRecipeMatch) => void;
  includeCrossTrack?: boolean;
  limit?: number;
}

export function RecipeSimilaritySearch({
  recipeText,
  userTrack,
  chefId,
  organizationId,
  onSelectRecipe,
  includeCrossTrack = true,
  limit = 5,
}: RecipeSimilaritySearchProps) {
  const [matches, setMatches] = useState<SimilarRecipeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(recipeText);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a recipe description");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pinecone/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeText: searchQuery,
          userTrack,
          chefId,
          organizationId,
          limit,
          includeCrossTrack,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to search recipes");
      }

      const data = await response.json();
      setMatches(data.data?.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    userTrack,
    chefId,
    organizationId,
    limit,
    includeCrossTrack,
  ]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Describe your recipe idea..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Find Similar
            </>
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-3 border-red-500/20 bg-red-50/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {matches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#c8a97e]" />
            Similar Recipes Found ({matches.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {matches.map((match) => (
              <Card
                key={match.id}
                className="p-3 border border-accent/20 dark:border-[#c8a97e]/15 cursor-pointer hover:border-accent/40 dark:hover:border-[#c8a97e]/30 transition-colors"
                onClick={() => onSelectRecipe?.(match)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground dark:text-white">
                        {match.title}
                      </h4>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">
                        Recipe ID: {match.recipeId}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#c8a97e] dark:text-[#c8a97e]">
                        {(match.score * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">
                        Match
                      </p>
                    </div>
                  </div>

                  {/* Track Badge */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={`${
                        match.track === "fine-dining"
                          ? "bg-white/80 dark:bg-[#c8a97e]/08 text-[#b8976c] dark:text-[#c8a97e] border-[#c8a97e] dark:border-[#c8a97e]/25"
                          : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30"
                      }`}
                    >
                      {match.track === "fine-dining"
                        ? "Fine Dining"
                        : "Manufacturing"}
                    </Badge>

                    {match.metadata?.difficulty && (
                      <Badge variant="secondary" className="text-xs">
                        {match.metadata.difficulty}
                      </Badge>
                    )}
                  </div>

                  {/* Metadata */}
                  {match.metadata && (
                    <div className="text-xs text-muted-foreground dark:text-slate-400 space-y-1">
                      {match.metadata.cuisine && (
                        <p>
                          <span className="font-semibold">Cuisine:</span>{" "}
                          {match.metadata.cuisine}
                        </p>
                      )}
                      {match.metadata.prepTime && (
                        <p>
                          <span className="font-semibold">Prep:</span>{" "}
                          {match.metadata.prepTime} min
                        </p>
                      )}
                      {match.metadata.cookTime && (
                        <p>
                          <span className="font-semibold">Cook:</span>{" "}
                          {match.metadata.cookTime} min
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && matches.length === 0 && searchQuery.trim() && (
        <Card className="p-4 text-center border border-accent/20 dark:border-[#c8a97e]/15">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground dark:text-slate-400">
            No similar recipes found. Try a different description.
          </p>
        </Card>
      )}
    </div>
  );
}
