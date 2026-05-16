import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
// Toast POS integration - currently unused
// import {
//   syncRecipesToToast,
//   type ToastConfig,
// } from "@/lib/toast-pos-integration";

interface ToastMenuSyncProps {
  toastConfig: any; // TODO: Define proper type when Toast POS integration is implemented
  onSyncComplete?: (result: {
    itemsSynced: number;
    itemsFailed: number;
  }) => void;
}

export const ToastMenuSync: React.FC<ToastMenuSyncProps> = ({
  toastConfig,
  onSyncComplete,
}) => {
  const { recipes } = useAppData();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    itemsSynced: number;
    itemsFailed: number;
    errors?: Array<{ itemId: string; error: string }>;
  } | null>(null);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(
    new Set(),
  );

  const toggleRecipe = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipes(newSelected);
  };

  const toggleAllRecipes = () => {
    if (selectedRecipes.size === recipes.length) {
      setSelectedRecipes(new Set());
    } else {
      setSelectedRecipes(new Set(recipes.map((r) => r.id)));
    }
  };

  const handleSync = async () => {
    if (selectedRecipes.size === 0) {
      alert("Please select at least one recipe to sync");
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      // TODO: Re-enable when Toast POS integration is implemented
      const recipesToSync = recipes
        .filter((r) => selectedRecipes.has(r.id))
        .map((r) => ({
          id: r.id,
          title: r.title || "Untitled",
          description: r.description,
          course: r.course,
          cost: 15.0, // Placeholder - would come from costing engine
          price: 35.0, // Placeholder - would come from pricing
        }));

      // const result = await syncRecipesToToast(toastConfig, recipesToSync);
      // setSyncResult(result);
      // onSyncComplete?.({
      //   itemsSynced: result.itemsSynced,
      //   itemsFailed: result.itemsFailed,
      // });

      // if (result.success) {
      //   // Clear selection on successful sync
      //   setSelectedRecipes(new Set());
      // }
      setSyncResult({
        itemsSynced: 0,
        itemsFailed: 0,
      });
    } catch (error) {
      setSyncResult({
        itemsSynced: 0,
        itemsFailed: selectedRecipes.size,
        errors: [{ itemId: "all", error: String(error) }],
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync Recipes to Toast POS
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Select recipes to push to your Toast POS menu. This will create or
            update menu items with current pricing and details.
          </AlertDescription>
        </Alert>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Total Recipes</p>
            <p className="text-2xl font-bold">{recipes.length}</p>
          </div>
          <div className="p-3 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Selected</p>
            <p className="text-2xl font-bold">{selectedRecipes.size}</p>
          </div>
          <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/20">
            <p className="text-xs text-muted-foreground">Ready to Sync</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {selectedRecipes.size > 0 ? "Yes" : "No"}
            </p>
          </div>
        </div>

        {/* Recipe Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Select Recipes</p>
            <Button size="sm" variant="outline" onClick={toggleAllRecipes}>
              {selectedRecipes.size === recipes.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recipes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recipes available. Create recipes to sync to Toast POS.
              </p>
            ) : (
              recipes.map((recipe) => (
                <label
                  key={recipe.id}
                  className="flex items-start gap-3 p-3 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipes.has(recipe.id)}
                    onChange={() => toggleRecipe(recipe.id)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {recipe.title || "Untitled"}
                    </p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {recipe.course && (
                        <Badge variant="outline" className="text-xs">
                          {recipe.course}
                        </Badge>
                      )}
                      {recipe.cuisine && (
                        <Badge variant="outline" className="text-xs">
                          {recipe.cuisine}
                        </Badge>
                      )}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div
            className={`p-4 rounded border ${
              syncResult.itemsFailed === 0
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-start gap-3">
              {syncResult.itemsFailed === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm mb-2">
                  {syncResult.itemsFailed === 0
                    ? "Sync Successful"
                    : "Sync Completed with Errors"}
                </p>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✓ {syncResult.itemsSynced}
                    </span>{" "}
                    recipes synced
                  </p>
                  {syncResult.itemsFailed > 0 && (
                    <p>
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        ✗ {syncResult.itemsFailed}
                      </span>{" "}
                      recipes failed
                    </p>
                  )}
                </div>
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold">Errors:</p>
                    <ul className="text-xs space-y-1">
                      {syncResult.errors.slice(0, 3).map((err) => (
                        <li
                          key={err.itemId}
                          className="text-red-700 dark:text-red-300"
                        >
                          • {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSync}
            disabled={syncing || selectedRecipes.size === 0}
            className="flex-1 gap-2"
          >
            {syncing && <Loader2 className="h-4 w-4 animate-spin" />}
            {syncing ? "Syncing..." : "Sync to Toast POS"}
          </Button>
          {selectedRecipes.size > 0 && (
            <Button
              variant="outline"
              onClick={() => setSelectedRecipes(new Set())}
            >
              Clear Selection
            </Button>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            ℹ️ Pricing Note
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Current sync uses estimated pricing. For real pricing, connect your
            costing engine or manually update prices in Toast POS.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ToastMenuSync;
