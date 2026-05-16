/** * Recipe Versions Page * View and manage version history of a recipe */ import React, {
  useEffect,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, GitBranch, Copy } from "lucide-react";
import { useRecipeStore } from "../stores/recipeStore";
export function RecipeVersions() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { currentRecipe, loading, loadRecipe, createVersion } =
    useRecipeStore();
  useEffect(() => {
    if (recipeId) {
      loadRecipe(recipeId);
    }
  }, [recipeId, loadRecipe]);
  const handleCreateVersion = async () => {
    if (!currentRecipe) return;
    try {
      const newVersion = await createVersion(recipeId!, {
        version: incrementVersion(currentRecipe.version),
        status: "draft",
      });
      navigate(`/workspace/${newVersion.id}`);
    } catch (error) {
      console.error("Failed to create version:", error);
    }
  };
  const incrementVersion = (version: string): string => {
    const parts = version.split(".");
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    const patch = parseInt(parts[2]) || 0;
    return `${major}.${minor}.${patch + 1}`;
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        {" "}
        <div className="text-center">
          {" "}
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>{" "}
          <p className="text-muted-foreground">Loading versions...</p>{" "}
        </div>{" "}
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col p-6">
      {" "}
      <div className="flex items-center gap-4 mb-6">
        {" "}
        <button
          onClick={() => navigate(`/workspace/${recipeId}`)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {" "}
          <ArrowLeft size={20} />{" "}
        </button>{" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-foreground">
            Version History
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            {currentRecipe?.name || "Recipe"} - All versions{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 overflow-y-auto space-y-4">
        {" "}
        {currentRecipe?.changes && currentRecipe.changes.length > 0 ? (
          currentRecipe.changes.map((change, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
            >
              {" "}
              <div className="flex items-start justify-between mb-2">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <GitBranch size={18} className="text-primary" />{" "}
                  <span className="font-semibold text-foreground">
                    v{change.version}
                  </span>{" "}
                </div>{" "}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  {new Date(change.timestamp).toLocaleDateString()}{" "}
                </span>{" "}
              </div>{" "}
              <div className="space-y-1 mb-3">
                {" "}
                {change.changes.map((c, i) => (
                  <div
                    key={i}
                    className="text-sm text-foreground flex items-start gap-2"
                  >
                    {" "}
                    <span className="text-primary">•</span>{" "}
                    <span>{c}</span>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                {" "}
                Changed by {change.changedBy}{" "}
              </div>{" "}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            {" "}
            <p className="text-muted-foreground mb-4">
              No version history yet
            </p>{" "}
            <button
              onClick={handleCreateVersion}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 mx-auto"
            >
              {" "}
              <Copy size={18} /> Create New Version{" "}
            </button>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
