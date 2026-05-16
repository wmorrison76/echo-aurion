/**
 * Recipe Migration Dialog
 * Prompts users to migrate their local recipes to cloud storage
 * Enables synchronization across all devices
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Cloud, Download, Loader2, CheckCircle2 } from "lucide-react";
import type { Recipe } from "@shared/recipes";
import {
  recipeMigrationTool,
  type MigrationStatus,
} from "@/lib/recipe-migration-tool";

interface RecipeMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  onMigrationComplete?: () => void;
}

export function RecipeMigrationDialog({
  open,
  onOpenChange,
  recipes,
  onMigrationComplete,
}: RecipeMigrationDialogProps) {
  const { user } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [completed, setCompleted] = useState(false);

  const { needsMigration, count } = recipeMigrationTool.getMigrationStatus(recipes);
  const summary = recipeMigrationTool.getMigrationSummary(recipes);

  const handleStartMigration = useCallback(async () => {
    if (!user?.id || !needsMigration) return;

    setMigrating(true);
    setCompleted(false);

    try {
      const result = await recipeMigrationTool.migrateRecipesToCloud(
        user.id,
        recipes,
        (newStatus) => {
          setStatus(newStatus);
        },
      );

      setStatus(result);
      if (result.failedRecipes === 0 && result.migratedRecipes > 0) {
        setCompleted(true);
      }
    } catch (error) {
      console.error("[RecipeMigration] Migration error:", error);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              errors: [
                ...prev.errors,
                {
                  recipeId: "migration",
                  title: "Migration Error",
                  error: error instanceof Error ? error.message : "Unknown error",
                },
              ],
            }
          : null,
      );
    } finally {
      setMigrating(false);
    }
  }, [user?.id, recipes, needsMigration]);

  const handleBackupAndMigrate = useCallback(async () => {
    recipeMigrationTool.downloadMigrationBackup(recipes);
    await new Promise((resolve) => setTimeout(resolve, 500));
    handleStartMigration();
  }, [recipes, handleStartMigration]);

  const handleClose = useCallback(() => {
    if (!migrating) {
      onOpenChange(false);
    }
  }, [migrating, onOpenChange]);

  useEffect(() => {
    if (completed && onMigrationComplete) {
      const timer = setTimeout(() => {
        onMigrationComplete();
        onOpenChange(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [completed, onMigrationComplete, onOpenChange]);

  if (!needsMigration && !status) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            Sync Recipes to Cloud
          </DialogTitle>
          <DialogDescription>
            Keep your recipes in sync across all your devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Message */}
          {!status && (
            <>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>{summary.recipesNeedingMigration} recipe(s)</strong> are stored locally.
                  Migrate them to cloud storage to access from any device.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Benefits:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✓ Access recipes from home and work</li>
                  <li>✓ Automatic synchronization across devices</li>
                  <li>✓ Cloud backup of your recipes</li>
                  <li>✓ Improved collaboration</li>
                </ul>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  We'll create a backup before migrating, so your recipes are safe.
                </p>
              </div>
            </>
          )}

          {/* Migration Progress */}
          {status && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {status.migratedRecipes} / {status.totalRecipes - status.skippedRecipes}{" "}
                  recipes synced
                </span>
                <span className="text-muted-foreground">{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="h-2" />

              {completed && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 border border-green-200 dark:border-green-800 flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900 dark:text-green-100">
                    <p className="font-medium">Migration complete!</p>
                    <p className="text-xs mt-1">
                      Your recipes are now synchronized with the cloud.
                    </p>
                  </div>
                </div>
              )}

              {status.errors.length > 0 && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                    {status.failedRecipes} recipe(s) failed to sync:
                  </p>
                  <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                    {status.errors.slice(0, 3).map((error) => (
                      <li key={error.recipeId}>
                        • {error.title}: {error.error}
                      </li>
                    ))}
                    {status.errors.length > 3 && (
                      <li>• ... and {status.errors.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={migrating}>
            {status ? "Close" : "Cancel"}
          </Button>

          {!status ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackupAndMigrate}
                disabled={!user?.id || !needsMigration || migrating}
              >
                <Download className="mr-2 h-4 w-4" />
                Backup & Migrate
              </Button>
              <Button
                onClick={handleStartMigration}
                disabled={!user?.id || !needsMigration || migrating}
              >
                {migrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Cloud className="mr-2 h-4 w-4" />
                    Migrate Now
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button disabled={true}>
              {completed && <CheckCircle2 className="mr-2 h-4 w-4" />}
              {migrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {completed ? "Done!" : "Syncing..."}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
