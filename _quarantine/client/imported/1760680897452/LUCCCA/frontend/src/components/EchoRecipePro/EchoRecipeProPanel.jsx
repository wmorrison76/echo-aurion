import React, { useMemo } from "react";
import DoubleTabs from "../shared/DoubleTabs.jsx";

/**
 * Connect DoubleTabs to the four Builder-generated pages.
 * Adjust the import paths below to where you dropped the zip contents.
 *
 * Recommended structure:
 *   src/components/EchoRecipePro/
 *     RecipeSearch.jsx
 *     Photos.jsx
 *     AddRecipe.jsx
 *     Production.jsx
 */
export default function EchoRecipeProPanel() {
  const tabs = useMemo(() => ([
    {
      key: "search",
      label: "Recipe Search",
      loader: () => import("./RecipeSearch.jsx"),
    },
    {
      key: "photos",
      label: "Photos", // Gallery -> Photos, per your note
      loader: () => import("./Photos.jsx"),
    },
    {
      key: "add",
      label: "Add Recipe",
      loader: () => import("./AddRecipe.jsx"),
    },
    {
      key: "production",
      label: "Production",
      loader: () => import("./Production.jsx"),
    },
  ]), []);

  return (
    <div className="h-full w-full">
      <DoubleTabs tabs={tabs} defaultKey="search" />
    </div>
  );
}
