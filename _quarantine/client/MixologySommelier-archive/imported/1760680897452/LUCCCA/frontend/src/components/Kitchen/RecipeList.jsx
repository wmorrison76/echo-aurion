import React from "react";
import RecipeFilters from "@/components/Recipe/RecipeFilters";
import RecipeTable from "@/components/Recipe/RecipeTable";

const RecipeList = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-glacier-200 mb-4">Recipe Library</h1>
      <RecipeFilters />
      <RecipeTable />
    </div>
  );
};

export default RecipeList;
