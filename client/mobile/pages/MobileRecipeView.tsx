/**
 * Mobile Recipe View
 * Placeholder: view recipes; shares domain contracts from shared/types/recipe.
 */

import React from "react";
import { BookOpen } from "lucide-react";

export default function MobileRecipeView() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Recipe View
      </h2>
      <p className="text-sm text-muted-foreground">
        Browse recipes; same contracts as desktop. (Stub — wire to recipe API.)
      </p>
    </div>
  );
}
