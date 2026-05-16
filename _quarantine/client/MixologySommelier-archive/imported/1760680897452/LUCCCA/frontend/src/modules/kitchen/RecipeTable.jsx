import React from "react";
import RecipeCard from "./RecipeCard";

const sampleRecipes = [
  { id: 1, name: "Truffle Mac & Cheese", category: "Main", tags: ["vegetarian", "signature"] },
  { id: 2, name: "Crispy Duck Confit", category: "Main", tags: ["premium"] },
  { id: 3, name: "Raspberry Soufflé", category: "Dessert", tags: ["gluten-free", "pastry"] },
];

const RecipeTable = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sampleRecipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
};

export default RecipeTable;
