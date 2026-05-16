import { useState, useMemo } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Link as LinkIcon, Unlink, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface LinkedRecipe {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  lastUpdated: string;
}

const AVAILABLE_RECIPES: LinkedRecipe[] = [
  {
    id: "rec-1",
    name: "Smoked Koji Custard",
    status: "draft",
    lastUpdated: "2h ago",
  },
  {
    id: "rec-2",
    name: "Carbonic Yuzu Pearls",
    status: "published",
    lastUpdated: "1 day ago",
  },
  {
    id: "rec-3",
    name: "Velvet Oyster Emulsion",
    status: "published",
    lastUpdated: "3 days ago",
  },
  {
    id: "rec-4",
    name: "Charred Corn Silk Velouté",
    status: "draft",
    lastUpdated: "5 days ago",
  },
  {
    id: "rec-5",
    name: "Koji Aged Beeswax Sauce",
    status: "draft",
    lastUpdated: "1 week ago",
  },
  {
    id: "rec-6",
    name: "Fermented Citrus Oil",
    status: "published",
    lastUpdated: "2 weeks ago",
  },
];

interface RecipeLinkingPanelProps {
  experimentId?: string;
}

export function RecipeLinkingPanel({
  experimentId: providedExperimentId,
}: RecipeLinkingPanelProps) {
  const { experiments, focusExperimentId, linkRecipe, unlinkRecipe } =
    useRDLabStore();
  const experimentId = providedExperimentId || focusExperimentId;
  const [searchQuery, setSearchQuery] = useState("");

  const experiment = useMemo(
    () => experiments.find((e) => e.id === experimentId),
    [experiments, experimentId],
  );

  const linkedRecipeIds = experiment?.linkedRecipeIds || [];
  const linkedRecipes = linkedRecipeIds
    .map((id) => AVAILABLE_RECIPES.find((r) => r.id === id))
    .filter(Boolean) as LinkedRecipe[];

  const filteredAvailableRecipes = AVAILABLE_RECIPES.filter(
    (recipe) =>
      !linkedRecipeIds.includes(recipe.id) &&
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleLinkRecipe = (recipeId: string) => {
    if (!experimentId) {
      toast.error("No experiment selected");
      return;
    }
    linkRecipe(experimentId, recipeId);
    setSearchQuery("");
    toast.success("Recipe linked to experiment");
  };

  const handleUnlinkRecipe = (recipeId: string) => {
    if (!experimentId) {
      toast.error("No experiment selected");
      return;
    }
    unlinkRecipe(experimentId, recipeId);
    toast.success("Recipe unlinked");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Linked Recipes
        </CardTitle>
        <CardDescription>
          Connect this experiment to actual recipes in your system
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Linked Recipes */}
        {linkedRecipes.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              {linkedRecipes.length} linked recipe(s)
            </p>
            <div className="space-y-2">
              {linkedRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 dark:border-[#c8a97e]/15 dark:bg-amber-500/5 p-3"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold">{recipe.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {recipe.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {recipe.lastUpdated}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUnlinkRecipe(recipe.id)}
                    className="h-8 w-8"
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/20 bg-white/5 dark:border-[#c8a97e]/15 dark:bg-amber-500/5 p-6 text-center space-y-3">
            <LinkIcon className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No recipes linked yet
            </p>
          </div>
        )}

        {/* Link Recipe Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Link Recipe
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Recipe to Experiment</DialogTitle>
              <DialogDescription>
                Choose a recipe from your library to link to this experiment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredAvailableRecipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {searchQuery.trim()
                      ? "No matching recipes found"
                      : "All available recipes already linked"}
                  </p>
                ) : (
                  filteredAvailableRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 dark:border-[#c8a97e]/15 dark:bg-amber-500/5 p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold">{recipe.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {recipe.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {recipe.lastUpdated}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLinkRecipe(recipe.id)}
                      >
                        Link
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recipe Notes */}
        {linkedRecipes.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-semibold">Implementation Notes</p>
            <Textarea
              placeholder="Add notes about how this experiment applies to the linked recipes..."
              defaultValue={experiment?.recipeNotes || ""}
              rows={3}
              className="text-sm"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Notes are stored with the experiment
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
